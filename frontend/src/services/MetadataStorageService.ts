import { get, set, del, keys } from 'idb-keyval';

const METADATA_PREFIX = 'dicom-metadata-';
const EXPIRY_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export const MetadataStorage = {
    async saveStudyMetadata(studyInstanceUID: string, metadata: any) {
        const item = {
            data: metadata,
            timestamp: Date.now()
        };
        await set(`${METADATA_PREFIX}${studyInstanceUID}`, item);
    },

    async getStudyMetadata(studyInstanceUID: string) {
        const item = await get(`${METADATA_PREFIX}${studyInstanceUID}`);
        if (!item) return null;

        // Check expiry
        if (Date.now() - item.timestamp > EXPIRY_MS) {
            await del(`${METADATA_PREFIX}${studyInstanceUID}`);
            return null;
        }

        return item.data;
    },

    async clearOldMetadata() {
        const allKeys = await keys();
        for (const key of allKeys) {
            if (typeof key === 'string' && key.startsWith(METADATA_PREFIX)) {
                const item = await get(key);
                if (item && Date.now() - item.timestamp > EXPIRY_MS) {
                    await del(key);
                }
            }
        }
    }
};
