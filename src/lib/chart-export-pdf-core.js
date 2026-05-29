/**
 * Build a PDF ArrayBuffer from a prepared SVG snapshot (no DOM access).
 */

import { CSS_PX_TO_PT } from './chart-export-layout.js';
import { drawPdfWatermark } from './watermark.ts';
import { drawPdfLogo, pdfHeaderTextX } from './pdf-logo.js';
import { PDF_FONT_FAMILY, registerPdfFonts } from './pdf-fonts.js';
import { SITE_GITHUB_URL, SITE_PRODUCT_NAME } from './site.js';

/**
 * @param {string} svgString
 * @returns {SVGSVGElement}
 */
function parseSvgElement(svgString) {
  const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml');
  const root = doc.documentElement;
  const err = doc.querySelector('parsererror');
  if (err || !(root instanceof SVGSVGElement)) throw new Error('Invalid export SVG');
  return root;
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {string} svgString
 * @param {{ x: number, y: number, width: number, height: number }} placement
 */
async function drawVectorChart(doc, svgString, placement) {
  const [{ svg2pdf }] = await Promise.all([import('svg2pdf.js')]);
  await svg2pdf(parseSvgElement(svgString), doc, {
    x: placement.x,
    y: placement.y,
    width: placement.width,
    height: placement.height,
  });
}

/**
 * @param {{ svg: string, width: number, height: number, background: string, scale: number }} payload
 */
async function rasterizeSvg(payload) {
  const { svg, width, height, background, scale } = payload;
  const pixelW = Math.max(1, Math.round(width * scale));
  const pixelH = Math.max(1, Math.round(height * scale));

  /** @type {OffscreenCanvas | HTMLCanvasElement} */
  const canvas = (() => {
    const c = document.createElement('canvas');
    c.width = pixelW;
    c.height = pixelH;
    return c;
  })();

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  if (background && background !== 'transparent') {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, pixelW, pixelH);
  }

  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Could not decode export SVG'));
      img.src = url;
    });
    ctx.drawImage(img, 0, 0, pixelW, pixelH);
  } finally {
    URL.revokeObjectURL(url);
  }

  const pngBlob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encode failed'))), 'image/png');
  });

  return pngBlob.arrayBuffer();
}

/**
 * @param {ArrayBuffer} buffer
 */
function arrayBufferToPngDataUrl(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return `data:image/png;base64,${btoa(binary)}`;
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {{ margin: number, title: string, viewLabel: string }} header
 */
async function drawPdfPageHeader(doc, header) {
  const { margin, title, viewLabel } = header;
  const textX = pdfHeaderTextX(margin);

  try {
    await drawPdfLogo(doc, { x: margin, y: margin - 2 });
  } catch {
    /* logo optional — title still renders */
  }

  doc.setFont(PDF_FONT_FAMILY, '500normal');
  doc.setFontSize(15);
  doc.setTextColor(26, 31, 46);
  doc.text(title, textX, margin + 4);

  doc.setFont(PDF_FONT_FAMILY, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(92, 101, 120);
  doc.text(`${viewLabel} · ${new Date().toLocaleDateString()}`, textX, margin + 22);
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {{ margin: number, pageH: number }} layout
 */
function drawPdfPageFooter(doc, layout) {
  const { margin, pageH } = layout;
  const y = pageH - margin + 8;
  const color = [136, 146, 164];
  const prefix = 'Generated from ';
  const suffix = ' · SEC-grounded vendor map';

  doc.setFont(PDF_FONT_FAMILY, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(color[0], color[1], color[2]);

  const prefixW = doc.getTextWidth(prefix);
  const linkW = doc.getTextWidth(SITE_PRODUCT_NAME);
  let x = margin;

  doc.text(prefix, x, y);
  x += prefixW;

  if (typeof doc.textWithLink === 'function') {
    doc.textWithLink(SITE_PRODUCT_NAME, x, y, { url: SITE_GITHUB_URL });
  } else {
    doc.text(SITE_PRODUCT_NAME, x, y);
  }

  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(0.35);
  doc.line(x, y + 1.25, x + linkW, y + 1.25);

  doc.text(suffix, x + linkW, y);
}

/**
 * @param {{
 *   svg: string,
 *   width: number,
 *   height: number,
 *   title: string,
 *   viewLabel: string,
 *   watermark?: { main?: string, sub?: string, topRight?: string, bottomRight?: string },
 * }} input
 * @returns {Promise<ArrayBuffer>}
 */
export async function buildPdfVectorBuffer(input) {
  const { jsPDF } = await import('jspdf');
  const { svg, width: logicalWidth, height: logicalHeight, title, viewLabel, watermark = {} } = input;

  const landscape = logicalWidth / logicalHeight > 1.15;
  const doc = new jsPDF({
    orientation: landscape ? 'landscape' : 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  await registerPdfFonts(doc);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 44;
  const headerH = 52;
  const footerH = 20;

  await drawPdfPageHeader(doc, { margin, title, viewLabel });

  const nativeWPt = logicalWidth * CSS_PX_TO_PT;
  const nativeHPt = logicalHeight * CSS_PX_TO_PT;
  const availW = pageW - margin * 2;
  const availH = pageH - margin * 2 - headerH - footerH;
  const fitScale = Math.min(availW / nativeWPt, availH / nativeHPt);
  const drawW = nativeWPt * fitScale;
  const drawH = nativeHPt * fitScale;
  const x = margin + (availW - drawW) / 2;
  const y = margin + headerH + (availH - drawH) / 2;

  await drawVectorChart(doc, svg, { x, y, width: drawW, height: drawH });

  drawPdfWatermark(doc, pageW, pageH, watermark);

  drawPdfPageFooter(doc, { margin, pageH });

  return doc.output('arraybuffer');
}

/**
 * Main-thread PDF build with raster fallback (uses DOM Image when vector fails).
 * @param {Parameters<typeof buildPdfVectorBuffer>[0]} input
 */
export async function buildPdfArrayBuffer(input) {
  try {
    return await buildPdfVectorBuffer(input);
  } catch (vectorErr) {
    const { jsPDF } = await import('jspdf');
    const { svg, width: logicalWidth, height: logicalHeight, title, viewLabel, watermark = {} } = input;

    const landscape = logicalWidth / logicalHeight > 1.15;
    const doc = new jsPDF({
      orientation: landscape ? 'landscape' : 'portrait',
      unit: 'pt',
      format: 'a4',
    });

    await registerPdfFonts(doc);

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 44;
    const headerH = 52;
    const footerH = 20;

    await drawPdfPageHeader(doc, { margin, title, viewLabel });

    const nativeWPt = logicalWidth * CSS_PX_TO_PT;
    const nativeHPt = logicalHeight * CSS_PX_TO_PT;
    const availW = pageW - margin * 2;
    const availH = pageH - margin * 2 - headerH - footerH;
    const fitScale = Math.min(availW / nativeWPt, availH / nativeHPt);
    const drawW = nativeWPt * fitScale;
    const drawH = nativeHPt * fitScale;
    const x = margin + (availW - drawW) / 2;
    const y = margin + headerH + (availH - drawH) / 2;
    const placement = { x, y, width: drawW, height: drawH };

    try {
      const raster = await rasterizeSvg({
        svg,
        width: logicalWidth,
        height: logicalHeight,
        background: 'transparent',
        scale: Math.min(3, Math.max(2, globalThis.devicePixelRatio || 2)),
      });
      const imgData = arrayBufferToPngDataUrl(raster);
      doc.addImage(imgData, 'PNG', placement.x, placement.y, placement.width, placement.height, undefined, 'FAST');
    } catch (rasterErr) {
      const vMsg = vectorErr instanceof Error ? vectorErr.message : String(vectorErr);
      const rMsg = rasterErr instanceof Error ? rasterErr.message : String(rasterErr);
      throw new Error(`PDF export failed (vector: ${vMsg}; raster: ${rMsg})`);
    }

    drawPdfWatermark(doc, pageW, pageH, watermark);

    drawPdfPageFooter(doc, { margin, pageH });

    return doc.output('arraybuffer');
  }
}
