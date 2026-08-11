import {
    RenderingEngine,
    getRenderingEngine,
    Enums,
    type Types,
    getEnabledElement,
    StackViewport,
    VolumeViewport,
    eventTarget,
} from '@cornerstonejs/core';
import { IStackViewport } from '@cornerstonejs/core/types';
import { toolGroupService } from './ToolGroupService';
import { syncGroupService } from './SyncGroupService';
// CornerstoneService is disabled (viewer not in use). Declare the constant locally
// so this file compiles cleanly. All viewer components that use this service are
// also commented out, so this code path is never reached at runtime.
const RENDERING_ENGINE_ID = 'cornerstone-rendering-engine';

/**
 * CornerstoneViewportService - Ported from OHIF
 * 
 * The central authority for all Cornerstone viewports.
 * Manages lifecycle, rendering, and persistent state (Presentations).
 */

export interface ViewportData {
    studyInstanceUID: string;
    displaySetInstanceUID: string;
    imageIds: string[];
    viewportType: Enums.ViewportType;
}

export interface Presentation {
    voi?: { windowWidth: number; windowCenter: number };
    zoom?: number;
    pan?: { x: number; y: number };
    rotation?: number;
    flipHorizontal?: boolean;
    flipVertical?: boolean;
}

class CornerstoneViewportService {
    private renderingEngineId = RENDERING_ENGINE_ID;
    private viewportData = new Map<string, ViewportData>();
    private presentations = new Map<string, Presentation>();

    // Track which elements are enabled for which viewportId
    private viewportElements = new Map<string, HTMLDivElement>();

    public getRenderingEngine() {
        let engine = getRenderingEngine(this.renderingEngineId);
        if (!engine) {
            engine = new RenderingEngine(this.renderingEngineId);
        }
        return engine;
    }

    public enableViewport(viewportId: string, element: HTMLDivElement, type: Enums.ViewportType = Enums.ViewportType.STACK) {
        this.viewportElements.set(viewportId, element);
        const renderingEngine = this.getRenderingEngine();

        renderingEngine.enableElement({
            viewportId,
            element,
            type,
            defaultOptions: {
                background: [0, 0, 0] as [number, number, number],
            },
        });

        // Add to default tool group if not already managed
        toolGroupService.addViewportToToolGroup(viewportId, this.renderingEngineId);

        // Apply any stored presentation (W/L, Zoom, etc.)
        this.applyPresentation(viewportId);
    }

    public disableViewport(viewportId: string) {
        const renderingEngine = getRenderingEngine(this.renderingEngineId);
        if (renderingEngine) {
            // Store current presentation before disabling
            this.storePresentation(viewportId);
            renderingEngine.disableElement(viewportId);
        }
        this.viewportElements.delete(viewportId);
        this.viewportData.delete(viewportId);

        // Cleanup sync groups
        syncGroupService.removeViewportFromAllGroups(viewportId, this.renderingEngineId);
    }

    /**
     * Universal method to load data into a viewport
     */
    public async setViewportData(viewportId: string, data: ViewportData) {
        this.viewportData.set(viewportId, data);
        const renderingEngine = this.getRenderingEngine();
        const viewport = renderingEngine.getViewport(viewportId);

        if (!viewport) return;

        if (data.viewportType === Enums.ViewportType.STACK) {
            const stackViewport = viewport as IStackViewport;
            await stackViewport.setStack(data.imageIds);
        } else {
            // Volume logic would go here
        }

        this.applyPresentation(viewportId);
        viewport.render();
    }

    /**
     * Persistence: Store the current visual state of the viewport
     */
    public storePresentation(viewportId: string) {
        const enabledElement = getEnabledElement(this.viewportElements.get(viewportId));
        if (!enabledElement) return;

        const viewport = enabledElement.viewport;
        const camera = viewport.getCamera();

        const presentation: Presentation = {
            zoom: camera.parallelScale ? (500 / camera.parallelScale) : 1,
            rotation: camera.rotation,
        };

        if (viewport instanceof StackViewport) {
            const voi = viewport.getProperties().voiRange;
            if (voi) {
                presentation.voi = {
                    windowWidth: Math.round(voi.upper - voi.lower),
                    windowCenter: Math.round((voi.upper + voi.lower) / 2),
                };
            }
        }

        this.presentations.set(viewportId, presentation);
    }

    /**
     * Persistence: Re-apply the stored visual state
     */
    public applyPresentation(viewportId: string) {
        const presentation = this.presentations.get(viewportId);
        if (!presentation) return;

        const renderingEngine = this.getRenderingEngine();
        const viewport = renderingEngine.getViewport(viewportId);
        if (!viewport) return;

        if (presentation.voi && viewport instanceof StackViewport) {
            viewport.setProperties({
                voiRange: {
                    lower: presentation.voi.windowCenter - presentation.voi.windowWidth / 2,
                    upper: presentation.voi.windowCenter + presentation.voi.windowWidth / 2,
                }
            });
        }

        if (presentation.zoom) {
            viewport.setCamera({ parallelScale: 500 / presentation.zoom });
        }

        if (presentation.rotation !== undefined) {
            viewport.setCamera({ rotation: presentation.rotation });
        }

        viewport.render();
    }

    public resize() {
        this.getRenderingEngine().resize(true, true);
    }

    public getViewport(viewportId: string) {
        return this.getRenderingEngine().getViewport(viewportId);
    }
}

export const cornerstoneViewportService = new CornerstoneViewportService();
