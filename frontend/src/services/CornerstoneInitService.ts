/**
 * Cornerstone.js v2 Initialization Service
 * Uses dynamic imports to avoid TypeScript type resolution issues
 * FIXED: Better error handling and initialization state management
 */

let initialized = false;
let initializationPromise: Promise<void> | null = null;
let initializationError: Error | null = null;

export async function initCornerstone(): Promise<void> {
  // If already initialized successfully, return immediately
  if (initialized) {
    return;
  }

  // If initialization failed before, throw the error
  if (initializationError) {
    throw initializationError;
  }

  // If initialization is in progress, wait for it
  if (initializationPromise) {
    return initializationPromise;
  }

  // Start new initialization
  initializationPromise = doInitialize();
  return initializationPromise;
}

async function doInitialize(): Promise<void> {
  try {
    console.log("[Cornerstone] Starting initialization...");

    // Dynamic imports to avoid TypeScript type resolution issues
    const csCore = await import("@cornerstonejs/core");
    const csTools = await import("@cornerstonejs/tools");
    const csDicomLoader = await import("@cornerstonejs/dicom-image-loader");

    // Initialize core rendering engine
    await csCore.init();
    console.log("[Cornerstone] Core initialized");

    // Initialize tools
    await csTools.init();
    console.log("[Cornerstone] Tools initialized");

    // Initialize DICOM image loader with web workers
    // OPTIMIZED: Use more workers for large datasets, but reserve some for UI
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    const maxWorkers = Math.min(Math.max(hardwareConcurrency - 1, 2), 8);
    csDicomLoader.init({
      maxWebWorkers: maxWorkers,
    });
    console.log(`[Cornerstone] DICOM loader initialized with ${maxWorkers} workers (Hardware: ${hardwareConcurrency})`);

    // Register volume loader
    csCore.volumeLoader.registerUnknownVolumeLoader(csCore.cornerstoneStreamingImageVolumeLoader);
    console.log("[Cornerstone] Volume loader registered");

    // [NEW] Register Persistent Cache Wrapper for wadouri
    const { registerPersistentImageLoader } = await import('./DicomImageLoaderService');
    await registerPersistentImageLoader();

    initialized = true;
    console.log("[Cornerstone] All systems ready ✓");
  } catch (error) {
    console.error("[Cornerstone] Initialization failed:", error);
    initializationError = error instanceof Error ? error : new Error(String(error));
    initializationPromise = null;
    throw initializationError;
  }
}

export function isInitialized(): boolean {
  return initialized;
}

export function getInitializationError(): Error | null {
  return initializationError;
}

/**
 * Reset initialization state (useful for testing or recovery)
 */
export function resetInitialization(): void {
  initialized = false;
  initializationPromise = null;
  initializationError = null;
  console.log("[Cornerstone] Initialization state reset");
}
