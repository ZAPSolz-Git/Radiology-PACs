import { utilities } from '@cornerstonejs/core';

export const ProgressiveLoaderService = {
    initialize() {
        // Stack image progressive loading config
        const stackRetrieveConfiguration = {
            stages: [
                {
                    id: 'thumbnail',
                    retrieveType: 'single',
                },
                {
                    id: 'fullResolution',
                    retrieveType: 'single',
                },
            ],
            retrieveOptions: {
                single: {
                    streaming: true,
                },
            },
        };

        // Volume (MPR) progressive loading config
        // Uses two stages: fast lossy preview → full quality
        const volumeRetrieveConfiguration = {
            stages: [
                {
                    id: 'lossyPreview',
                    retrieveType: 'multipleFast',
                    priority: -5, // Higher priority (loads first)
                },
                {
                    id: 'fullQuality',
                    retrieveType: 'multipleFull',
                    priority: 0,
                },
            ],
            retrieveOptions: {
                multipleFast: {
                    streaming: true,
                    decodeLevel: 0, // Lowest quality for speed
                },
                multipleFull: {
                    streaming: true,
                },
            },
        };

        // Register both configurations
        utilities.imageRetrieveMetadataProvider.add('stack', stackRetrieveConfiguration as any);
        utilities.imageRetrieveMetadataProvider.add('volume', volumeRetrieveConfiguration as any);

        console.log('[ProgressiveLoader] Initialized progressive loading for stack + volume');
    }
};
