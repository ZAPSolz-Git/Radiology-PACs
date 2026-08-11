import { useEffect } from 'react';
import { OfflineSyncService, QueuedStudy } from '../services/OfflineSyncService';
import { EncryptionService } from '../services/EncryptionService';
import { CaseService } from '../services/CaseService';
import { toast } from 'sonner';

let isSyncing = false;

export const useOfflineSync = () => {
    useEffect(() => {
        const handleMessage = async (event: MessageEvent) => {
            if (event.data?.type === 'BACKGROUND_SYNC_TRIGGER') {
                console.log('[SyncManager] Received sync trigger from SW');
                await processQueue();
            }
        };

        const processQueue = async () => {
            if (!navigator.onLine || isSyncing) return;

            isSyncing = true;
            try {
                const queue = await OfflineSyncService.getQueue();
                if (queue.length === 0) return;

                console.log(`[SyncManager] Processing ${queue.length} studies...`);

                // Sort by priority (urgent first)
                const sorted = [...queue].sort((a, b) => {
                    if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
                    if (a.priority !== 'urgent' && b.priority === 'urgent') return 1;
                    return a.timestamp - b.timestamp;
                });

                for (const item of sorted) {
                    try {
                        // 0. Check if study already exists on server
                        const studyUID = item.metadata?.studyInstanceUID || item.id;
                        const existingStudy = await CaseService.getStudyByUID(studyUID);

                        if (existingStudy) {
                            console.log(`[SyncManager] Study ${studyUID} already exists (ID: ${existingStudy._id}). Autodeleting before re-upload.`);
                            await CaseService.deleteCase(existingStudy._id);
                            toast.info(`Updating existing study: ${item.metadata?.patientName}`);
                        }

                        // 1. Decrypt files
                        const files = await Promise.all(
                            item.encryptedFiles.map(async (f) => {
                                const decryptedBlob = await EncryptionService.decryptFile(f.data, f.iv, f.mimeType);
                                return new File([decryptedBlob], f.name, { type: f.mimeType });
                            })
                        );

                        // 2. Upload
                        await CaseService.uploadStudy(files, item.metadata);

                        // 3. Remove from queue
                        await OfflineSyncService.removeFromQueue(item.id);
                        toast.success(`Study synced: ${item.metadata.patientName}`);
                    } catch (err) {
                        console.error(`[SyncManager] Failed to sync study ${item.id}:`, err);
                    }
                }
            } finally {
                isSyncing = false;
            }
        };

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', handleMessage);
        }

        // Wrap in an arrow so the returned promise is always caught —
        // prevents unhandled promise rejection if processQueue throws before its own try block.
        const runQueue = () => { processQueue().catch(() => {}); };

        // Check on mount if online
        if (navigator.onLine) {
            runQueue();
        }

        // And on 'online' event
        window.addEventListener('online', runQueue);

        return () => {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.removeEventListener('message', handleMessage);
            }
            window.removeEventListener('online', runQueue);
        };
    }, []);
};
