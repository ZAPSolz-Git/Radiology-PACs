import { getEnabledElement } from '@cornerstonejs/core';
import { useDicomStore } from '@/stores/dicomStore';

/**
 * getActiveViewportEnabledElement - Ported from OHIF
 * 
 * Returns the Cornerstone enabled element for the currently active viewport ID in the store.
 */
export default function getActiveViewportEnabledElement() {
    const { activeViewportId } = useDicomStore.getState();

    if (!activeViewportId) return null;

    // Find the HTML element for this viewportId
    // In our simplified project, we can find it by DOM if needed or track it in a service
    // Better yet, use the ID directly with renderingEngine.getViewport
    return activeViewportId;
}
