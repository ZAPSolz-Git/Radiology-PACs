// Image Rendering Service - Canvas-based rendering for DICOM images
// Production-grade implementation following DICOM Part 3 standards
// Pipeline: Stored Value → Modality LUT → VOI LUT → Display
import type { DicomInstance } from "@/types/dicom";
import { StorageService } from "./StorageService";

export interface RenderOptions {
  windowCenter: number;
  windowWidth: number;
  zoom: number;
  pan: { x: number; y: number };
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  invert: boolean;
  interpolation: "nearest" | "linear";
}

export interface PixelValue {
  x: number;
  y: number;
  rawValue: number;
  huValue: number;
  windowedValue: number;
}

export class ImageRenderingService {
  private static imageCache = new Map<string, { data: ImageData; lastUsed: number; size: number }>();
  private static readonly MAX_CACHE_SIZE = 100;
  private static readonly MAX_CACHE_MEMORY = 512 * 1024 * 1024; // 512MB max cache memory
  private static currentCacheMemory = 0;

  /**
   * Read a single pixel value from the buffer with proper bit handling
   * This is the critical function that handles signed/unsigned and bit masking correctly
   */
  private static readPixelValue(
    dataView: DataView,
    index: number,
    bytesPerPixel: number,
    pixelRepresentation: number,
    bitsStored: number,
    highBit: number,
    bufferLength: number
  ): number {
    const byteOffset = index * bytesPerPixel;
    
    // Bounds check
    if (byteOffset + bytesPerPixel > bufferLength) {
      return 0;
    }

    try {
      let rawValue: number;
      
      if (bytesPerPixel === 2) {
        // Read 16-bit value (little endian is standard for DICOM)
        rawValue = dataView.getUint16(byteOffset, true);
        
        // Apply bit masking based on bitsStored and highBit
        // This removes any high-bit noise from unused bits
        const mask = (1 << bitsStored) - 1;
        const shift = highBit + 1 - bitsStored;
        rawValue = (rawValue >> shift) & mask;
        
        // Handle signed values (PixelRepresentation = 1)
        // Convert from unsigned to signed using two's complement
        if (pixelRepresentation === 1) {
          const signBit = 1 << (bitsStored - 1);
          if (rawValue & signBit) {
            // Negative value: extend sign
            rawValue = rawValue - (1 << bitsStored);
          }
        }
      } else if (bytesPerPixel === 1) {
        rawValue = dataView.getUint8(byteOffset);
        
        // Apply bit masking for 8-bit
        const mask = (1 << bitsStored) - 1;
        const shift = highBit + 1 - bitsStored;
        rawValue = (rawValue >> shift) & mask;
      } else {
        rawValue = 0;
      }
      
      return rawValue;
    } catch {
      return 0;
    }
  }

  /**
   * Calculate optimal window/level from pixel data using percentile-based approach
   * Excludes typical CT padding values (-1024, -2000) for better contrast
   */
  static calculateAutoWindow(
    instance: DicomInstance,
    pixelData: ArrayBuffer,
  ): { windowCenter: number; windowWidth: number } {
    const { 
      rows, columns, bitsAllocated, bitsStored, highBit,
      pixelRepresentation, rescaleSlope, rescaleIntercept 
    } = instance;
    
    const dataView = new DataView(pixelData);
    const bytesPerPixel = bitsAllocated / 8;
    const totalPixels = rows * columns;
    const bufferLength = pixelData.byteLength;

    // Sample pixels to build a histogram
    const sampleSize = Math.min(totalPixels, 50000);
    const step = Math.max(1, Math.floor(totalPixels / sampleSize));
    const samples: number[] = [];

    for (let i = 0; i < totalPixels; i += step) {
      const rawValue = this.readPixelValue(
        dataView, i, bytesPerPixel, pixelRepresentation, 
        bitsStored, highBit, bufferLength
      );

      // Apply Modality LUT (Rescale Slope/Intercept) to get HU values
      const huValue = rawValue * rescaleSlope + rescaleIntercept;
      
      // Exclude typical CT padding values (air outside FOV)
      // These are usually -1024, -2000, or very low values
      if (huValue > -1000) {
        samples.push(huValue);
      }
    }

    if (samples.length === 0) {
      // Default to CT soft tissue window
      return { windowCenter: 40, windowWidth: 400 };
    }

    // Sort samples to find percentiles
    samples.sort((a, b) => a - b);

    // Use 2nd and 98th percentile for robust window calculation
    const p2Index = Math.floor(samples.length * 0.02);
    const p98Index = Math.floor(samples.length * 0.98);

    const minVal = samples[p2Index];
    const maxVal = samples[p98Index];

    // Calculate window from percentile range
    const range = maxVal - minVal;
    const windowWidth = Math.max(1, range);
    const windowCenter = (maxVal + minVal) / 2;

    console.log(`[AutoWindow] Calculated WC=${windowCenter.toFixed(0)}, WW=${windowWidth.toFixed(0)} from ${samples.length} samples (min=${minVal.toFixed(0)}, max=${maxVal.toFixed(0)})`);

    return { windowCenter, windowWidth };
  }

  static async renderToCanvas(
    canvas: HTMLCanvasElement,
    instance: DicomInstance,
    options: RenderOptions,
  ): Promise<void> {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Load pixel data if not in memory
    let pixelData = instance.pixelData;
    if (!pixelData) {
      pixelData = await StorageService.getInstancePixelData(instance.sopInstanceUID);
      if (!pixelData) {
        this.renderPlaceholder(ctx, canvas.width, canvas.height, "No pixel data available");
        return;
      }
    }

    // Calculate viewport dimensions
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Determine effective window/level
    let effectiveWC = options.windowCenter;
    let effectiveWW = options.windowWidth;

    // Auto-calculate window if values seem invalid
    if (effectiveWW <= 1) {
      const autoWindow = this.calculateAutoWindow(instance, pixelData);
      effectiveWC = autoWindow.windowCenter;
      effectiveWW = autoWindow.windowWidth;
    }

    // Create or get cached base image
    const cacheKey = `${instance.sopInstanceUID}_${effectiveWC.toFixed(0)}_${effectiveWW.toFixed(0)}_${options.invert}`;
    let imageData = this.imageCache.get(cacheKey);

    if (!imageData) {
      imageData = this.createImageData(instance, pixelData, {
        ...options,
        windowCenter: effectiveWC,
        windowWidth: effectiveWW,
      });
      this.addToCache(cacheKey, imageData);
    }

    // Clear canvas with black
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Create temporary canvas for the image
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = instance.columns;
    tempCanvas.height = instance.rows;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return;

    tempCtx.putImageData(imageData, 0, 0);

    // Apply transformations
    ctx.save();

    // Move to center of canvas
    ctx.translate(canvasWidth / 2, canvasHeight / 2);

    // Apply pan
    ctx.translate(options.pan.x, options.pan.y);

    // Apply rotation
    ctx.rotate((options.rotation * Math.PI) / 180);

    // Apply zoom
    ctx.scale(options.zoom, options.zoom);

    // Apply flip
    if (options.flipH) ctx.scale(-1, 1);
    if (options.flipV) ctx.scale(1, -1);

    // Calculate scaled dimensions to fit canvas
    const imageAspect = instance.columns / instance.rows;
    const canvasAspect = canvasWidth / canvasHeight;

    let drawWidth: number, drawHeight: number;
    if (imageAspect > canvasAspect) {
      drawWidth = canvasWidth / options.zoom;
      drawHeight = drawWidth / imageAspect;
    } else {
      drawHeight = canvasHeight / options.zoom;
      drawWidth = drawHeight * imageAspect;
    }

    // Enable image smoothing based on interpolation setting
    ctx.imageSmoothingEnabled = options.interpolation === "linear";
    ctx.imageSmoothingQuality = "high";

    // Draw image centered
    ctx.drawImage(tempCanvas, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

    ctx.restore();
  }

  /**
   * Create ImageData with DICOM Part 3 compliant VOI LUT transformation
   * Pipeline: Raw Pixel → Modality LUT (Rescale) → VOI LUT (Window) → Display
   * 
   * Uses simplified linear windowing formula that matches industry standards:
   * gray = ((value - windowCenter) / windowWidth + 0.5) * 255
   */
  private static createImageData(instance: DicomInstance, pixelData: ArrayBuffer, options: RenderOptions): ImageData {
    const {
      rows,
      columns,
      bitsAllocated,
      bitsStored,
      highBit,
      pixelRepresentation,
      rescaleSlope,
      rescaleIntercept,
      photometricInterpretation,
    } = instance;
    
    const imageData = new ImageData(columns, rows);
    const dataView = new DataView(pixelData);
    const bytesPerPixel = bitsAllocated / 8;
    const totalPixels = rows * columns;
    const bufferLength = pixelData.byteLength;

    const wc = options.windowCenter;
    const ww = options.windowWidth;
    
    // Simple, robust windowing formula (industry standard approach)
    // low = windowCenter - windowWidth/2
    // high = windowCenter + windowWidth/2
    // gray = clamp((value - low) / (high - low) * 255, 0, 255)
    const low = wc - ww / 2;
    const high = wc + ww / 2;
    const range = high - low;

    for (let i = 0; i < totalPixels; i++) {
      // Read raw pixel value with proper bit handling
      const rawValue = this.readPixelValue(
        dataView, i, bytesPerPixel, pixelRepresentation,
        bitsStored, highBit, bufferLength
      );

      // Step 1: Apply Modality LUT (Rescale Slope/Intercept)
      // Converts stored values to meaningful values (e.g., Hounsfield Units for CT)
      const modalityValue = rawValue * rescaleSlope + rescaleIntercept;

      // Step 2: Apply VOI LUT (Window/Level) - Simple linear windowing
      let gray: number;
      if (modalityValue <= low) {
        gray = 0;
      } else if (modalityValue >= high) {
        gray = 255;
      } else {
        gray = ((modalityValue - low) / range) * 255;
      }

      // Step 3: Handle PhotometricInterpretation
      // MONOCHROME1: 0 = white, max = black (inverted grayscale) - rare
      // MONOCHROME2: 0 = black, max = white (standard grayscale) - most common
      if (photometricInterpretation === "MONOCHROME1") {
        gray = 255 - gray;
      }

      // Step 4: Apply user-requested invert (separate from photometric)
      if (options.invert) {
        gray = 255 - gray;
      }

      // Clamp and round to valid display range [0, 255]
      gray = Math.max(0, Math.min(255, Math.round(gray)));

      // Write to RGBA image data
      const idx = i * 4;
      imageData.data[idx] = gray;     // R
      imageData.data[idx + 1] = gray; // G
      imageData.data[idx + 2] = gray; // B
      imageData.data[idx + 3] = 255;  // A (fully opaque)
    }

    return imageData;
  }

  private static addToCache(key: string, imageData: ImageData): void {
    if (this.imageCache.size >= this.MAX_CACHE_SIZE) {
      // Remove oldest entry (first one)
      const firstKey = this.imageCache.keys().next().value;
      if (firstKey) {
        this.imageCache.delete(firstKey);
      }
    }
    this.imageCache.set(key, imageData);
  }

  static clearCache(): void {
    this.imageCache.clear();
  }

  static renderPlaceholder(ctx: CanvasRenderingContext2D, width: number, height: number, message: string): void {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#666666";
    ctx.font = "14px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(message, width / 2, height / 2);
  }

  static getPixelValue(instance: DicomInstance, pixelData: ArrayBuffer, x: number, y: number): PixelValue | null {
    if (x < 0 || x >= instance.columns || y < 0 || y >= instance.rows) {
      return null;
    }

    const { bitsAllocated, bitsStored, highBit, pixelRepresentation, rescaleSlope, rescaleIntercept } = instance;
    const dataView = new DataView(pixelData);
    const bytesPerPixel = bitsAllocated / 8;
    const pixelIndex = Math.floor(y) * instance.columns + Math.floor(x);

    const rawValue = this.readPixelValue(
      dataView, pixelIndex, bytesPerPixel, pixelRepresentation,
      bitsStored, highBit, pixelData.byteLength
    );

    const huValue = rawValue * rescaleSlope + rescaleIntercept;

    return {
      x: Math.floor(x),
      y: Math.floor(y),
      rawValue,
      huValue,
      windowedValue: huValue,
    };
  }

  static calculateROIStatistics(
    instance: DicomInstance,
    pixelData: ArrayBuffer,
    points: { x: number; y: number }[],
    type: "rectangle" | "ellipse" | "polygon",
  ): { mean: number; stdDev: number; min: number; max: number; area: number; count: number } | null {
    if (points.length < 2) return null;

    const { columns, rows, bitsAllocated, bitsStored, highBit, pixelRepresentation, rescaleSlope, rescaleIntercept, pixelSpacing } =
      instance;
    const dataView = new DataView(pixelData);
    const bytesPerPixel = bitsAllocated / 8;
    const bufferLength = pixelData.byteLength;

    // Calculate bounding box
    const minX = Math.max(0, Math.floor(Math.min(...points.map((p) => p.x))));
    const maxX = Math.min(columns - 1, Math.ceil(Math.max(...points.map((p) => p.x))));
    const minY = Math.max(0, Math.floor(Math.min(...points.map((p) => p.y))));
    const maxY = Math.min(rows - 1, Math.ceil(Math.max(...points.map((p) => p.y))));

    const values: number[] = [];

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        let isInside = false;

        if (type === "rectangle") {
          isInside = true;
        } else if (type === "ellipse" && points.length >= 2) {
          const centerX = (points[0].x + points[1].x) / 2;
          const centerY = (points[0].y + points[1].y) / 2;
          const radiusX = Math.abs(points[1].x - points[0].x) / 2;
          const radiusY = Math.abs(points[1].y - points[0].y) / 2;
          if (radiusX > 0 && radiusY > 0) {
            const dx = (x - centerX) / radiusX;
            const dy = (y - centerY) / radiusY;
            isInside = dx * dx + dy * dy <= 1;
          }
        } else if (type === "polygon" && points.length >= 3) {
          isInside = this.isPointInPolygon(x, y, points);
        }

        if (isInside) {
          const pixelIndex = y * columns + x;
          const rawValue = this.readPixelValue(
            dataView, pixelIndex, bytesPerPixel, pixelRepresentation,
            bitsStored, highBit, bufferLength
          );
          const huValue = rawValue * rescaleSlope + rescaleIntercept;
          values.push(huValue);
        }
      }
    }

    if (values.length === 0) return null;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Calculate area in mm²
    const pixelArea = (pixelSpacing?.[0] || 1) * (pixelSpacing?.[1] || 1);
    const area = values.length * pixelArea;

    return {
      mean,
      stdDev,
      min,
      max,
      area,
      count: values.length,
    };
  }

  private static isPointInPolygon(x: number, y: number, polygon: { x: number; y: number }[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x,
        yi = polygon[i].y;
      const xj = polygon[j].x,
        yj = polygon[j].y;

      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  }

  static calculateDistance(
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    pixelSpacing: [number, number],
  ): number {
    const dx = (p2.x - p1.x) * (pixelSpacing?.[0] || 1);
    const dy = (p2.y - p1.y) * (pixelSpacing?.[1] || 1);
    return Math.sqrt(dx * dx + dy * dy);
  }

  static calculateAngle(
    p1: { x: number; y: number },
    vertex: { x: number; y: number },
    p2: { x: number; y: number },
  ): number {
    const v1 = { x: p1.x - vertex.x, y: p1.y - vertex.y };
    const v2 = { x: p2.x - vertex.x, y: p2.y - vertex.y };

    const dot = v1.x * v2.x + v1.y * v2.y;
    const cross = v1.x * v2.y - v1.y * v2.x;

    let angle = Math.atan2(Math.abs(cross), dot);
    return (angle * 180) / Math.PI;
  }
}
