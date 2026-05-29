/**
 * PDF export: DOM snapshot on main thread, heavy PDF build in a web worker.
 */

import { captureChartExportSnapshot } from './chart-export-snapshot.js';
import { buildPdfInWorker, preloadPdfFontsInWorker } from './pdf-export-worker-client.js';

/** @param {string} name */
export function safeExportFilename(name) {
  return (
    name
      .replace(/[^a-z0-9-_]+/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'supply-chain-chart'
  );
}

/**
 * @param {HTMLElement | null | undefined} element Chart container as shown in the app
 * @param {{
 *   title: string,
 *   viewLabel: string,
 *   filename?: string,
 *   watermark?: { main?: string, sub?: string, topRight?: string, bottomRight?: string },
 * }} options
 */
export async function exportChartToPdf(element, options) {
  if (!element) throw new Error('Nothing to export — chart is not ready.');

  const { title, viewLabel, filename, watermark = {} } = options;

  const [snapshot] = await Promise.all([
    captureChartExportSnapshot(element),
    preloadPdfFontsInWorker(),
  ]);

  const { width, height, svg } = snapshot;

  const buffer = await buildPdfInWorker({
    svg,
    width,
    height,
    title,
    viewLabel,
    watermark,
  });

  const outName =
    filename ??
    `${safeExportFilename(title)}-${safeExportFilename(viewLabel)}-${new Date().toISOString().slice(0, 10)}.pdf`;

  const blob = new Blob([buffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = outName;
  link.click();
  URL.revokeObjectURL(url);
}

/** Preload PDF fonts in a background worker. */
export { preloadPdfFontsInWorker as preloadPdfFontsForExport };
