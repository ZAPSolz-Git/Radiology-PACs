import { synchronizers, SynchronizerManager, Synchronizer } from '@cornerstonejs/tools';
import { getRenderingEngines, utilities } from '@cornerstonejs/core';

/**
 * SyncGroupService - Ported from OHIF
 * 
 * Manages synchronizers that tie multiple viewports together.
 */

export const SYNC_TYPES = {
    POSITION: 'cameraposition',
    VOI: 'voi',
    ZOOMPAN: 'zoompan',
    STACKIMAGE: 'stackimage',
    IMAGE_SLICE: 'imageslice',
};

export interface SyncGroup {
    type: string;
    id?: string;
    source?: boolean;
    target?: boolean;
    options?: Record<string, unknown>;
}

export type SyncCreator = (id: string, options?: Record<string, unknown>) => Synchronizer;

const asSyncGroup = (syncGroup: string | SyncGroup): SyncGroup =>
    typeof syncGroup === 'string' ? { type: syncGroup } : syncGroup;

export class SyncGroupService {
    private synchronizerCreators: Record<string, SyncCreator> = {
        [SYNC_TYPES.POSITION]: synchronizers.createCameraPositionSynchronizer,
        [SYNC_TYPES.VOI]: synchronizers.createVOISynchronizer,
        [SYNC_TYPES.ZOOMPAN]: synchronizers.createZoomPanSynchronizer,
        [SYNC_TYPES.STACKIMAGE]: synchronizers.createImageSliceSynchronizer,
        [SYNC_TYPES.IMAGE_SLICE]: synchronizers.createImageSliceSynchronizer,
    };

    private synchronizersByType: { [key: string]: Synchronizer[] } = {};

    private _createSynchronizer(type: string, id: string, options: any): Synchronizer | undefined {
        this.synchronizersByType[type] = this.synchronizersByType[type] || [];
        const syncCreator = this.synchronizerCreators[type.toLowerCase()];

        if (syncCreator) {
            const synchronizer = syncCreator(id, options);
            if (synchronizer) {
                this.synchronizersByType[type].push(synchronizer);
                return synchronizer;
            }
        }
        return undefined;
    }

    private _getOrCreateSynchronizer(type: string, id: string, options: Record<string, unknown>): Synchronizer | undefined {
        let synchronizer = SynchronizerManager.getSynchronizer(id);
        if (!synchronizer) {
            synchronizer = this._createSynchronizer(type, id, options);
        }
        return synchronizer;
    }

    public addViewportToSyncGroup(
        viewportId: string,
        renderingEngineId: string,
        syncGroups?: SyncGroup | string | (SyncGroup | string)[]
    ): void {
        if (!syncGroups) return;

        const syncGroupsArray = Array.isArray(syncGroups) ? syncGroups : [syncGroups];

        syncGroupsArray.forEach(syncGroup => {
            const syncGroupObj = asSyncGroup(syncGroup);
            const { type, target = true, source = true, options = {}, id = type } = syncGroupObj;

            const synchronizer = this._getOrCreateSynchronizer(type, id, options);
            if (!synchronizer) return;

            synchronizer.setOptions(viewportId, options);

            const viewportInfo = { viewportId, renderingEngineId };
            if (target && source) {
                synchronizer.add(viewportInfo);
            } else if (source) {
                synchronizer.addSource(viewportInfo);
            } else if (target) {
                synchronizer.addTarget(viewportInfo);
            }
        });
    }

    public removeViewportFromAllGroups(viewportId: string, renderingEngineId: string) {
        const synchronizers = SynchronizerManager.getAllSynchronizers();
        synchronizers.forEach(synchronizer => {
            synchronizer.remove({ viewportId, renderingEngineId });

            // Cleanup empty synchronizers
            if (!synchronizer.getSourceViewports().length && !synchronizer.getTargetViewports().length) {
                SynchronizerManager.destroySynchronizer(synchronizer.id);
            }
        });
    }

    public destroy() {
        SynchronizerManager.destroy();
        this.synchronizersByType = {};
    }
}

export const syncGroupService = new SyncGroupService();
