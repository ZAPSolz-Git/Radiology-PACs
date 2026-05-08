import { set, get } from 'idb-keyval';
import { EncryptionService } from './EncryptionService';

const QUEUE_KEY = 'radiology-upload-queue';
const SYNC_TAG = 'upload-dicom-study';

export interface QueuedStudy {
    id: string;
    metadata: any;
    encryptedFiles: Array<{
        name: string;
        data: ArrayBuffer;
        iv: Uint8Array;
        mimeType: string;
    }>;
    priority: 'urgent' | 'routine';
    timestamp: number;
    retryCount: number;
}

export class OfflineSyncService {
    /**
     * Request persistent storage from the browser
     */
    static async requestPersistence(): Promise<boolean> {
        if (navigator.storage && navigator.storage.persist) {
            return await navigator.storage.persist();
        }
        return false;
    }

    /**
     * Get storage quota statistics
     */
    static async getStorageEstimate() {
        if (navigator.storage && navigator.storage.estimate) {
            return await navigator.storage.estimate();
        }
        return null;
    }

    /**
     * Encrypt and add a study to the local persistent queue
     */
    static async queueStudy(caseData: any, files: File[]): Promise<void> {
        // Request persistence before storing large studies
        await this.requestPersistence();

        // 1. Encrypt all files
        const encryptedFiles = await Promise.all(
            files.map(async (file) => {
                const { data, iv } = await EncryptionService.encryptFile(file);
                return {
                    name: file.name,
                    data,
                    iv,
                    mimeType: file.type
                };
            })
        );

        // 2. Build queue item
        const queueItem: QueuedStudy = {
            id: caseData.studyInstanceUID || `LOCAL_${Date.now()}`,
            metadata: caseData,
            encryptedFiles,
            priority: caseData.urgency === 'STAT' ? 'urgent' : 'routine',
            timestamp: Date.now(),
            retryCount: 0
        };

        // 3. Update IDB Queue
        const currentQueue: QueuedStudy[] = (await get(QUEUE_KEY)) || [];
        currentQueue.push(queueItem);
        await set(QUEUE_KEY, currentQueue);

        // 4. Trigger Background Sync
        await this.triggerSync();
    }

    /**
     * Trigger the Service Worker Background Sync event
     */
    static async triggerSync() {
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready as any;
            if (registration.sync) {
                try {
                    await registration.sync.register(SYNC_TAG);
                    console.log('[OfflineSync] Sync registered:', SYNC_TAG);
                } catch (err) {
                    console.warn('[OfflineSync] Background Sync failed, falling back to online listener', err);
                    // Fallback handled in main app or via periodic check
                }
            }
        }
    }

    static async getQueue(): Promise<QueuedStudy[]> {
        return (await get(QUEUE_KEY)) || [];
    }

    static async removeFromQueue(id: string): Promise<void> {
        const currentQueue: QueuedStudy[] = (await get(QUEUE_KEY)) || [];
        const updated = currentQueue.filter(item => item.id !== id);
        await set(QUEUE_KEY, updated);
    }
}
