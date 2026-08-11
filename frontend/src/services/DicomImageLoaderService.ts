// ============================================================
// DISABLED: Custom Cornerstone.js viewer is NOT in use.
// The project uses the external OHIF Viewer (port 3000) instead.
// To re-enable, uncomment the block below.
// NOTE: features/technician/services/DicomParserService.ts (case upload)
//       uses its own dicom-parser directly — it does NOT depend on this file.
// ============================================================

/*
import dicomParser from 'dicom-parser';
import { cache, imageLoader, metaData } from '@cornerstonejs/core';
import { PixelDataCache } from './PixelDataCache';
import axios from 'axios';

const registeredFiles = new Map<string, { blobUrl: string; arrayBuffer: ArrayBuffer }>();
const metadataCache = new Map<string, any>();
let metadataProviderRegistered = false;

function ensureMetadataProvider() {
  if (metadataProviderRegistered) return;

  metaData.addProvider((type: string, imageId: string) => {
    if (!imageId.startsWith('wadouri:')) return;
    const cached = metadataCache.get(imageId);
    if (!cached) return;
    return cached[type];
  }, 10000);

  // [NEW] Cleanup old pixel data from IDB on startup
  PixelDataCache.clearOld().catch(e => console.warn('[PixelDataCache] Startup cleanup failed:', e));

  metadataProviderRegistered = true;
}

// Exported so StudyLoader can inject backend metadata
export function cacheMetadata(imageId: string, dataSet: any) {
  const isSimpleObject = !dataSet.string;

  const getString = (tag: string) => isSimpleObject ? dataSet[tag] : dataSet.string(tag);
  const getFloat = (tag: string) => {
    if (isSimpleObject) return dataSet[tag];
    const val = dataSet.string(tag);
    return val ? parseFloat(val) : undefined;
  };
  const getInt = (tag: string) => isSimpleObject ? dataSet[tag] : dataSet.uint16(tag);
  const getFloatArray = (tag: string) => {
    if (isSimpleObject) return dataSet[tag];
    const val = dataSet.string(tag);
    return val ? val.split('\\').map((v: string) => parseFloat(v)) : undefined;
  };

  const pixelSpacing = getFloatArray('x00280030') || [1, 1];

  metadataCache.set(imageId, {
    imagePlaneModule: {
      pixelSpacing,
      imagePositionPatient: getFloatArray('x00200032') || [0, 0, 0],
      imageOrientationPatient: getFloatArray('x00200037') || [1, 0, 0, 0, 1, 0],
      sliceThickness: getFloat('x00180050') || 1,
      sliceLocation: getFloat('x00201041'),
      columns: getInt('x00280011'),
      rows: getInt('x00280010'),
    },
    imagePixelModule: {
      samplesPerPixel: getInt('x00280002') || 1,
      photometricInterpretation: getString('x00280004') || 'MONOCHROME2',
      rows: getInt('x00280010'),
      columns: getInt('x00280011'),
      bitsAllocated: getInt('x00280100'),
      bitsStored: getInt('x00280101'),
      highBit: getInt('x00280102'),
      pixelRepresentation: getInt('x00280103'),
    },
    modalityLutModule: {
      rescaleIntercept: getFloat('x00281052') || 0,
      rescaleSlope: getFloat('x00281053') || 1,
    },
    voiLutModule: {
      windowCenter: getFloatArray('x00281050') || [40],
      windowWidth: getFloatArray('x00281051') || [400],
    },
    transferSyntax: getString('x00020010') || '1.2.840.10008.1.2',
  });
}

export function registerDicomFile(
  sopInstanceUID: string,
  _file?: File,
  arrayBuffer?: ArrayBuffer,
  remoteUrl?: string
): string {
  ensureMetadataProvider();

  const existing = registeredFiles.get(sopInstanceUID);
  if (existing) {
    return `wadouri:${existing.blobUrl}`;
  }

  if (remoteUrl) {
    const imageId = `wadouri:${remoteUrl}`;
    registeredFiles.set(sopInstanceUID, { blobUrl: remoteUrl, arrayBuffer: null as any });
    return imageId;
  }

  if (!arrayBuffer) {
    throw new Error('ArrayBuffer required');
  }

  const blob = new Blob([arrayBuffer], { type: 'application/dicom' });
  const blobUrl = URL.createObjectURL(blob);
  const imageId = `wadouri:${blobUrl}`;

  try {
    const byteArray = new Uint8Array(arrayBuffer);
    const dataSet = dicomParser.parseDicom(byteArray);
    cacheMetadata(imageId, dataSet);
    registeredFiles.set(sopInstanceUID, { blobUrl, arrayBuffer });
    return imageId;
  } catch (error) {
    URL.revokeObjectURL(blobUrl);
    throw error;
  }
}

export function getImageId(sopInstanceUID: string): string | null {
  const reg = registeredFiles.get(sopInstanceUID);
  return reg ? `wadouri:${reg.blobUrl}` : null;
}

export function isFileRegistered(sopInstanceUID: string): boolean {
  return registeredFiles.has(sopInstanceUID);
}

export async function loadAndCacheImage(imageId: string): Promise<any> {
  const csCore = await import('@cornerstonejs/core');
  const cached = csCore.cache.getImageLoadObject(imageId);
  if (cached) return cached;

  const sopInstanceUID = imageId.split('/').pop()?.split('?')[0];

  if (sopInstanceUID && imageId.startsWith('wadouri:') && !isFileRegistered(sopInstanceUID)) {
    const cachedBuffer = await PixelDataCache.get(sopInstanceUID);
    if (cachedBuffer) {
      console.log(`[DicomImageLoader] Persistent Cache HIT for ${sopInstanceUID}`);
      registerDicomFile(sopInstanceUID, undefined, cachedBuffer);
    }
  }

  const image = await csCore.imageLoader.loadAndCacheImage(imageId);

  const imgData = (image as any).data;
  if (sopInstanceUID && imageId.startsWith('wadouri:') && imgData?.byteArray?.buffer) {
    PixelDataCache.set(sopInstanceUID, imgData.byteArray.buffer);
  }

  return image;
}

export async function registerPersistentImageLoader() {
  const csCore = await import('@cornerstonejs/core');
  const csDicomLoader = await import('@cornerstonejs/dicom-image-loader');

  const auth = btoa('orthanc:orthanc');
  if (csDicomLoader.internal && (csDicomLoader.internal as any).setOptions) {
    (csDicomLoader.internal as any).setOptions({
      beforeSend: function (xhr: any) {
        xhr.setRequestHeader('Authorization', `Basic ${auth}`);
      }
    });
  }

  const loaders = [
    { scheme: 'wadouri:', original: csDicomLoader.wadouri.loadImage },
    { scheme: 'wadors:', original: csDicomLoader.wadors.loadImage }
  ];

  loaders.forEach(({ scheme, original }) => {
    if (!original) return;

    csCore.imageLoader.registerImageLoader(scheme, ((imageId: string, options: any) => {
      let cancelFn: any;

      return {
        promise: (async () => {
          let sopInstanceUID: string | undefined;
          if (imageId.startsWith('wadors:')) {
            const parts = imageId.split('/');
            sopInstanceUID = parts[parts.length - 3];
          } else {
            sopInstanceUID = imageId.split('/').pop()?.split('?')[0];
          }

          if (sopInstanceUID) {
            const cachedBuffer = await PixelDataCache.get(sopInstanceUID);
            if (cachedBuffer) {
              console.log(`[DicomImageLoader] Persistent Cache HIT: ${sopInstanceUID} (${scheme})`);
              const localImageId = registerDicomFile(sopInstanceUID, undefined, cachedBuffer);
              const loadObject = csDicomLoader.wadouri.loadImage(localImageId, options);
              cancelFn = loadObject.cancelFn;
              return loadObject.promise;
            }
          }

          console.log(`[DicomImageLoader] Network FETCH: ${scheme} ${imageId}`);
          const imageLoadObject = original(imageId, options);
          cancelFn = imageLoadObject.cancelFn;
          const image = await imageLoadObject.promise;

          const imgData = (image as any).data;
          if (imgData) {
            cacheMetadata(imageId, imgData);
          }

          if (sopInstanceUID && imgData?.byteArray?.buffer) {
            PixelDataCache.set(sopInstanceUID, imgData.byteArray.buffer);
          }

          return image;
        })(),
        cancelFn: () => cancelFn?.()
      };
    }) as any);
  });

  console.log('[DicomImageLoader] Global Persistent Cache Loaders registered (wadouri & wadors) ✓');
}
*/

export {}; // Keeps TypeScript happy — file intentionally empty
