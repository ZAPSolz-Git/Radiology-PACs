import { create } from 'zustand';
import type { DicomStudy, ViewportState, LayoutConfig, ToolType, Measurement } from '@/types/dicom';

interface DicomStore {
  // Studies data
  studies: DicomStudy[];
  selectedStudyUID: string | null;
  selectedSeriesUID: string | null;

  // Viewport state
  viewports: ViewportState[];
  activeViewportId: string | null;
  maximizedViewportId: string | null;
  selectedViewportIds: string[];
  isMultiSelectMode: boolean;
  layout: LayoutConfig;

  // Tools
  activeTool: ToolType;
  measurements: Measurement[];

  // UI state
  isLoading: boolean;
  uploadProgress: number;
  showUploadScreen: boolean;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;

  // Actions
  addStudy: (study: DicomStudy) => void;
  setStudies: (studies: DicomStudy[]) => void;
  selectStudy: (studyUID: string) => void;
  selectSeries: (seriesUID: string) => void;
  setLayout: (layout: LayoutConfig) => void;
  setActiveTool: (tool: ToolType) => void;
  setActiveViewport: (id: string) => void;
  setMaximizedViewport: (id: string | null) => void;
  toggleViewportSelection: (id: string) => void;
  clearViewportSelection: () => void;
  setMultiSelectMode: (active: boolean) => void;
  updateViewport: (id: string, updates: Partial<ViewportState>) => void;
  loadSeriesToViewport: (viewportId: string, studyUID: string, seriesUID: string) => void;
  applyHangingProtocol: (config: any) => void;
  setShowUploadScreen: (show: boolean) => void;
  setLoading: (loading: boolean) => void;
  setUploadProgress: (progress: number) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  addMeasurement: (measurement: Measurement) => void;
  removeMeasurement: (id: string) => void;
  setMeasurements: (measurements: Measurement[]) => void;
  resetViewport: (id: string) => void;
  clearAll: () => void;
}

const createInitialViewports = (layout: LayoutConfig): ViewportState[] => {
  const count = layout.rows * layout.cols;
  return Array.from({ length: count }, (_, i) => ({
    id: `viewport-${i}`,
    studyUID: null,
    seriesUID: null,
    currentImageIndex: 0,
    windowCenter: 40,
    windowWidth: 400,
    zoom: 1,
    pan: { x: 0, y: 0 },
    rotation: 0,
    flipH: false,
    flipV: false,
    invert: false,
    isPlaying: false,
    playbackSpeed: 10,
  }));
};

export const useDicomStore = create<DicomStore>((set, get) => ({
  studies: [],
  selectedStudyUID: null,
  selectedSeriesUID: null,
  viewports: createInitialViewports({ rows: 1, cols: 1 }),
  activeViewportId: 'viewport-0',
  maximizedViewportId: null,
  selectedViewportIds: [],
  isMultiSelectMode: false,
  layout: { rows: 1, cols: 1 },
  activeTool: 'WindowLevel',
  measurements: [],
  isLoading: false,
  uploadProgress: 0,
  showUploadScreen: true,
  leftPanelOpen: true,
  rightPanelOpen: true,

  addStudy: (study) => set((state) => ({
    studies: [...state.studies, study],
    selectedStudyUID: study.studyInstanceUID,
    selectedSeriesUID: study.series[0]?.seriesInstanceUID || null,
    showUploadScreen: false,
  })),

  setStudies: (studies) => set({
    studies,
    selectedStudyUID: studies[0]?.studyInstanceUID || null,
    selectedSeriesUID: studies[0]?.series[0]?.seriesInstanceUID || null,
    showUploadScreen: studies.length === 0,
  }),

  selectStudy: (studyUID) => set((state) => {
    const study = state.studies.find(s => s.studyInstanceUID === studyUID);
    return {
      selectedStudyUID: studyUID,
      selectedSeriesUID: study?.series[0]?.seriesInstanceUID || null,
    };
  }),

  selectSeries: (seriesUID) => set({ selectedSeriesUID: seriesUID }),

  setLayout: (layout) => set((state) => {
    if (state.layout.rows === layout.rows && state.layout.cols === layout.cols) {
      return {};
    }

    const newCount = layout.rows * layout.cols;
    const currentViewports = [...state.viewports];
    let newViewports: ViewportState[] = [];

    for (let i = 0; i < newCount; i++) {
      if (currentViewports[i]) {
        newViewports.push(currentViewports[i]);
      } else {
        newViewports.push({
          id: `viewport-${i}`,
          studyUID: null,
          seriesUID: null,
          currentImageIndex: 0,
          windowCenter: 40,
          windowWidth: 400,
          zoom: 1,
          pan: { x: 0, y: 0 },
          rotation: 0,
          flipH: false,
          flipV: false,
          invert: false,
          isPlaying: false,
          playbackSpeed: 10,
        });
      }
    }

    return {
      layout,
      viewports: newViewports,
      activeViewportId: 'viewport-0',
      maximizedViewportId: null,
    };
  }),

  setActiveTool: (tool) => set({ activeTool: tool }),

  setActiveViewport: (id) => set({ activeViewportId: id }),

  setMaximizedViewport: (id) => set({ maximizedViewportId: id }),

  toggleViewportSelection: (id) => set((state) => ({
    selectedViewportIds: state.selectedViewportIds.includes(id)
      ? state.selectedViewportIds.filter(vId => vId !== id)
      : [...state.selectedViewportIds, id]
  })),

  clearViewportSelection: () => set({ selectedViewportIds: [] }),

  setMultiSelectMode: (active) => set({
    isMultiSelectMode: active,
    selectedViewportIds: [] // Clear selection when toggling mode
  }),

  updateViewport: (id, updates) => set((state) => {
    const exists = state.viewports.find(v => v.id === id);
    if (exists) {
      return {
        viewports: state.viewports.map(v =>
          v.id === id ? { ...v, ...updates } : v
        ),
      };
    } else {
      // Register new viewport (e.g. MPR orientation)
      return {
        viewports: [
          ...state.viewports,
          {
            id,
            studyUID: null,
            seriesUID: null,
            currentImageIndex: 0,
            windowCenter: 40,
            windowWidth: 400,
            zoom: 1,
            pan: { x: 0, y: 0 },
            rotation: 0,
            flipH: false,
            flipV: false,
            invert: false,
            isPlaying: false,
            playbackSpeed: 10,
            ...updates
          }
        ]
      };
    }
  }),

  loadSeriesToViewport: (viewportId, studyUID, displaySetInstanceUID) => set((state) => {
    // Find the study and displaySet to get DICOM window values
    // In our simplified logic, seriesUID and displaySetInstanceUID are currently the same
    const seriesUID = displaySetInstanceUID;

    const study = state.studies.find(s => s.studyInstanceUID === studyUID);
    const series = study?.series.find(s => s.seriesInstanceUID === seriesUID);
    const firstInstance = series?.instances[0];

    // Use DICOM metadata window values if available
    const getWindowValue = (value: number | number[] | undefined, defaultVal: number): number => {
      if (value === undefined) return defaultVal;
      if (Array.isArray(value)) return value[0] ?? defaultVal;
      return value;
    };

    const windowCenter = getWindowValue(firstInstance?.windowCenter, 40);
    const windowWidth = getWindowValue(firstInstance?.windowWidth, 400);

    return {
      viewports: state.viewports.map(v =>
        v.id === viewportId
          ? {
            ...v,
            studyUID,
            seriesUID,
            displaySetInstanceUID,
            currentImageIndex: 0,
            windowCenter,
            windowWidth,
            zoom: 1,
            pan: { x: 0, y: 0 },
            rotation: 0,
            flipH: false,
            flipV: false,
            invert: false,
          }
          : v
      ),
      selectedStudyUID: studyUID,
      selectedSeriesUID: seriesUID,
      activeViewportId: viewportId,
    };
  }),

  applyHangingProtocol: (config: any) => set((state) => {
    // 1. Update Layout
    const layout = { rows: config.rows, cols: config.cols };

    // 2. Create Viewports
    const count = layout.rows * layout.cols;
    const newViewports = Array.from({ length: count }, (_, i) => {
      const viewportId = `viewport-${i}`;
      const assignment = config.viewports[i] || {};
      const displaySetId = assignment.displaySetInstanceUID;

      // Find initial window values if possible
      let windowCenter = 40;
      let windowWidth = 400;

      if (displaySetId) {
        // This is a bit tricky as dicomStore doesn't depend on displaySetService directly in types
        // but we can pass the values through the config if we want, or just let Viewport.tsx handle it.
        // For now, let's assume default values and Viewport.tsx will overwrite when it loads.
      }

      return {
        id: viewportId,
        studyUID: state.selectedStudyUID,
        seriesUID: displaySetId || null, // Fallback mapping DisplaySet -> Series (usually 1:1)
        displaySetInstanceUID: displaySetId || null,
        currentImageIndex: 0,
        windowCenter,
        windowWidth,
        zoom: 1,
        pan: { x: 0, y: 0 },
        rotation: 0,
        flipH: false,
        flipV: false,
        invert: false,
        isPlaying: false,
        playbackSpeed: 10,
        ...assignment.initialOptions
      } as ViewportState;
    });

    return {
      layout,
      viewports: newViewports,
      activeViewportId: 'viewport-0',
      maximizedViewportId: null
    };
  }),

  setShowUploadScreen: (show) => set({ showUploadScreen: show }),

  setLoading: (loading) => set({ isLoading: loading }),

  setUploadProgress: (progress) => set({ uploadProgress: progress }),

  toggleLeftPanel: () => set((state) => ({ leftPanelOpen: !state.leftPanelOpen })),

  toggleRightPanel: () => set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),

  addMeasurement: (measurement) => set((state) => {
    const exists = state.measurements.find(m => m.id === measurement.id);
    if (exists) {
      return {
        measurements: state.measurements.map(m => m.id === measurement.id ? measurement : m)
      };
    }
    return {
      measurements: [...state.measurements, measurement],
    };
  }),

  removeMeasurement: (id) => set((state) => ({
    measurements: state.measurements.filter(m => m.id !== id),
  })),

  setMeasurements: (measurements) => set({ measurements }),

  resetViewport: (id) => set((state) => ({
    viewports: state.viewports.map(v =>
      v.id === id
        ? { ...v, windowCenter: 40, windowWidth: 400, zoom: 1, pan: { x: 0, y: 0 }, rotation: 0, flipH: false, flipV: false, invert: false }
        : v
    ),
  })),

  clearAll: () => set({
    studies: [],
    selectedStudyUID: null,
    selectedSeriesUID: null,
    viewports: createInitialViewports({ rows: 1, cols: 1 }),
    activeViewportId: 'viewport-0',
    layout: { rows: 1, cols: 1 },
    measurements: [],
    showUploadScreen: true,
  }),
}));
