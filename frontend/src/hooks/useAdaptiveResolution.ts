/**
 * useAdaptiveResolution — RadiAnt-style dynamic resolution scaling
 * 
 * During user interaction (pan/zoom/scroll), renders at lower resolution
 * for smooth performance. Restores full resolution after interaction stops.
 * 
 * This mimics RadiAnt's "Progressive Rendering" feature where image quality
 * is reduced during manipulation and progressively improves when static.
 */
import { useEffect, useRef, useCallback } from 'react';
import type { RenderingEngine } from '@cornerstonejs/core';
import type { IVolumeViewport } from '@cornerstonejs/core/types';

interface AdaptiveResolutionOptions {
    /** Resolution scale during interaction (0.25 = quarter, 0.5 = half). Default: 0.5 */
    interactionScale?: number;
    /** Delay (ms) after interaction ends before restoring full resolution. Default: 300 */
    restoreDelay?: number;
    /** Whether the hook is active. Default: true */
    enabled?: boolean;
}

export function useAdaptiveResolution(
    renderingEngineRef: React.RefObject<RenderingEngine | null>,
    viewportIds: string[],
    elementRefs: React.RefObject<HTMLDivElement | null>[],
    options: AdaptiveResolutionOptions = {}
) {
    const {
        interactionScale = 0.5,
        restoreDelay = 300,
        enabled = true,
    } = options;

    const restoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLowResRef = useRef(false);
    const fullDprRef = useRef(window.devicePixelRatio || 1);

    const setResolution = useCallback((scale: number) => {
        const engine = renderingEngineRef.current;
        if (!engine) return;

        viewportIds.forEach((vpId) => {
            try {
                const viewport = engine.getViewport(vpId) as IVolumeViewport;
                if (viewport && typeof (viewport as any).setDevicePixelRatio === 'function') {
                    (viewport as any).setDevicePixelRatio(scale);
                }
            } catch (e) {
                // Viewport may not exist yet during setup
            }
        });

        // Trigger re-render at new resolution
        try {
            engine.render();
        } catch (e) {
            // Engine may be in transition
        }
    }, [renderingEngineRef, viewportIds]);

    const onInteractionStart = useCallback(() => {
        if (!enabled) return;

        // Cancel any pending restore
        if (restoreTimerRef.current) {
            clearTimeout(restoreTimerRef.current);
            restoreTimerRef.current = null;
        }

        // Drop resolution if not already low
        if (!isLowResRef.current) {
            isLowResRef.current = true;
            setResolution(fullDprRef.current * interactionScale);
        }
    }, [enabled, interactionScale, setResolution]);

    const onInteractionEnd = useCallback(() => {
        if (!enabled) return;

        // Debounce: restore full resolution after delay
        if (restoreTimerRef.current) {
            clearTimeout(restoreTimerRef.current);
        }
        restoreTimerRef.current = setTimeout(() => {
            if (isLowResRef.current) {
                isLowResRef.current = false;
                setResolution(fullDprRef.current);
            }
        }, restoreDelay);
    }, [enabled, restoreDelay, setResolution]);

    useEffect(() => {
        if (!enabled) return;

        const elements = elementRefs
            .map((ref) => ref.current)
            .filter(Boolean) as HTMLDivElement[];

        if (elements.length === 0) return;

        // Mouse events for pan/zoom/window-level
        const handleMouseDown = () => onInteractionStart();
        const handleMouseUp = () => onInteractionEnd();

        // Wheel events for scrolling
        const handleWheel = () => {
            onInteractionStart();
            onInteractionEnd(); // Schedule restore since wheel has no "end" event
        };

        // Touch events for mobile/tablet
        const handleTouchStart = () => onInteractionStart();
        const handleTouchEnd = () => onInteractionEnd();

        elements.forEach((el) => {
            el.addEventListener('mousedown', handleMouseDown);
            el.addEventListener('mouseup', handleMouseUp);
            el.addEventListener('mouseleave', handleMouseUp);
            el.addEventListener('wheel', handleWheel, { passive: true });
            el.addEventListener('touchstart', handleTouchStart, { passive: true });
            el.addEventListener('touchend', handleTouchEnd, { passive: true });
        });

        return () => {
            // Cleanup
            elements.forEach((el) => {
                el.removeEventListener('mousedown', handleMouseDown);
                el.removeEventListener('mouseup', handleMouseUp);
                el.removeEventListener('mouseleave', handleMouseUp);
                el.removeEventListener('wheel', handleWheel);
                el.removeEventListener('touchstart', handleTouchStart);
                el.removeEventListener('touchend', handleTouchEnd);
            });

            // Clear pending timer
            if (restoreTimerRef.current) {
                clearTimeout(restoreTimerRef.current);
            }

            // Ensure full resolution is restored on unmount
            if (isLowResRef.current) {
                isLowResRef.current = false;
                setResolution(fullDprRef.current);
            }
        };
    }, [enabled, elementRefs, onInteractionStart, onInteractionEnd, setResolution]);
}
