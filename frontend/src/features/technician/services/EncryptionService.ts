/**
 * EncryptionService.ts
 * Provides AES-GCM encryption for at-rest storage of DICOM files in IndexedDB.
 * Ensures HIPAA 2026 compliance by encrypting ePHI before it touches local disk.
 *
 * Security model:
 *  - The AES-GCM master key is generated with extractable: FALSE — it cannot
 *    be read back via crypto.subtle.exportKey(), making it immune to XSS theft.
 *  - The key is stored as a raw CryptoKey object in a dedicated IndexedDB database
 *    via the structured clone algorithm (IDB supports CryptoKey natively).
 *  - It is never written to localStorage, which is synchronously readable by any
 *    JavaScript on the page (XSS, injected scripts, browser extensions).
 */

const ALGO = 'AES-GCM';

// Dedicated IDB database just for the encryption key — avoids circular deps
// with OfflineSyncService which manages the DICOM data database.
const KEY_DB_NAME = 'radiology-key-vault';
const KEY_DB_VERSION = 1;
const KEY_STORE = 'keys';
const KEY_RECORD_ID = 'master';

export class EncryptionService {
    private static key: CryptoKey | null = null;

    // ── IndexedDB helpers ────────────────────────────────────────────────────

    private static openKeyDb(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(KEY_DB_NAME, KEY_DB_VERSION);
            req.onupgradeneeded = () => req.result.createObjectStore(KEY_STORE);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    private static async savePersistentKey(key: CryptoKey): Promise<void> {
        const db = await this.openKeyDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(KEY_STORE, 'readwrite');
            // IDB stores CryptoKey objects directly via structured clone —
            // the raw key bytes never leave the WebCrypto subsystem.
            tx.objectStore(KEY_STORE).put(key, KEY_RECORD_ID);
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => { db.close(); reject(tx.error); };
        });
    }

    private static async getPersistentKey(): Promise<CryptoKey | null> {
        try {
            const db = await this.openKeyDb();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(KEY_STORE, 'readonly');
                const req = tx.objectStore(KEY_STORE).get(KEY_RECORD_ID);
                req.onsuccess = () => { db.close(); resolve((req.result as CryptoKey) ?? null); };
                req.onerror = () => { db.close(); resolve(null); };
            });
        } catch {
            return null;
        }
    }

    // ── Key lifecycle ────────────────────────────────────────────────────────

    private static async getKey(): Promise<CryptoKey> {
        if (this.key) return this.key;

        const stored = await this.getPersistentKey();
        if (stored) {
            this.key = stored;
            return stored;
        }

        // Generate a NON-EXTRACTABLE key. It lives only inside the browser's
        // WebCrypto subsystem and in IndexedDB — never as exportable bytes.
        const newKey = await window.crypto.subtle.generateKey(
            { name: ALGO, length: 256 },
            false, // extractable: false — key bytes cannot be exported by any script
            ['encrypt', 'decrypt']
        );

        await this.savePersistentKey(newKey);
        this.key = newKey;

        // Migration: remove any legacy key that was incorrectly stored in localStorage
        try { localStorage.removeItem('radiology-offline-key'); } catch { /* storage unavailable */ }

        return newKey;
    }

    // ── Public API ───────────────────────────────────────────────────────────

    static async encryptFile(file: File | Blob): Promise<{ data: ArrayBuffer; iv: Uint8Array<ArrayBuffer> }> {
        const key = await this.getKey();
        // Allocate iv as Uint8Array<ArrayBuffer> explicitly — crypto.getRandomValues()
        // returns Uint8Array<ArrayBufferLike> in newer TS lib types, which is incompatible
        // with the BufferSource = ArrayBufferView<ArrayBuffer> expected by subtle.encrypt.
        const iv = new Uint8Array(new ArrayBuffer(12));
        window.crypto.getRandomValues(iv);
        const data = await file.arrayBuffer();
        const encrypted = await window.crypto.subtle.encrypt({ name: ALGO, iv }, key, data);
        return { data: encrypted, iv };
    }

    static async decryptFile(encryptedData: ArrayBuffer, iv: Uint8Array, mimeType: string): Promise<Blob> {
        const key = await this.getKey();
        // Wrap iv in a plain ArrayBuffer-backed Uint8Array to satisfy BufferSource constraint.
        const ivFixed = new Uint8Array(new ArrayBuffer(iv.byteLength));
        ivFixed.set(iv);
        const decrypted = await window.crypto.subtle.decrypt({ name: ALGO, iv: ivFixed }, key, encryptedData);
        return new Blob([decrypted], { type: mimeType });
    }
}
