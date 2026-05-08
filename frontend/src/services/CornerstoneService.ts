import {
    init as cs3DInit,
    volumeLoader,
    imageLoader,
    metaData,
    Enums as csEnums,
    type Types,
    getRenderingEngine,
    RenderingEngine,
    cache,
    imageLoadPoolManager,
    utilities as csUtilities,
    getConfiguration,
    setConfiguration,
} from '@cornerstonejs/core';
import {
    cornerstoneStreamingImageVolumeLoader,
    cornerstoneStreamingDynamicImageVolumeLoader,
} from '@cornerstonejs/core/loaders';
import dicomImageLoader from '@cornerstonejs/dicom-image-loader';
import * as csTools from '@cornerstonejs/tools';
import { colormaps } from '@/utils/colormaps';
import { memoryMonitor } from '@/utils/MemoryMonitor';
import { cacheManager } from './CacheManager';
import { ProgressiveLoaderService } from './ProgressiveLoaderService';
import { requestPoolService } from './RequestPoolService';
import { measurementService } from './MeasurementService';
import './MetadataService';

const { registerColormap } = csUtilities.colormap;

export const RENDERING_ENGINE_ID = 'my_rendering_engine';
export const TOOL_GROUP_ID = 'default_tool_group';

class CornerstoneService {
    public static isInitialized = false;

    static async init() {
        if (this.isInitialized) return;
        console.log('CornerstoneService: Initializing...');

        // 1. Init Core — minimal init, then configure rendering separately (OHIF pattern)
        await cs3DInit();

        // 2. Set rendering config via setConfiguration (NOT cs3DInit which ignores these in v2)
        // This is how OHIF applies rendering settings — AFTER init.
        const currentConfig = getConfiguration();
        setConfiguration({
            ...currentConfig,
            rendering: {
                ...currentConfig.rendering,
                preferSizeOverAccuracy: true,  // Use float16 textures — halves GPU VRAM usage
            },
        });

        // Log GPU capabilities for debugging
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Unknown';
                const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'Unknown';
                const norm16 = !!gl.getExtension('EXT_texture_norm16');
                const max3D = (gl as WebGL2RenderingContext).getParameter?.((gl as WebGL2RenderingContext).MAX_3D_TEXTURE_SIZE) || 'N/A';
                console.log(`[CornerstoneService] GPU: ${renderer} (${vendor})`);
                console.log(`[CornerstoneService] WebGL2: ${!!canvas.getContext('webgl2')}, Norm16: ${norm16}, Max3DTexture: ${max3D}`);
            }
        } catch (e) {
            console.warn('[CornerstoneService] Could not detect GPU info:', e);
        }

        // 2. Init Image Loader with adaptive web workers
        const hardwareConcurrency = navigator.hardwareConcurrency || 4;
        const workerCount = Math.min(Math.max(hardwareConcurrency - 1, 2), 8);

        const loader = dicomImageLoader as any;
        
        if (loader.configure) {
            loader.configure({
                beforeSend: function(xhr: XMLHttpRequest) {
                    // xhr.withCredentials = true;
                },
                wadors: { withCredentials: true },
                wadouri: { withCredentials: true }
            });
        }

        dicomImageLoader.init({
            maxWebWorkers: workerCount,
            decodeConfig: {
                useWebWorkers: true,
            },
        });

        console.log(`[CornerstoneService] Initialized with ${workerCount} web workers and Auth headers`);

        // 3. Set adaptive cache size based on device memory
        const recommendedCacheSize = memoryMonitor.getRecommendedCacheSize();
        cache.setMaxCacheSize(recommendedCacheSize);
        console.log(`[CornerstoneService] Cache size set to ${Math.round(recommendedCacheSize / 1024 / 1024)}MB`);

        // Start memory monitoring
        memoryMonitor.startMonitoring(5000); // Check every 5 seconds
        cacheManager.startMonitoring(); // Start proactive cache management

        // Subscribe to memory pressure warnings
        memoryMonitor.subscribe((stats) => {
            if (stats.pressure === 'critical') {
                console.error(`[CornerstoneService] CRITICAL memory: ${stats.percentage}% - Consider closing viewports`);
                // Auto-cleanup if critical
                if (stats.percentage >= 95) {
                    console.warn('[CornerstoneService] Emergency cache purge!');
                    cache.purgeCache();
                }
            } else if (stats.pressure === 'high' && memoryMonitor.shouldTriggerCleanup()) {
                console.warn(`[CornerstoneService] High memory: ${stats.percentage}% - Recommend cleanup`);
            }
        });

        // 3. Register Image Loaders
        // Register wadouri to handle blob URLs (used by our file uploader)
        imageLoader.registerImageLoader('wadouri', dicomImageLoader.wadouri.loadImage as any);
        imageLoader.registerImageLoader('dicomweb', dicomImageLoader.wadors.loadImage as any);

        // 4. Configure Load Pool (Delegated to RequestPoolService)
        // RequestPoolService is imported above and sets maxNumRequests on init.

        // 4. Register Volume Loaders
        volumeLoader.registerVolumeLoader(
            'cornerstoneStreamingImageVolume',
            cornerstoneStreamingImageVolumeLoader
        );
        volumeLoader.registerVolumeLoader(
            'cornerstoneStreamingDynamicImageVolume',
            cornerstoneStreamingDynamicImageVolumeLoader
        );

        // 5. Init Tools
        csTools.init();

        // Add Tools
        const tools = [
            csTools.WindowLevelTool,
            csTools.PanTool,
            csTools.ZoomTool,
            csTools.StackScrollTool,
            // StackScrollMouseWheelTool might be integrated or separate, let's check
            csTools.TrackballRotateTool,
            csTools.ProbeTool,
            csTools.LengthTool,
            csTools.AngleTool,
            csTools.RectangleROITool,
            csTools.EllipticalROITool,
            csTools.BidirectionalTool,
            csTools.ArrowAnnotateTool,
            csTools.MagnifyTool,
            csTools.PlanarRotateTool,
            csTools.CrosshairsTool,
            csTools.ReferenceLinesTool,
        ];

        tools.forEach((tool) => csTools.addTool(tool));

        // 6. Create Tool Group
        this.createToolGroup();

        // 7. Register Colormaps
        colormaps.forEach(registerColormap);

        // 8. Init Progressive Loading
        ProgressiveLoaderService.initialize();

        // 9. Init Measurement Service
        measurementService.init();

        this.isInitialized = true;
        console.log('CornerstoneService: Initialized successfully');
    }

    static createToolGroup() {
        const toolGroup = csTools.ToolGroupManager.createToolGroup(TOOL_GROUP_ID);
        if (!toolGroup) return;

        // Add tools to group
        toolGroup.addTool(csTools.WindowLevelTool.toolName);
        toolGroup.addTool(csTools.PanTool.toolName);
        toolGroup.addTool(csTools.ZoomTool.toolName);
        toolGroup.addTool(csTools.StackScrollTool.toolName);
        toolGroup.addTool(csTools.ProbeTool.toolName);
        toolGroup.addTool(csTools.LengthTool.toolName);
        toolGroup.addTool(csTools.AngleTool.toolName);
        toolGroup.addTool(csTools.RectangleROITool.toolName);
        toolGroup.addTool(csTools.EllipticalROITool.toolName);
        toolGroup.addTool(csTools.BidirectionalTool.toolName);
        toolGroup.addTool(csTools.ArrowAnnotateTool.toolName);
        toolGroup.addTool(csTools.TrackballRotateTool.toolName);
        toolGroup.addTool(csTools.MagnifyTool.toolName);
        toolGroup.addTool(csTools.PlanarRotateTool.toolName);
        toolGroup.addTool(csTools.CrosshairsTool.toolName);
        toolGroup.addTool(csTools.ReferenceLinesTool.toolName);

        // Set Active Tools (Left Click)
        toolGroup.setToolActive(csTools.WindowLevelTool.toolName, {
            bindings: [{ mouseButton: csTools.Enums.MouseBindings.Primary }],
        });

        // Set Pan (Middle Click)
        toolGroup.setToolActive(csTools.PanTool.toolName, {
            bindings: [{ mouseButton: csTools.Enums.MouseBindings.Auxiliary }],
        });

        // Set Zoom (Right Click)
        toolGroup.setToolActive(csTools.ZoomTool.toolName, {
            bindings: [{ mouseButton: csTools.Enums.MouseBindings.Secondary }],
        });

        toolGroup.setToolActive(csTools.StackScrollTool.toolName, {
            bindings: [{ mouseButton: csTools.Enums.MouseBindings.Wheel }],
        });

        // Enable Reference Lines (Passive/Enabled so they render)
        toolGroup.setToolEnabled(csTools.ReferenceLinesTool.toolName);
    }

    static getToolGroup() {
        return csTools.ToolGroupManager.getToolGroup(TOOL_GROUP_ID);
    }

    static getRenderingEngine(id = RENDERING_ENGINE_ID) {
        let engine = getRenderingEngine(id);
        if (!engine) {
            engine = new RenderingEngine(id);
        }
        return engine;
    }

    /**
     * Toggles a tool's mode in the given ToolGroup.
     * @param toolGroupId Default tool group ID
     * @param toolName The name of the tool to toggle
     * @param mode 'Active' | 'Passive' | 'Enabled' | 'Disabled'
     * @param options Tool options (bindings, etc.)
     */
    static setToolMode(toolGroupId: string, toolName: string, mode: 'Active' | 'Passive' | 'Enabled' | 'Disabled', options?: any) {
        const toolGroup = csTools.ToolGroupManager.getToolGroup(toolGroupId);
        if (!toolGroup) return;

        if (mode === 'Active') {
            toolGroup.setToolActive(toolName, options);
        } else if (mode === 'Passive') {
            toolGroup.setToolPassive(toolName);
        } else if (mode === 'Enabled') {
            toolGroup.setToolEnabled(toolName);
        } else if (mode === 'Disabled') {
            toolGroup.setToolDisabled(toolName);
        }
    }

    /**
     * Captures the viewport canvas as a data URL (PNG/JPG) and triggers a download.
     * @param viewportId The viewport to capture
     * @param filename Optional filename
     */
    static captureViewport(viewportId: string, filename?: string) {
        const renderingEngine = getRenderingEngine(RENDERING_ENGINE_ID);
        if (!renderingEngine) return;

        const viewport = renderingEngine.getViewport(viewportId);
        if (!viewport) return;

        // Use Cornerstone Utilities to capture
        // SaveAs handles the download automatically
        (csUtilities as any).saveAs(
            viewport.element,
            filename || `viewport-capture-${new Date().toISOString()}.png`
        );
    }

    /**
     * Gets the pixel value (HU for CT, etc.) at the specified canvas position.
     * @param viewport The Cornerstone3D viewport
     * @param canvasPos Canvas coordinates [x, y]
     * @returns Formatted string with value and unit
     */
    static getPixelValue(viewport: any, canvasPos: [number, number]): string | null {
        if (!viewport || !canvasPos) return null;

        try {
            const worldPos = viewport.canvasToWorld(canvasPos);
            if (!worldPos) return null;

            // 1. Get Value based on Viewport Type
            let value: number | null = null;
            let unit = 'Value';

            if (viewport.getScalarValueAtWorld) {
                // Volume Viewport (MPR/3D)
                value = viewport.getScalarValueAtWorld(worldPos);
            } else if (viewport.getPixelValue) {
                // Stack Viewport (2D)
                value = viewport.getPixelValue(canvasPos);
            }

            if (value === null || isNaN(value)) return null;

            // 2. Determine Unit (Parity with OHIF)
            // OHIF usually checks modality. For now we assume CT = HU if value is in range or just based on modality label.
            // A more robust check would involve metadata.
            const metadata = viewport.getCornerstoneImage?.()?.metadata || {};
            const modality = metadata.Modality || 'CT'; // Default display as HU for typical use-case

            if (modality === 'CT') {
                unit = 'HU';
            }

            return `${Math.round(value)} ${unit}`;
        } catch (e) {
            return null;
        }
    }
}

export { CornerstoneService };