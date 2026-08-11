import * as cornerstone from '@cornerstonejs/core';

/**
 * Thumbnail cache to prevent re-rendering the same image.
 * Key: imageId, Value: data URL string
 */
const thumbnailCache = new Map<string, string>();

/**
 * Renders a DICOM image to an offscreen canvas and returns a persistent data URL.
 * This follows the OHIF Viewers pattern: render once → cache → display as <img>.
 * 
 * @param imageId - The Cornerstone imageId to render
 * @returns A data URL string (e.g., "data:image/jpeg;base64,...")
 */
export async function getImageSrcFromImageId(imageId: string): Promise<string> {
    // Check cache first
    const cached = thumbnailCache.get(imageId);
    if (cached) {
        return cached;
    }

    const canvas = document.createElement('canvas');

    try {
        // Try the modern Cornerstone3D utility first (OHIF approach)
        if (cornerstone.utilities.loadImageToCanvas) {
            await (cornerstone.utilities.loadImageToCanvas as any)({
                canvas,
                imageId,
                thumbnail: true,
            });
        } else {
            // Fallback: manual load + render
            const image = await cornerstone.imageLoader.loadAndCacheImage(imageId);

            canvas.width = Math.min(image.width, 256);
            canvas.height = Math.min(image.height, 256);

            // Apply default windowing
            const imgAny = image as any;
            const windowWidth = image.windowWidth
                || (imgAny.voiLutModule?.windowWidth?.[0])
                || 400;
            const windowCenter = image.windowCenter
                || (imgAny.voiLutModule?.windowCenter?.[0])
                || 40;

            (cornerstone.utilities.renderToCanvasCPU as any)(
                canvas, image, undefined, { windowWidth, windowCenter }
            );
        }

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

        // Cache it
        thumbnailCache.set(imageId, dataUrl);

        return dataUrl;
    } catch (error) {
        console.error('[getImageSrcFromImageId] Failed to generate thumbnail:', imageId, error);
        throw error;
    }
}

/**
 * Gets the middle imageId from an array (best representative frame for a thumbnail).
 */
export function getImageIdForThumbnail(imageIds: string[]): string | null {
    if (!imageIds || imageIds.length === 0) return null;
    return imageIds[Math.floor(imageIds.length / 2)];
}

/**
 * Clears the thumbnail cache (e.g., when switching studies).
 */
export function clearThumbnailCache(): void {
    thumbnailCache.clear();
}
