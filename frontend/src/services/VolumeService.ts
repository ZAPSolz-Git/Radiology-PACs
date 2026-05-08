// Volume Reconstruction Service for MPR and MIP
import type { DicomInstance, DicomSeries } from '@/types/dicom';
import { StorageService } from './StorageService';

export interface Volume {
  data: Float32Array;
  dimensions: { x: number; y: number; z: number };
  spacing: { x: number; y: number; z: number };
  origin: { x: number; y: number; z: number };
  direction: number[];
  rescaleSlope: number;
  rescaleIntercept: number;
  windowCenter: number;
  windowWidth: number;
  minValue: number;
  maxValue: number;
}

export interface SliceData {
  imageData: ImageData;
  pixelSpacing: { x: number; y: number };
  dimensions: { width: number; height: number };
}

export type MPRPlane = 'axial' | 'sagittal' | 'coronal';

// Projection types for volume rendering
export type ProjectionType = 'none' | 'MIP' | 'MinIP' | 'Average';

export interface CrosshairPosition {
  axial: number;    // Slice index in axial plane (Z)
  sagittal: number; // Slice index in sagittal plane (X)
  coronal: number;  // Slice index in coronal plane (Y)
}

export interface ProjectionOptions {
  type: ProjectionType;
  slabThickness: number; // Number of slices to include in projection
}

export class VolumeService {
  private static volumeCache = new Map<string, Volume>();

  /**
   * Build a 3D volume from a DICOM series
   */
  static async buildVolume(series: DicomSeries): Promise<Volume | null> {
    const cacheKey = series.seriesInstanceUID;
    
    if (this.volumeCache.has(cacheKey)) {
      return this.volumeCache.get(cacheKey)!;
    }

    if (series.instances.length < 3) {
      console.warn('Need at least 3 slices for MPR');
      return null;
    }

    // Sort instances by slice location or image position
    const sortedInstances = [...series.instances].sort((a, b) => {
      // Primary: sort by slice location
      if (a.sliceLocation !== b.sliceLocation) {
        return a.sliceLocation - b.sliceLocation;
      }
      // Secondary: sort by Z position
      return (a.imagePositionPatient?.[2] || 0) - (b.imagePositionPatient?.[2] || 0);
    });

    const firstInstance = sortedInstances[0];
    const lastInstance = sortedInstances[sortedInstances.length - 1];

    const columns = firstInstance.columns;
    const rows = firstInstance.rows;
    const slices = sortedInstances.length;

    // Calculate slice spacing from the distance between first and last slice
    const zStart = firstInstance.imagePositionPatient?.[2] || 0;
    const zEnd = lastInstance.imagePositionPatient?.[2] || (slices * (firstInstance.sliceThickness || 1));
    const sliceSpacing = Math.abs(zEnd - zStart) / (slices - 1) || firstInstance.sliceThickness || 1;

    // Create volume data array
    const volumeData = new Float32Array(columns * rows * slices);
    let minValue = Infinity;
    let maxValue = -Infinity;

    // Load all pixel data
    for (let z = 0; z < slices; z++) {
      const instance = sortedInstances[z];
      let pixelData = instance.pixelData;
      
      if (!pixelData) {
        pixelData = await StorageService.getInstancePixelData(instance.sopInstanceUID);
      }

      if (!pixelData) {
        console.warn(`Missing pixel data for slice ${z}`);
        continue;
      }

      const dataView = new DataView(pixelData);
      const bytesPerPixel = instance.bitsAllocated / 8;
      const sliceOffset = z * columns * rows;

      for (let i = 0; i < columns * rows; i++) {
        let rawValue: number;
        try {
          if (bytesPerPixel === 2) {
            if (instance.pixelRepresentation === 1) {
              rawValue = dataView.getInt16(i * 2, true);
            } else {
              rawValue = dataView.getUint16(i * 2, true);
            }
          } else {
            rawValue = dataView.getUint8(i);
          }
        } catch {
          rawValue = 0;
        }

        // Apply rescale to get Hounsfield units
        const huValue = rawValue * instance.rescaleSlope + instance.rescaleIntercept;
        volumeData[sliceOffset + i] = huValue;
        
        // Track min/max for auto-windowing
        if (huValue < minValue) minValue = huValue;
        if (huValue > maxValue) maxValue = huValue;
      }
    }

    // Use DICOM window/level or calculate from data
    let windowCenter = typeof firstInstance.windowCenter === 'number' ? firstInstance.windowCenter : 40;
    let windowWidth = typeof firstInstance.windowWidth === 'number' ? firstInstance.windowWidth : 400;

    // If window values seem wrong, auto-calculate
    if (windowWidth <= 1 || windowCenter < minValue || windowCenter > maxValue) {
      windowWidth = maxValue - minValue;
      windowCenter = (maxValue + minValue) / 2;
    }

    const volume: Volume = {
      data: volumeData,
      dimensions: { x: columns, y: rows, z: slices },
      spacing: {
        x: firstInstance.pixelSpacing?.[0] || 1,
        y: firstInstance.pixelSpacing?.[1] || 1,
        z: sliceSpacing,
      },
      origin: {
        x: firstInstance.imagePositionPatient?.[0] || 0,
        y: firstInstance.imagePositionPatient?.[1] || 0,
        z: zStart,
      },
      direction: firstInstance.imageOrientationPatient || [1, 0, 0, 0, 1, 0],
      rescaleSlope: firstInstance.rescaleSlope,
      rescaleIntercept: firstInstance.rescaleIntercept,
      windowCenter,
      windowWidth,
      minValue,
      maxValue,
    };

    this.volumeCache.set(cacheKey, volume);
    return volume;
  }

  /**
   * Extract an axial slice (XY plane at Z position)
   * Standard view: patient lying down, viewing from feet
   */
  static extractAxialSlice(volume: Volume, sliceIndex: number, wc: number, ww: number): SliceData {
    const { dimensions } = volume;
    const z = Math.max(0, Math.min(dimensions.z - 1, Math.floor(sliceIndex)));
    
    const width = dimensions.x;
    const height = dimensions.y;
    const imageData = new ImageData(width, height);
    const sliceOffset = z * dimensions.x * dimensions.y;

    const low = wc - ww / 2;
    const high = wc + ww / 2;

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const srcIdx = sliceOffset + row * dimensions.x + col;
        const dstIdx = (row * width + col) * 4;
        
        const value = volume.data[srcIdx];
        const gray = this.applyWindowLevel(value, low, high);

        imageData.data[dstIdx] = gray;
        imageData.data[dstIdx + 1] = gray;
        imageData.data[dstIdx + 2] = gray;
        imageData.data[dstIdx + 3] = 255;
      }
    }

    return {
      imageData,
      pixelSpacing: { x: volume.spacing.x, y: volume.spacing.y },
      dimensions: { width, height },
    };
  }

  /**
   * Extract a sagittal slice (YZ plane at X position)
   * View from patient's right side
   */
  static extractSagittalSlice(volume: Volume, sliceIndex: number, wc: number, ww: number): SliceData {
    const { dimensions } = volume;
    const x = Math.max(0, Math.min(dimensions.x - 1, Math.floor(sliceIndex)));
    
    // Sagittal: width = Z (slices), height = Y (rows)
    const width = dimensions.z;
    const height = dimensions.y;
    const imageData = new ImageData(width, height);
    
    const low = wc - ww / 2;
    const high = wc + ww / 2;

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        // Volume indexing: z * (dimX * dimY) + y * dimX + x
        const z = col;
        const y = row;
        const srcIdx = z * dimensions.x * dimensions.y + y * dimensions.x + x;
        const dstIdx = (row * width + col) * 4;
        
        const value = volume.data[srcIdx];
        const gray = this.applyWindowLevel(value, low, high);

        imageData.data[dstIdx] = gray;
        imageData.data[dstIdx + 1] = gray;
        imageData.data[dstIdx + 2] = gray;
        imageData.data[dstIdx + 3] = 255;
      }
    }

    return {
      imageData,
      pixelSpacing: { x: volume.spacing.z, y: volume.spacing.y },
      dimensions: { width, height },
    };
  }

  /**
   * Extract a coronal slice (XZ plane at Y position)
   * View from front of patient
   */
  static extractCoronalSlice(volume: Volume, sliceIndex: number, wc: number, ww: number): SliceData {
    const { dimensions } = volume;
    const y = Math.max(0, Math.min(dimensions.y - 1, Math.floor(sliceIndex)));
    
    // Coronal: width = X (columns), height = Z (slices)
    const width = dimensions.x;
    const height = dimensions.z;
    const imageData = new ImageData(width, height);
    
    const low = wc - ww / 2;
    const high = wc + ww / 2;

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        // Volume indexing: z * (dimX * dimY) + y * dimX + x
        // For coronal: row = z (from top to bottom = superior to inferior)
        // We want to flip the Z axis so superior is at top
        const z = height - 1 - row; // Flip Z for proper orientation
        const x = col;
        const srcIdx = z * dimensions.x * dimensions.y + y * dimensions.x + x;
        const dstIdx = (row * width + col) * 4;
        
        const value = volume.data[srcIdx];
        const gray = this.applyWindowLevel(value, low, high);

        imageData.data[dstIdx] = gray;
        imageData.data[dstIdx + 1] = gray;
        imageData.data[dstIdx + 2] = gray;
        imageData.data[dstIdx + 3] = 255;
      }
    }

    return {
      imageData,
      pixelSpacing: { x: volume.spacing.x, y: volume.spacing.z },
      dimensions: { width, height },
    };
  }

  private static applyWindowLevel(value: number, low: number, high: number): number {
    if (value <= low) return 0;
    if (value >= high) return 255;
    return Math.round(((value - low) / (high - low)) * 255);
  }

  /**
   * Get the maximum slice index for each plane
   */
  static getMaxSlices(volume: Volume): CrosshairPosition {
    return {
      axial: volume.dimensions.z - 1,
      sagittal: volume.dimensions.x - 1,
      coronal: volume.dimensions.y - 1,
    };
  }

  /**
   * Convert image coordinates to crosshair position
   */
  static imageCoordsToPosition(
    plane: MPRPlane,
    x: number,
    y: number,
    currentPosition: CrosshairPosition,
    volume: Volume
  ): CrosshairPosition {
    const newPosition = { ...currentPosition };

    switch (plane) {
      case 'axial':
        // Axial shows X,Y - clicking updates sagittal (X) and coronal (Y)
        newPosition.sagittal = Math.max(0, Math.min(volume.dimensions.x - 1, Math.round(x)));
        newPosition.coronal = Math.max(0, Math.min(volume.dimensions.y - 1, Math.round(y)));
        break;
      case 'sagittal':
        // Sagittal shows Z,Y - clicking updates axial (Z) and coronal (Y)
        newPosition.axial = Math.max(0, Math.min(volume.dimensions.z - 1, Math.round(x)));
        newPosition.coronal = Math.max(0, Math.min(volume.dimensions.y - 1, Math.round(y)));
        break;
      case 'coronal':
        // Coronal shows X,Z - clicking updates sagittal (X) and axial (Z)
        // Note: Y is flipped in coronal view
        newPosition.sagittal = Math.max(0, Math.min(volume.dimensions.x - 1, Math.round(x)));
        newPosition.axial = Math.max(0, Math.min(volume.dimensions.z - 1, volume.dimensions.z - 1 - Math.round(y)));
        break;
    }

    return newPosition;
  }

  /**
   * Get crosshair lines for a given plane (returns positions in image coordinates)
   */
  static getCrosshairLines(
    plane: MPRPlane,
    position: CrosshairPosition,
    volume: Volume
  ): { horizontal: number; vertical: number } {
    switch (plane) {
      case 'axial':
        // Axial: horizontal = coronal (Y), vertical = sagittal (X)
        return {
          horizontal: position.coronal,
          vertical: position.sagittal,
        };
      case 'sagittal':
        // Sagittal: horizontal = coronal (Y), vertical = axial (Z)
        return {
          horizontal: position.coronal,
          vertical: position.axial,
        };
      case 'coronal':
        // Coronal: horizontal = axial (Z, flipped), vertical = sagittal (X)
        return {
          horizontal: volume.dimensions.z - 1 - position.axial, // Flip Z
          vertical: position.sagittal,
        };
    }
  }

  static clearCache(): void {
    this.volumeCache.clear();
  }

  /**
   * Extract axial slice with MIP/MinIP/Average projection
   * Projects through a slab of specified thickness
   */
  static extractAxialSliceWithProjection(
    volume: Volume,
    centerSlice: number,
    wc: number,
    ww: number,
    options: ProjectionOptions
  ): SliceData {
    const { dimensions } = volume;
    const { type, slabThickness } = options;
    
    // If no projection, use regular slice extraction
    if (type === 'none' || slabThickness <= 1) {
      return this.extractAxialSlice(volume, centerSlice, wc, ww);
    }

    const halfSlab = Math.floor(slabThickness / 2);
    const startZ = Math.max(0, centerSlice - halfSlab);
    const endZ = Math.min(dimensions.z - 1, centerSlice + halfSlab);
    
    const width = dimensions.x;
    const height = dimensions.y;
    const imageData = new ImageData(width, height);
    
    const low = wc - ww / 2;
    const high = wc + ww / 2;

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        let projectedValue: number;
        
        if (type === 'MIP') {
          // Maximum Intensity Projection - find max value along ray
          projectedValue = -Infinity;
          for (let z = startZ; z <= endZ; z++) {
            const srcIdx = z * dimensions.x * dimensions.y + row * dimensions.x + col;
            const value = volume.data[srcIdx];
            if (value > projectedValue) projectedValue = value;
          }
        } else if (type === 'MinIP') {
          // Minimum Intensity Projection - find min value along ray
          projectedValue = Infinity;
          for (let z = startZ; z <= endZ; z++) {
            const srcIdx = z * dimensions.x * dimensions.y + row * dimensions.x + col;
            const value = volume.data[srcIdx];
            if (value < projectedValue) projectedValue = value;
          }
        } else {
          // Average Intensity Projection
          let sum = 0;
          let count = 0;
          for (let z = startZ; z <= endZ; z++) {
            const srcIdx = z * dimensions.x * dimensions.y + row * dimensions.x + col;
            sum += volume.data[srcIdx];
            count++;
          }
          projectedValue = count > 0 ? sum / count : 0;
        }

        const dstIdx = (row * width + col) * 4;
        const gray = this.applyWindowLevel(projectedValue, low, high);

        imageData.data[dstIdx] = gray;
        imageData.data[dstIdx + 1] = gray;
        imageData.data[dstIdx + 2] = gray;
        imageData.data[dstIdx + 3] = 255;
      }
    }

    return {
      imageData,
      pixelSpacing: { x: volume.spacing.x, y: volume.spacing.y },
      dimensions: { width, height },
    };
  }

  /**
   * Extract sagittal slice with projection
   */
  static extractSagittalSliceWithProjection(
    volume: Volume,
    centerSlice: number,
    wc: number,
    ww: number,
    options: ProjectionOptions
  ): SliceData {
    const { dimensions } = volume;
    const { type, slabThickness } = options;
    
    if (type === 'none' || slabThickness <= 1) {
      return this.extractSagittalSlice(volume, centerSlice, wc, ww);
    }

    const halfSlab = Math.floor(slabThickness / 2);
    const startX = Math.max(0, centerSlice - halfSlab);
    const endX = Math.min(dimensions.x - 1, centerSlice + halfSlab);
    
    const width = dimensions.z;
    const height = dimensions.y;
    const imageData = new ImageData(width, height);
    
    const low = wc - ww / 2;
    const high = wc + ww / 2;

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        let projectedValue: number;
        const z = col;
        const y = row;
        
        if (type === 'MIP') {
          projectedValue = -Infinity;
          for (let x = startX; x <= endX; x++) {
            const srcIdx = z * dimensions.x * dimensions.y + y * dimensions.x + x;
            const value = volume.data[srcIdx];
            if (value > projectedValue) projectedValue = value;
          }
        } else if (type === 'MinIP') {
          projectedValue = Infinity;
          for (let x = startX; x <= endX; x++) {
            const srcIdx = z * dimensions.x * dimensions.y + y * dimensions.x + x;
            const value = volume.data[srcIdx];
            if (value < projectedValue) projectedValue = value;
          }
        } else {
          let sum = 0;
          let count = 0;
          for (let x = startX; x <= endX; x++) {
            const srcIdx = z * dimensions.x * dimensions.y + y * dimensions.x + x;
            sum += volume.data[srcIdx];
            count++;
          }
          projectedValue = count > 0 ? sum / count : 0;
        }

        const dstIdx = (row * width + col) * 4;
        const gray = this.applyWindowLevel(projectedValue, low, high);

        imageData.data[dstIdx] = gray;
        imageData.data[dstIdx + 1] = gray;
        imageData.data[dstIdx + 2] = gray;
        imageData.data[dstIdx + 3] = 255;
      }
    }

    return {
      imageData,
      pixelSpacing: { x: volume.spacing.z, y: volume.spacing.y },
      dimensions: { width, height },
    };
  }

  /**
   * Extract coronal slice with projection
   */
  static extractCoronalSliceWithProjection(
    volume: Volume,
    centerSlice: number,
    wc: number,
    ww: number,
    options: ProjectionOptions
  ): SliceData {
    const { dimensions } = volume;
    const { type, slabThickness } = options;
    
    if (type === 'none' || slabThickness <= 1) {
      return this.extractCoronalSlice(volume, centerSlice, wc, ww);
    }

    const halfSlab = Math.floor(slabThickness / 2);
    const startY = Math.max(0, centerSlice - halfSlab);
    const endY = Math.min(dimensions.y - 1, centerSlice + halfSlab);
    
    const width = dimensions.x;
    const height = dimensions.z;
    const imageData = new ImageData(width, height);
    
    const low = wc - ww / 2;
    const high = wc + ww / 2;

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        let projectedValue: number;
        const z = height - 1 - row;
        const x = col;
        
        if (type === 'MIP') {
          projectedValue = -Infinity;
          for (let y = startY; y <= endY; y++) {
            const srcIdx = z * dimensions.x * dimensions.y + y * dimensions.x + x;
            const value = volume.data[srcIdx];
            if (value > projectedValue) projectedValue = value;
          }
        } else if (type === 'MinIP') {
          projectedValue = Infinity;
          for (let y = startY; y <= endY; y++) {
            const srcIdx = z * dimensions.x * dimensions.y + y * dimensions.x + x;
            const value = volume.data[srcIdx];
            if (value < projectedValue) projectedValue = value;
          }
        } else {
          let sum = 0;
          let count = 0;
          for (let y = startY; y <= endY; y++) {
            const srcIdx = z * dimensions.x * dimensions.y + y * dimensions.x + x;
            sum += volume.data[srcIdx];
            count++;
          }
          projectedValue = count > 0 ? sum / count : 0;
        }

        const dstIdx = (row * width + col) * 4;
        const gray = this.applyWindowLevel(projectedValue, low, high);

        imageData.data[dstIdx] = gray;
        imageData.data[dstIdx + 1] = gray;
        imageData.data[dstIdx + 2] = gray;
        imageData.data[dstIdx + 3] = 255;
      }
    }

    return {
      imageData,
      pixelSpacing: { x: volume.spacing.x, y: volume.spacing.z },
      dimensions: { width, height },
    };
  }

  /**
   * Get real-time HU value at volume position
   * This returns the precise Hounsfield Unit value for the given coordinates
   */
  static getHUValueAt(
    volume: Volume,
    x: number,
    y: number,
    z: number
  ): number | null {
    const { dimensions } = volume;
    
    // Bounds check
    if (x < 0 || x >= dimensions.x || y < 0 || y >= dimensions.y || z < 0 || z >= dimensions.z) {
      return null;
    }

    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const iz = Math.floor(z);
    
    const idx = iz * dimensions.x * dimensions.y + iy * dimensions.x + ix;
    
    // Volume data is already in HU (rescale was applied during buildVolume)
    return volume.data[idx];
  }

  /**
   * Get HU value statistics for a region
   */
  static getRegionHUStats(
    volume: Volume,
    centerX: number,
    centerY: number,
    centerZ: number,
    radius: number
  ): { mean: number; stdDev: number; min: number; max: number } | null {
    const { dimensions } = volume;
    const values: number[] = [];

    const startX = Math.max(0, Math.floor(centerX - radius));
    const endX = Math.min(dimensions.x - 1, Math.ceil(centerX + radius));
    const startY = Math.max(0, Math.floor(centerY - radius));
    const endY = Math.min(dimensions.y - 1, Math.ceil(centerY + radius));
    const startZ = Math.max(0, Math.floor(centerZ - radius));
    const endZ = Math.min(dimensions.z - 1, Math.ceil(centerZ + radius));

    for (let z = startZ; z <= endZ; z++) {
      for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
          const idx = z * dimensions.x * dimensions.y + y * dimensions.x + x;
          values.push(volume.data[idx]);
        }
      }
    }

    if (values.length === 0) return null;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const min = Math.min(...values);
    const max = Math.max(...values);

    return { mean, stdDev, min, max };
  }
}
