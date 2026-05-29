import { createWorkerBridge } from './worker-bridge.js';
import { buildPdfArrayBuffer } from './chart-export-pdf-core.js';
import { preloadPdfFonts } from './pdf-fonts.js';
import PdfExportWorker from './workers/pdf-export.worker.js?worker';

/** @type {ReturnType<typeof createWorkerBridge> | null} */
let bridge = null;
/** @type {Promise<void> | null} */
let fontPreloadPromise = null;

function getBridge() {
  if (typeof Worker === 'undefined') return null;
  if (!bridge) bridge = createWorkerBridge(PdfExportWorker);
  return bridge;
}

/** Preload PDF fonts in a background worker (parallel with UI). */
export function preloadPdfFontsInWorker() {
  const b = getBridge();
  if (!b) {
    fontPreloadPromise ??= preloadPdfFonts().then(() => {});
    return fontPreloadPromise;
  }
  fontPreloadPromise ??= b.call('preload-fonts').then(() => {});
  return fontPreloadPromise;
}

/**
 * @param {Parameters<typeof buildPdfArrayBuffer>[0]} payload
 * @returns {Promise<ArrayBuffer>}
 */
export async function buildPdfInWorker(payload) {
  await preloadPdfFontsInWorker();

  const b = getBridge();
  if (b) {
    try {
      return /** @type {Promise<ArrayBuffer>} */ (await b.call('build-pdf', payload));
    } catch {
      /* fall through to main thread with raster fallback */
    }
  }

  return buildPdfArrayBuffer(payload);
}

export function isPdfWorkerAvailable() {
  return typeof Worker !== 'undefined';
}
