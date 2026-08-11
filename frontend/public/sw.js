/**
 * sw.js
 * Service Worker for Radiology Platform
 * Handles Background Sync for Offline DICOM uploads.
 */

const SYNC_TAG = 'upload-dicom-study';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

/**
 * Background Sync Handler
 * Triggered by the browser when connection is stable.
 */
self.addEventListener('sync', (event) => {
    if (event.tag === SYNC_TAG) {
        event.waitUntil(syncPendingStudies());
    }
});

async function syncPendingStudies() {
    console.log('[SW] Starting background sync for pending studies...');

    // We notify open tabs that they should trigger a sync process.
    // This allows us to use the full application logic (services, auth stored in closure/localstorage).
    const clients = await self.clients.matchAll();

    if (clients.length > 0) {
        clients.forEach(client => {
            client.postMessage({ type: 'BACKGROUND_SYNC_TRIGGER', tag: SYNC_TAG });
        });
    } else {
        // [Advanced/Production] If no tabs are open, we'd need to re-implement 
        // the encryption + fetch logic here using raw IDB.
        // For this phase, we rely on the next time the app opens or 'online' event in SW.
        console.warn('[SW] No active clients for sync. Waiting for app to open.');
    }
}
