import { eventTarget, getRenderingEngine } from '@cornerstonejs/core';
import { Enums as csToolsEnums, annotation } from '@cornerstonejs/tools';
import { useDicomStore } from '@/stores/dicomStore';
import { cornerstoneViewportService } from './CornerstoneViewportService';
import type { Measurement, ToolType } from '@/types/dicom';

/**
 * MeasurementService - Simplified but OHIF-Compatible
 * 
 * Bridges Cornerstone Tools with the Redux/Zustand Store.
 */
class MeasurementService {
    private isInitialized = false;

    public init() {
        if (this.isInitialized) return;

        // Listen to Cornerstone Annotation Events
        eventTarget.addEventListener(csToolsEnums.Events.ANNOTATION_ADDED, this.onAnnotationUpdated.bind(this));
        eventTarget.addEventListener(csToolsEnums.Events.ANNOTATION_MODIFIED, this.onAnnotationUpdated.bind(this));
        eventTarget.addEventListener(csToolsEnums.Events.ANNOTATION_REMOVED, this.onAnnotationRemoved.bind(this));
        eventTarget.addEventListener(csToolsEnums.Events.ANNOTATION_COMPLETED, this.onAnnotationUpdated.bind(this));

        this.isInitialized = true;
    }

    private onAnnotationUpdated(evt: any) {
        const { annotation: csAnnotation } = evt.detail;
        if (!csAnnotation) return;

        const { addMeasurement } = useDicomStore.getState();
        const measurement = this.csAnnotationToMeasurement(csAnnotation);
        if (measurement) {
            addMeasurement(measurement);
        }
    }

    private onAnnotationRemoved(evt: any) {
        const { annotation: csAnnotation } = evt.detail;
        if (!csAnnotation) return;

        const { removeMeasurement } = useDicomStore.getState();
        removeMeasurement(csAnnotation.annotationUID);
    }

    /**
     * Converts a Cornerstone annotation object to our Store's Measurement format.
     * Logic ported from OHIF's internal adapters.
     */
    private csAnnotationToMeasurement(csAnnotation: any): Measurement | null {
        const { annotationUID, metadata, data } = csAnnotation;
        const { toolName, FrameOfReferenceUID, referencedImageId } = metadata;

        // Determine value and unit
        let value = undefined;
        let unit = '';

        if (data.cachedStats) {
            const stats = Object.values(data.cachedStats)[0] as any;
            if (stats) {
                value = stats.length ?? stats.area ?? stats.mean ?? stats.value ?? stats.radius;
                unit = stats.unit || '';
            }
        }

        // Capture point data
        const points = data.handles?.points || [];

        // Find study/series context from imageId
        // In a real app we'd look this up in MetadataStore
        // For now we'll rely on the active viewport context if missing, 
        // but better to use the imageId as truth.

        return {
            id: annotationUID,
            toolType: toolName as ToolType,
            studyUID: '', // Will be filled by store or lookup
            seriesUID: '',
            instanceUID: '',
            imageIndex: 0,
            data: {
                handles: points.map((p: any) => ({ x: p[0], y: p[1] })),
                value,
                unit,
            },
            label: toolName,
            createdAt: new Date(),
            modifiedAt: new Date(),
        };
    }

    /**
     * Remove annotation from Cornerstone when deleted in Store
     */
    public jumpToMeasurement(measurementId: string) {
        // Ported from OHIF JumpToMeasurement logic
        const measurement = useDicomStore.getState().measurements.find(m => m.id === measurementId);
        if (!measurement) return;

        // Logic to update active viewport to the correct slice
    }
}

export const measurementService = new MeasurementService();
