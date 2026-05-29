/**
 * Background PDF assembly: font preload + vector PDF build (svg2pdf/jsPDF).
 */

import { buildPdfVectorBuffer } from '../chart-export-pdf-core.js';
import { preloadPdfFonts } from '../pdf-fonts.js';

/** @param {{ id: number, type: string, payload?: unknown }} msg */
async function handleMessage(msg) {
  const { id, type, payload } = msg;
  try {
    let result;
    switch (type) {
      case 'preload-fonts':
        await preloadPdfFonts();
        result = { ready: true };
        break;
      case 'build-pdf':
        result = await buildPdfVectorBuffer(
          /** @type {Parameters<typeof buildPdfVectorBuffer>[0]} */ (payload),
        );
        break;
      default:
        throw new Error(`Unknown worker task: ${type}`);
    }
    /** @type {Transferable[]} */
    const transfer = result instanceof ArrayBuffer ? [result] : [];
    self.postMessage({ id, ok: true, result }, transfer);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    self.postMessage({ id, ok: false, error });
  }
}

self.onmessage = (event) => {
  void handleMessage(event.data);
};
