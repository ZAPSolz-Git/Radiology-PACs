// DICOM Data Types - Production Ready
export interface DicomInstance {
  sopInstanceUID: string;
  sopClassUID: string;
  instanceNumber: number;
  imageId: string;
  rows: number;
  columns: number;
  pixelData?: ArrayBuffer | null;
  bitsAllocated: number;
  bitsStored: number;
  highBit: number;
  pixelRepresentation: number;
  samplesPerPixel: number;
  photometricInterpretation: string;
  rescaleSlope: number;
  rescaleIntercept: number;
  windowCenter: number | number[];
  windowWidth: number | number[];
  sliceThickness: number;
  sliceLocation: number;
  imagePositionPatient: [number, number, number];
  imageOrientationPatient: number[];
  pixelSpacing: [number, number];
  frameOfReferenceUID: string;
  studyUID?: string;
  seriesUID?: string;
  studyMetadata?: Partial<DicomStudy>;
  seriesMetadata?: Partial<DicomSeries>;
  rawDataset?: any;
}

export interface DicomSeries {
  seriesInstanceUID: string;
  seriesDescription: string;
  seriesNumber: number;
  modality: string;
  instances: DicomInstance[];
  thumbnailDataUrl: string | null;
  frameOfReferenceUID: string;
}

export interface DicomStudy {
  studyInstanceUID: string;
  studyDate: string;
  studyTime: string;
  studyDescription: string;
  accessionNumber: string;
  patientName: string;
  patientID: string;
  patientBirthDate: string;
  patientSex: string;
  institutionName: string;
  referringPhysicianName: string;
  modality: string;
  series: DicomSeries[];
}

export interface ViewportState {
  id: string;
  studyUID: string | null;
  seriesUID: string | null;
  displaySetInstanceUID?: string | null;
  currentImageIndex: number;
  windowCenter: number;
  windowWidth: number;
  zoom: number;
  pan: { x: number; y: number };
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  invert: boolean;
  isPlaying: boolean;
  playbackSpeed: number;
  colormap?: string;
  viewportType?: import('@cornerstonejs/core').Enums.ViewportType;
}

export interface LayoutConfig {
  rows: number;
  cols: number;
}

export type ToolType =
  | 'WindowLevel'
  | 'Pan'
  | 'Zoom'
  | 'StackScroll'
  | 'Length'
  | 'Angle'
  | 'RectangleROI'
  | 'EllipticalROI'
  | 'Probe'
  | 'Bidirectional'
  | 'ArrowAnnotate'
  | 'Crosshairs'
  | 'Magnify'
  | 'PlanarRotate'
  | 'TrackballRotate';

export interface Measurement {
  id: string;
  toolType: ToolType;
  studyUID: string;
  seriesUID: string;
  instanceUID: string;
  imageIndex: number;
  data: MeasurementData;
  label: string;
  createdAt: Date;
  modifiedAt: Date;
}

export interface MeasurementData {
  handles: { x: number; y: number }[];
  value?: number;
  unit?: string;
  text?: string;
  stats?: {
    mean: number;
    stdDev: number;
    min: number;
    max: number;
    area: number;
    count: number;
  };
}

export interface ParseProgress {
  total: number;
  parsed: number;
  currentFile: string;
  stage: 'reading' | 'parsing' | 'indexing' | 'complete' | 'error';
  error?: string;
}

export interface DicomTag {
  tag: string;
  vr: string;
  name: string;
  value: any;
  length: number;
}
