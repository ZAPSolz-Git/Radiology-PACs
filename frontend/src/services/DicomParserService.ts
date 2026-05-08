// DICOM Parser Service - Real Implementation using dicom-parser
// FIXED: Async issues, memory management, and batch processing
import dicomParser from "dicom-parser";
import type { DicomInstance, DicomSeries, DicomStudy, ParseProgress, DicomTag } from "@/types/dicom";
import { registerDicomFile } from "./DicomImageLoaderService";

// DICOM Tag Dictionary (commonly used tags)
const DICOM_TAGS: Record<string, string> = {
  x00080005: "SpecificCharacterSet",
  x00080008: "ImageType",
  x00080016: "SOPClassUID",
  x00080018: "SOPInstanceUID",
  x00080020: "StudyDate",
  x00080021: "SeriesDate",
  x00080030: "StudyTime",
  x00080031: "SeriesTime",
  x00080050: "AccessionNumber",
  x00080060: "Modality",
  x00080070: "Manufacturer",
  x00080080: "InstitutionName",
  x00080090: "ReferringPhysicianName",
  x00081030: "StudyDescription",
  x0008103e: "SeriesDescription",
  x00100010: "PatientName",
  x00100020: "PatientID",
  x00100030: "PatientBirthDate",
  x00100040: "PatientSex",
  x00180050: "SliceThickness",
  x00180088: "SpacingBetweenSlices",
  x00181030: "ProtocolName",
  x0020000d: "StudyInstanceUID",
  x0020000e: "SeriesInstanceUID",
  x00200010: "StudyID",
  x00200011: "SeriesNumber",
  x00200012: "AcquisitionNumber",
  x00200013: "InstanceNumber",
  x00200032: "ImagePositionPatient",
  x00200037: "ImageOrientationPatient",
  x00200052: "FrameOfReferenceUID",
  x00201041: "SliceLocation",
  x00280002: "SamplesPerPixel",
  x00280004: "PhotometricInterpretation",
  x00280010: "Rows",
  x00280011: "Columns",
  x00280030: "PixelSpacing",
  x00280100: "BitsAllocated",
  x00280101: "BitsStored",
  x00280102: "HighBit",
  x00280103: "PixelRepresentation",
  x00281050: "WindowCenter",
  x00281051: "WindowWidth",
  x00281052: "RescaleIntercept",
  x00281053: "RescaleSlope",
  x7fe00010: "PixelData",
};

export class DicomParserService {
  private static generateImageId(studyUID: string, seriesUID: string, instanceUID: string): string {
    return `dicomlocal://${studyUID}/${seriesUID}/${instanceUID}`;
  }

  static getTagName(tag: string): string {
    return DICOM_TAGS[tag.toLowerCase()] || tag;
  }

  static parseNumberArray(value: string | undefined): number[] {
    if (!value) return [];
    return value
      .split("\\")
      .map((v) => parseFloat(v))
      .filter((n) => !isNaN(n));
  }

  static parseNumber(value: string | number | undefined, defaultValue: number = 0): number {
    if (value === undefined || value === null) return defaultValue;
    if (typeof value === "number") return value;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  static parseString(value: any, defaultValue: string = ""): string {
    if (value === undefined || value === null) return defaultValue;
    return String(value).trim();
  }

  static async parseFile(file: File): Promise<DicomInstance | null> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const byteArray = new Uint8Array(arrayBuffer);
      const dataSet = dicomParser.parseDicom(byteArray);

      const sopInstanceUID = dataSet.string("x00080018") || "";
      const sopClassUID = dataSet.string("x00080016") || "";
      const instanceNumber = this.parseNumber(dataSet.string("x00200013"), 1);
      const studyUID = dataSet.string("x0020000d") || "";
      const seriesUID = dataSet.string("x0020000e") || "";

      const rows = dataSet.uint16("x00280010") || 0;
      const columns = dataSet.uint16("x00280011") || 0;
      const bitsAllocated = dataSet.uint16("x00280100") || 16;
      const bitsStored = dataSet.uint16("x00280101") || 12;
      const highBit = dataSet.uint16("x00280102") || 11;
      const pixelRepresentation = dataSet.uint16("x00280103") || 0;
      const samplesPerPixel = dataSet.uint16("x00280002") || 1;
      const photometricInterpretation = dataSet.string("x00280004") || "MONOCHROME2";

      const rescaleSlope = this.parseNumber(dataSet.string("x00281053"), 1);
      const rescaleIntercept = this.parseNumber(dataSet.string("x00281052"), 0);

      const windowCenterStr = dataSet.string("x00281050");
      const windowWidthStr = dataSet.string("x00281051");
      const windowCenter = windowCenterStr ? this.parseNumberArray(windowCenterStr)[0] || 40 : 40;
      const windowWidth = windowWidthStr ? this.parseNumberArray(windowWidthStr)[0] || 400 : 400;

      const sliceThickness = this.parseNumber(dataSet.string("x00180050"), 1);
      const sliceLocation = this.parseNumber(dataSet.string("x00201041"), 0);

      const imagePositionStr = dataSet.string("x00200032");
      const imageOrientationStr = dataSet.string("x00200037");
      const pixelSpacingStr = dataSet.string("x00280030");

      const imagePositionPatient = imagePositionStr
        ? (this.parseNumberArray(imagePositionStr) as [number, number, number])
        : ([0, 0, 0] as [number, number, number]);

      const imageOrientationPatient = imageOrientationStr
        ? this.parseNumberArray(imageOrientationStr)
        : [1, 0, 0, 0, 1, 0];

      const pixelSpacing = pixelSpacingStr
        ? (this.parseNumberArray(pixelSpacingStr) as [number, number])
        : ([1, 1] as [number, number]);

      const frameOfReferenceUID = dataSet.string("x00200052") || "";

      // Extract pixel data
      const pixelDataElement = dataSet.elements.x7fe00010;
      let pixelData: ArrayBuffer | null = null;

      if (pixelDataElement) {
        const pixelDataOffset = pixelDataElement.dataOffset;
        const pixelDataLength = pixelDataElement.length;

        if (pixelDataLength === 4294967295) {
          // Compressed - Cornerstone will handle it
          console.log("[DicomParser] Compressed pixel data - Cornerstone will decode");
        } else if (pixelDataLength > 0) {
          pixelData = arrayBuffer.slice(pixelDataOffset, pixelDataOffset + pixelDataLength);
        }
      }

      // Register with Cornerstone for compressed file support
      let imageId: string;
      try {
        imageId = await registerDicomFile(sopInstanceUID, undefined, arrayBuffer);
      } catch (err) {
        console.warn("[DicomParser] Failed to register with Cornerstone, using fallback imageId:", err);
        imageId = this.generateImageId(studyUID, seriesUID, sopInstanceUID);
      }

      const instance: DicomInstance = {
        sopInstanceUID,
        sopClassUID,
        instanceNumber,
        imageId,
        rows,
        columns,
        pixelData,
        bitsAllocated,
        bitsStored,
        highBit,
        pixelRepresentation,
        samplesPerPixel,
        photometricInterpretation,
        rescaleSlope,
        rescaleIntercept,
        windowCenter,
        windowWidth,
        sliceThickness,
        sliceLocation,
        imagePositionPatient,
        imageOrientationPatient,
        pixelSpacing,
        frameOfReferenceUID,
        studyUID,
        seriesUID,
        rawDataset: dataSet,
      };

      return instance;
    } catch (error) {
      console.error("[DicomParser] Error parsing DICOM file:", file.name, error);
      return null;
    }
  }

  /**
   * Lean parsing for faster indexing of large datasets
   */
  static async parseFileLean(file: File): Promise<DicomInstance | null> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const byteArray = new Uint8Array(arrayBuffer);
      const dataSet = dicomParser.parseDicom(byteArray);

      const sopInstanceUID = dataSet.string("x00080018") || "";
      const studyUID = dataSet.string("x0020000d") || "";
      const seriesUID = dataSet.string("x0020000e") || "";

      // Register with Cornerstone immediately to avoid double parsing later
      const imageId = await registerDicomFile(sopInstanceUID, undefined, arrayBuffer);

      return {
        sopInstanceUID,
        sopClassUID: dataSet.string("x00080016") || "",
        instanceNumber: this.parseNumber(dataSet.string("x00200013"), 1),
        imageId,
        rows: dataSet.uint16("x00280010") || 0,
        columns: dataSet.uint16("x00280011") || 0,
        bitsAllocated: dataSet.uint16("x00280100") || 16,
        bitsStored: dataSet.uint16("x00280101") || 12,
        highBit: dataSet.uint16("x00280102") || 11,
        pixelRepresentation: dataSet.uint16("x00280103") || 0,
        samplesPerPixel: dataSet.uint16("x00280002") || 1,
        photometricInterpretation: dataSet.string("x00280004") || "MONOCHROME2",
        rescaleSlope: this.parseNumber(dataSet.string("x00281053"), 1),
        rescaleIntercept: this.parseNumber(dataSet.string("x00281052"), 0),
        windowCenter: this.parseNumberArray(dataSet.string("x00281050") || "")[0] || 40,
        windowWidth: this.parseNumberArray(dataSet.string("x00281051") || "")[0] || 400,
        sliceThickness: this.parseNumber(dataSet.string("x00180050"), 1),
        sliceLocation: this.parseNumber(dataSet.string("x00201041"), 0),
        imagePositionPatient: (this.parseNumberArray(dataSet.string("x00200032") || "") as [number, number, number]) || [0, 0, 0],
        imageOrientationPatient: this.parseNumberArray(dataSet.string("x00200037") || "") || [1, 0, 0, 0, 1, 0],
        pixelSpacing: (this.parseNumberArray(dataSet.string("x00280030") || "") as [number, number]) || [1, 1],
        frameOfReferenceUID: dataSet.string("x00200052") || "",
        studyUID,
        seriesUID,
        // Include minimal parent metadata for lean grouping
        studyMetadata: this.extractStudyMetadata(dataSet),
        seriesMetadata: this.extractSeriesMetadata(dataSet),
        // Do NOT store pixelData or rawDataset here for large datasets
      };
    } catch (e) {
      return null;
    }
  }

  static extractStudyMetadata(dataSet: any): Partial<DicomStudy> {
    return {
      studyInstanceUID: dataSet.string("x0020000d") || "",
      studyDate: dataSet.string("x00080020") || "",
      studyTime: dataSet.string("x00080030") || "",
      studyDescription: dataSet.string("x00081030") || "",
      accessionNumber: dataSet.string("x00080050") || "",
      patientName: this.formatPatientName(dataSet.string("x00100010") || ""),
      patientID: dataSet.string("x00100020") || "",
      patientBirthDate: dataSet.string("x00100030") || "",
      patientSex: dataSet.string("x00100040") || "",
      institutionName: dataSet.string("x00080080") || "",
      referringPhysicianName: dataSet.string("x00080090") || "",
      modality: dataSet.string("x00080060") || "",
    };
  }

  static extractSeriesMetadata(dataSet: any): Partial<DicomSeries> {
    return {
      seriesInstanceUID: dataSet.string("x0020000e") || "",
      seriesDescription: dataSet.string("x0008103e") || "",
      seriesNumber: this.parseNumber(dataSet.string("x00200011"), 1),
      modality: dataSet.string("x00080060") || "",
      frameOfReferenceUID: dataSet.string("x00200052") || "",
    };
  }

  static formatPatientName(name: string): string {
    if (!name) return "Unknown";
    return name.replace(/\^/g, ", ").replace(/\s+/g, " ").trim();
  }

  static formatDate(dateStr: string): string {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  }

  static formatTime(timeStr: string): string {
    if (!timeStr || timeStr.length < 6) return timeStr;
    return `${timeStr.slice(0, 2)}:${timeStr.slice(2, 4)}:${timeStr.slice(4, 6)}`;
  }

  static getAllTags(dataSet: any): DicomTag[] {
    const tags: DicomTag[] = [];

    for (const propertyName in dataSet.elements) {
      const element = dataSet.elements[propertyName];
      const tag = propertyName;
      const name = this.getTagName(tag);

      let value: any;
      try {
        if (element.vr === "OB" || element.vr === "OW" || element.vr === "OF" || element.vr === "UN") {
          value = `[Binary data: ${element.length} bytes]`;
        } else if (element.vr === "SQ") {
          value = "[Sequence]";
        } else {
          value = dataSet.string(tag) || "";
        }
      } catch {
        value = "[Unable to read]";
      }

      tags.push({
        tag: tag.replace("x", "").toUpperCase(),
        vr: element.vr || "",
        name,
        value,
        length: element.length,
      });
    }

    return tags.sort((a, b) => a.tag.localeCompare(b.tag));
  }

  static async parseFiles(files: File[], onProgress?: (progress: ParseProgress) => void): Promise<DicomStudy[]> {
    const studiesMap = new Map<string, DicomStudy>();
    const seriesMap = new Map<string, DicomSeries>();

    const dicomFiles = files.filter(
      (f) => f.name.toLowerCase().endsWith(".dcm") || f.name.toLowerCase().endsWith(".dicom") || !f.name.includes("."),
    );

    if (dicomFiles.length === 0) {
      onProgress?.({ total: 0, parsed: 0, currentFile: "", stage: "error", error: "No DICOM files found" });
      return [];
    }

    console.log(`[DicomParser] Processing ${dicomFiles.length} DICOM files`);

    // OPTIMIZED: Adaptive batch size based on total file count
    // Larger datasets use larger batches to reduce the overhead of many setTimeouts
    const BATCH_SIZE = dicomFiles.length > 1000 ? 50 : 20;
    let parsedCount = 0;

    for (let i = 0; i < dicomFiles.length; i += BATCH_SIZE) {
      const batch = dicomFiles.slice(i, Math.min(i + BATCH_SIZE, dicomFiles.length));

      // Process batch in parallel
      const batchPromises = batch.map(async (file, batchIdx) => {
        const fileIndex = i + batchIdx;
        onProgress?.({
          total: dicomFiles.length,
          parsed: fileIndex,
          currentFile: file.name,
          stage: "parsing",
        });

        // Use lean parsing for large datasets to save memory
        const instance = dicomFiles.length > 500
          ? await this.parseFileLean(file)
          : await this.parseFile(file);

        if (!instance) {
          console.warn(`[DicomParser] Failed to parse: ${file.name}`);
          return null;
        }

        const studyUID = instance.studyUID || (instance as any).studyUID || instance.rawDataset?.string("x0020000d") || "unknown";
        const seriesUID = instance.seriesUID || (instance as any).seriesUID || instance.rawDataset?.string("x0020000e") || "unknown";

        return { instance, studyUID, seriesUID };
      });

      const batchResults = await Promise.all(batchPromises);

      // Organize results into studies and series
      for (const result of batchResults) {
        if (!result) continue;

        const { instance, studyUID, seriesUID } = result;

        // Ensure we have rawDataset for metadata extraction if it was parsed lean
        const ds = instance.rawDataset;

        if (!studiesMap.has(studyUID)) {
          const studyMeta = ds ? this.extractStudyMetadata(ds) : ((instance as any).studyMetadata || { studyInstanceUID: studyUID });
          studiesMap.set(studyUID, {
            ...studyMeta,
            studyInstanceUID: studyUID,
            series: [],
          } as DicomStudy);
        }

        const seriesKey = `${studyUID}|${seriesUID}`;
        if (!seriesMap.has(seriesKey)) {
          const seriesMeta = ds ? this.extractSeriesMetadata(ds) : ((instance as any).seriesMetadata || { seriesInstanceUID: seriesUID });
          const newSeries: DicomSeries = {
            ...seriesMeta,
            seriesInstanceUID: seriesUID,
            instances: [],
            thumbnailDataUrl: null,
          } as DicomSeries;
          seriesMap.set(seriesKey, newSeries);
          studiesMap.get(studyUID)!.series.push(newSeries);
        }

        seriesMap.get(seriesKey)!.instances.push(instance);
        parsedCount++;

        // Generate thumbnail for series if not already set
        // Try to generate from the first few instances for better chance of success
        const seriesObj = seriesMap.get(seriesKey)!;
        if (!seriesObj.thumbnailDataUrl) {
          // Try current instance first
          if (instance.pixelData && instance.rows > 0 && instance.columns > 0) {
            try {
              seriesObj.thumbnailDataUrl = await this.generateThumbnail(instance);
              if (seriesObj.thumbnailDataUrl) {
                console.log(`[DicomParser] Generated thumbnail for series ${seriesUID}`);
              }
            } catch (err) {
              console.warn('[DicomParser] Thumbnail generation failed:', err);
            }
          } else {
            // For compressed images or missing pixel data, try using Cornerstone to load
            try {
              const imageLoader = await import('@cornerstonejs/core');
              const loadedImage = await imageLoader.imageLoader.loadAndCacheImage(instance.imageId);
              if (loadedImage) {
                seriesObj.thumbnailDataUrl = await this.generateThumbnailFromCornerstoneImage(loadedImage);
                if (seriesObj.thumbnailDataUrl) {
                  console.log(`[DicomParser] Generated thumbnail from Cornerstone for series ${seriesUID}`);
                }
              }
            } catch (err) {
              console.warn('[DicomParser] Cornerstone thumbnail generation failed:', err);
            }
          }
        }

        // CRITICAL: Memory Cleanup - remove rawDataset after extracting metadata
        // This is the single biggest memory saver for 2000+ images
        delete instance.rawDataset;
        delete (instance as any).pixelData;
      }

      // Update progress after batch
      onProgress?.({
        total: dicomFiles.length,
        parsed: Math.min(i + BATCH_SIZE, dicomFiles.length),
        currentFile: "",
        stage: "parsing",
      });

      // UI Yield
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    console.log(`[DicomParser] Successfully parsed ${parsedCount}/${dicomFiles.length} files`);

    for (const series of seriesMap.values()) {
      // Sort by instance number, then by slice location
      series.instances.sort((a, b) => {
        if (a.instanceNumber !== b.instanceNumber) {
          return a.instanceNumber - b.instanceNumber;
        }
        return a.sliceLocation - b.sliceLocation;
      });
    }

    onProgress?.({
      total: dicomFiles.length,
      parsed: parsedCount,
      currentFile: "",
      stage: "complete",
    });

    return Array.from(studiesMap.values());
  }

  static async generateThumbnail(instance: DicomInstance): Promise<string | null> {
    if (!instance.pixelData || instance.rows === 0 || instance.columns === 0) {
      return null;
    }

    try {
      const canvas = document.createElement("canvas");
      const thumbnailSize = 128;
      canvas.width = thumbnailSize;
      canvas.height = thumbnailSize;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      const imageData = ctx.createImageData(instance.columns, instance.rows);
      const pixelData = new DataView(instance.pixelData);
      const bytesPerPixel = instance.bitsAllocated / 8;
      const totalPixels = instance.rows * instance.columns;

      let minValue = Infinity,
        maxValue = -Infinity;

      // Find min/max values
      for (let i = 0; i < totalPixels; i++) {
        let value: number;
        if (bytesPerPixel === 2) {
          value =
            instance.pixelRepresentation === 1 ? pixelData.getInt16(i * 2, true) : pixelData.getUint16(i * 2, true);
        } else {
          value = pixelData.getUint8(i);
        }
        value = value * instance.rescaleSlope + instance.rescaleIntercept;
        minValue = Math.min(minValue, value);
        maxValue = Math.max(maxValue, value);
      }

      const wc = typeof instance.windowCenter === "number" ? instance.windowCenter : (minValue + maxValue) / 2;
      const ww = typeof instance.windowWidth === "number" ? instance.windowWidth : maxValue - minValue;
      const low = wc - ww / 2;
      const high = wc + ww / 2;

      // Apply windowing and render
      for (let i = 0; i < totalPixels; i++) {
        let value: number;
        if (bytesPerPixel === 2) {
          value =
            instance.pixelRepresentation === 1 ? pixelData.getInt16(i * 2, true) : pixelData.getUint16(i * 2, true);
        } else {
          value = pixelData.getUint8(i);
        }
        value = value * instance.rescaleSlope + instance.rescaleIntercept;

        let gray = value <= low ? 0 : value >= high ? 255 : Math.round(((value - low) / (high - low)) * 255);
        if (instance.photometricInterpretation === "MONOCHROME1") {
          gray = 255 - gray;
        }

        const idx = i * 4;
        imageData.data[idx] = imageData.data[idx + 1] = imageData.data[idx + 2] = gray;
        imageData.data[idx + 3] = 255;
      }

      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = instance.columns;
      tempCanvas.height = instance.rows;
      const tempCtx = tempCanvas.getContext("2d");
      if (!tempCtx) return null;
      tempCtx.putImageData(imageData, 0, 0);

      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, thumbnailSize, thumbnailSize);
      const scale = Math.min(thumbnailSize / instance.columns, thumbnailSize / instance.rows);
      const scaledWidth = instance.columns * scale;
      const scaledHeight = instance.rows * scale;
      ctx.drawImage(
        tempCanvas,
        (thumbnailSize - scaledWidth) / 2,
        (thumbnailSize - scaledHeight) / 2,
        scaledWidth,
        scaledHeight,
      );

      return canvas.toDataURL("image/jpeg", 0.8);
    } catch (error) {
      console.error("[DicomParser] Error generating thumbnail:", error);
      return null;
    }
  }

  /**
   * Generate thumbnail from Cornerstone loaded image (for compressed DICOM)
   */
  static async generateThumbnailFromCornerstoneImage(image: any): Promise<string | null> {
    try {
      const canvas = document.createElement("canvas");
      const thumbnailSize = 128;
      canvas.width = thumbnailSize;
      canvas.height = thumbnailSize;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      const { width, height } = image;
      const pixelData = image.getPixelData();

      if (!pixelData || width === 0 || height === 0) {
        return null;
      }

      // Create image data for full-size image
      const imageData = ctx.createImageData(width, height);
      const totalPixels = width * height;

      // Find min/max for windowing
      let minValue = Infinity;
      let maxValue = -Infinity;
      for (let i = 0; i < totalPixels; i++) {
        const value = pixelData[i];
        minValue = Math.min(minValue, value);
        maxValue = Math.max(maxValue, value);
      }

      // Use image's VOI LUT if available, otherwise auto-window
      const wc = image.windowCenter || (minValue + maxValue) / 2;
      const ww = image.windowWidth || maxValue - minValue;
      const low = wc - ww / 2;
      const high = wc + ww / 2;

      // Apply windowing
      for (let i = 0; i < totalPixels; i++) {
        const value = pixelData[i];
        let gray = value <= low ? 0 : value >= high ? 255 : Math.round(((value - low) / (high - low)) * 255);

        // Check for MONOCHROME1
        if (image.photometricInterpretation === "MONOCHROME1") {
          gray = 255 - gray;
        }

        const idx = i * 4;
        imageData.data[idx] = imageData.data[idx + 1] = imageData.data[idx + 2] = gray;
        imageData.data[idx + 3] = 255;
      }

      // Create temporary full-size canvas
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext("2d");
      if (!tempCtx) return null;

      tempCtx.putImageData(imageData, 0, 0);

      // Scale down to thumbnail with aspect ratio
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, thumbnailSize, thumbnailSize);
      const scale = Math.min(thumbnailSize / width, thumbnailSize / height);
      const scaledWidth = width * scale;
      const scaledHeight = height * scale;
      ctx.drawImage(
        tempCanvas,
        (thumbnailSize - scaledWidth) / 2,
        (thumbnailSize - scaledHeight) / 2,
        scaledWidth,
        scaledHeight
      );

      return canvas.toDataURL("image/jpeg", 0.8);
    } catch (error) {
      console.error("[DicomParser] Error generating Cornerstone thumbnail:", error);
      return null;
    }
  }
}