// IndexedDB Storage Service for DICOM data persistence
import { get, set, del, keys, clear } from 'idb-keyval';
import type { DicomStudy, DicomInstance, Measurement, ViewportState, LayoutConfig } from '@/types/dicom';

const STORAGE_KEYS = {
  STUDIES: 'dicom_studies',
  MEASUREMENTS: 'dicom_measurements',
  LAYOUT: 'viewer_layout',
  VIEWPORT_STATES: 'viewport_states',
  PREFERENCES: 'user_preferences',
};

export interface UserPreferences {
  defaultWindowPresets: Record<string, { ww: number; wc: number }>;
  defaultTool: string;
  showOverlays: boolean;
  overlayFontSize: number;
  interpolationType: 'nearest' | 'linear';
  syncScroll: boolean;
  syncWindowLevel: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  defaultWindowPresets: {
    CT_BRAIN: { ww: 80, wc: 40 },
    CT_BONE: { ww: 2000, wc: 500 },
    CT_LUNG: { ww: 1500, wc: -600 },
    CT_SOFT_TISSUE: { ww: 400, wc: 40 },
    CT_LIVER: { ww: 150, wc: 30 },
    CT_ABDOMEN: { ww: 400, wc: 50 },
  },
  defaultTool: 'WindowLevel',
  showOverlays: true,
  overlayFontSize: 12,
  interpolationType: 'linear',
  syncScroll: false,
  syncWindowLevel: false,
};

export class StorageService {
  // Store pixel data separately due to size
  static async storeInstancePixelData(instanceUID: string, pixelData: ArrayBuffer): Promise<void> {
    await set(`pixel_${instanceUID}`, pixelData);
  }

  static async getInstancePixelData(instanceUID: string): Promise<ArrayBuffer | null> {
    try {
      return await get(`pixel_${instanceUID}`) || null;
    } catch {
      return null;
    }
  }

  static async deleteInstancePixelData(instanceUID: string): Promise<void> {
    await del(`pixel_${instanceUID}`);
  }

  // Studies storage (without pixel data)
  static async saveStudies(studies: DicomStudy[]): Promise<void> {
    // Strip pixel data before storing (stored separately)
    const studiesWithoutPixels = studies.map(study => ({
      ...study,
      series: study.series.map(series => ({
        ...series,
        instances: series.instances.map(instance => ({
          ...instance,
          pixelData: null, // Don't store in main studies object
          rawDataset: null, // Don't store raw dataset
        })),
      })),
    }));
    
    await set(STORAGE_KEYS.STUDIES, studiesWithoutPixels);
    
    // Store pixel data separately
    for (const study of studies) {
      for (const series of study.series) {
        for (const instance of series.instances) {
          if (instance.pixelData) {
            await this.storeInstancePixelData(instance.sopInstanceUID, instance.pixelData);
          }
        }
      }
    }
  }

  static async loadStudies(): Promise<DicomStudy[]> {
    try {
      const studies = await get(STORAGE_KEYS.STUDIES);
      if (!studies) return [];
      
      // Restore pixel data references (loaded on demand)
      return studies as DicomStudy[];
    } catch {
      return [];
    }
  }

  static async clearStudies(): Promise<void> {
    // Clear all pixel data
    const allKeys = await keys();
    for (const key of allKeys) {
      if (typeof key === 'string' && key.startsWith('pixel_')) {
        await del(key);
      }
    }
    await del(STORAGE_KEYS.STUDIES);
  }

  // Measurements storage
  static async saveMeasurements(measurements: Measurement[]): Promise<void> {
    await set(STORAGE_KEYS.MEASUREMENTS, measurements);
  }

  static async loadMeasurements(): Promise<Measurement[]> {
    try {
      return (await get(STORAGE_KEYS.MEASUREMENTS)) || [];
    } catch {
      return [];
    }
  }

  static async addMeasurement(measurement: Measurement): Promise<void> {
    const measurements = await this.loadMeasurements();
    measurements.push(measurement);
    await this.saveMeasurements(measurements);
  }

  static async updateMeasurement(id: string, updates: Partial<Measurement>): Promise<void> {
    const measurements = await this.loadMeasurements();
    const index = measurements.findIndex(m => m.id === id);
    if (index >= 0) {
      measurements[index] = { ...measurements[index], ...updates, modifiedAt: new Date() };
      await this.saveMeasurements(measurements);
    }
  }

  static async deleteMeasurement(id: string): Promise<void> {
    const measurements = await this.loadMeasurements();
    await this.saveMeasurements(measurements.filter(m => m.id !== id));
  }

  // Layout persistence
  static async saveLayout(layout: LayoutConfig): Promise<void> {
    await set(STORAGE_KEYS.LAYOUT, layout);
  }

  static async loadLayout(): Promise<LayoutConfig | null> {
    try {
      return await get(STORAGE_KEYS.LAYOUT) || null;
    } catch {
      return null;
    }
  }

  // Viewport states persistence
  static async saveViewportStates(states: ViewportState[]): Promise<void> {
    await set(STORAGE_KEYS.VIEWPORT_STATES, states);
  }

  static async loadViewportStates(): Promise<ViewportState[] | null> {
    try {
      return await get(STORAGE_KEYS.VIEWPORT_STATES) || null;
    } catch {
      return null;
    }
  }

  // User preferences
  static async savePreferences(preferences: UserPreferences): Promise<void> {
    await set(STORAGE_KEYS.PREFERENCES, preferences);
  }

  static async loadPreferences(): Promise<UserPreferences> {
    try {
      const prefs = await get(STORAGE_KEYS.PREFERENCES);
      return prefs ? { ...DEFAULT_PREFERENCES, ...prefs } : DEFAULT_PREFERENCES;
    } catch {
      return DEFAULT_PREFERENCES;
    }
  }

  // Export session
  static async exportSession(): Promise<string> {
    const studies = await this.loadStudies();
    const measurements = await this.loadMeasurements();
    const layout = await this.loadLayout();
    const viewportStates = await this.loadViewportStates();
    const preferences = await this.loadPreferences();

    const sessionData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      studies,
      measurements,
      layout,
      viewportStates,
      preferences,
    };

    return JSON.stringify(sessionData, null, 2);
  }

  // Import session
  static async importSession(jsonData: string): Promise<boolean> {
    try {
      const sessionData = JSON.parse(jsonData);
      
      if (sessionData.studies) {
        await this.saveStudies(sessionData.studies);
      }
      if (sessionData.measurements) {
        await this.saveMeasurements(sessionData.measurements);
      }
      if (sessionData.layout) {
        await this.saveLayout(sessionData.layout);
      }
      if (sessionData.viewportStates) {
        await this.saveViewportStates(sessionData.viewportStates);
      }
      if (sessionData.preferences) {
        await this.savePreferences(sessionData.preferences);
      }
      
      return true;
    } catch (error) {
      console.error('Error importing session:', error);
      return false;
    }
  }

  // Clear all data
  static async clearAll(): Promise<void> {
    await clear();
  }

  // Get storage usage
  static async getStorageUsage(): Promise<{ used: number; available: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        available: estimate.quota || 0,
      };
    }
    return { used: 0, available: 0 };
  }
}
