/**
 * PDF chart export watermark — layout, typography, and default copy.
 */

import { SITE_AUTHOR, SITE_AUTHOR_LINKEDIN, copyrightYear } from './site.js';

/** @typedef {{ main?: string, sub?: string, topRight?: string, bottomRight?: string, author?: string, authorUrl?: string, copyrightYear?: number }} WatermarkText */

/** Page margin in PDF points — matches chart-export-pdf-core header margin. */
const PAGE_MARGIN_PT = 44;

/** Default label copy when callers do not override. */
export const WATERMARK_DEFAULTS = /** @type {const} */ ({
  main: 'Supply Chain',
  sub: 'Confidential',
  topRight: 'Supply Chain Research',
});

/** Global render settings applied before drawing layers. */
export const WATERMARK_RENDER = /** @type {const} */ ({
  opacity: 0.14,
  cornerOpacity: 0.42,
  resetOpacity: 1,
});

/** Default PDF body font — must match {@link registerPdfFonts} in pdf-fonts.js. */
export const PDF_FONT_NAME = 'IBM Plex Sans';

/**
 * Center diagonal stamp (main + sub).
 * @typedef {typeof WATERMARK_LAYERS[number]} WatermarkLayer
 */
export const WATERMARK_LAYERS = /** @type {const} */ ([
  {
    field: 'main',
    fontFamily: PDF_FONT_NAME,
    fontStyle: '500normal',
    fontSize: 40,
    color: [160, 168, 184],
    position: {
      xScale: 0.5,
      yScale: 0.5,
      xOffset: 0,
      yOffset: -8,
    },
    rotation: 35,
    align: 'center',
  },
  {
    field: 'sub',
    fontFamily: PDF_FONT_NAME,
    fontStyle: 'normal',
    fontSize: 12,
    color: [180, 186, 198],
    position: {
      xScale: 0.5,
      yScale: 0.5,
      xOffset: 0,
      yOffset: 20,
    },
    rotation: 35,
    align: 'center',
  },
]);

/**
 * Corner stamp placeholders (top-right, bottom-right).
 * @typedef {typeof CORNER_WATERMARK_LAYERS[number]} CornerWatermarkLayer
 */
export const CORNER_WATERMARK_LAYERS = /** @type {const} */ ([
  {
    field: 'topRight',
    fontFamily: PDF_FONT_NAME,
    fontStyle: 'normal',
    fontSize: 9,
    color: [136, 146, 164],
    position: {
      xScale: 1,
      yScale: 0,
      xOffset: -PAGE_MARGIN_PT,
      yOffset: PAGE_MARGIN_PT,
    },
    rotation: 0,
    align: 'right',
  },
]);

/**
 * @param {string} [topicLabel]
 * @returns {WatermarkText}
 */
export function buildExportWatermark(topicLabel) {
  const date = new Date().toLocaleDateString();
  return {
    main: WATERMARK_DEFAULTS.main,
    sub: topicLabel ? `${topicLabel} · Confidential` : WATERMARK_DEFAULTS.sub,
    topRight: topicLabel ? `${topicLabel} · ${date}` : `${WATERMARK_DEFAULTS.topRight} · ${date}`,
    author: SITE_AUTHOR,
    authorUrl: SITE_AUTHOR_LINKEDIN,
    copyrightYear: copyrightYear(),
  };
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {typeof WATERMARK_LAYERS[number] | typeof CORNER_WATERMARK_LAYERS[number]} layer
 * @param {number} pageW
 * @param {number} pageH
 * @param {string} value
 */
function drawWatermarkLayer(doc, layer, pageW, pageH, value) {
  const { position } = layer;
  const x = pageW * position.xScale + position.xOffset;
  const y = pageH * position.yScale + position.yOffset;

  doc.setFont(layer.fontFamily, layer.fontStyle);
  doc.setFontSize(layer.fontSize);
  doc.setTextColor(layer.color[0], layer.color[1], layer.color[2]);
  doc.text(value, x, y, { align: layer.align, angle: layer.rotation });
}

/**
 * Bottom-right © year + author name (LinkedIn link on name).
 * @param {import('jspdf').jsPDF} doc
 * @param {number} pageW
 * @param {number} pageH
 * @param {WatermarkText} text
 */
function drawAuthorCredit(doc, pageW, pageH, text) {
  const author = text.author;
  const authorUrl = text.authorUrl;
  if (!author || !authorUrl) return;

  const year = text.copyrightYear ?? copyrightYear();
  const prefix = `© ${year} `;
  const xRight = pageW - PAGE_MARGIN_PT;
  const y = pageH - PAGE_MARGIN_PT;
  const color = [136, 146, 164];

  doc.setFont(PDF_FONT_NAME, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(color[0], color[1], color[2]);

  const prefixW = doc.getTextWidth(prefix);
  const authorW = doc.getTextWidth(author);
  const x = xRight - prefixW - authorW;

  doc.text(prefix, x, y);
  if (typeof doc.textWithLink === 'function') {
    doc.textWithLink(author, x + prefixW, y, { url: authorUrl });
  } else {
    doc.text(author, x + prefixW, y);
  }
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} pageW
 * @param {number} pageH
 * @param {WatermarkText} [text]
 */
export function drawPdfWatermark(doc, pageW, pageH, text = {}) {
  /** @type {Record<string, string>} */
  const copy = { ...WATERMARK_DEFAULTS, ...text };

  const gStateCtor = /** @type {typeof doc.GState | undefined} */ (doc.GState);

  const centerState =
    typeof gStateCtor === 'function' ? new gStateCtor({ opacity: WATERMARK_RENDER.opacity }) : null;
  if (centerState) doc.setGState(centerState);

  for (const layer of WATERMARK_LAYERS) {
    const value = copy[layer.field];
    if (!value) continue;
    drawWatermarkLayer(doc, layer, pageW, pageH, value);
  }

  if (centerState && typeof gStateCtor === 'function') {
    doc.setGState(new gStateCtor({ opacity: WATERMARK_RENDER.resetOpacity }));
  }

  const cornerState =
    typeof gStateCtor === 'function' ? new gStateCtor({ opacity: WATERMARK_RENDER.cornerOpacity }) : null;
  if (cornerState) doc.setGState(cornerState);

  for (const layer of CORNER_WATERMARK_LAYERS) {
    const value = copy[layer.field];
    if (!value) continue;
    drawWatermarkLayer(doc, layer, pageW, pageH, value);
  }

  drawAuthorCredit(doc, pageW, pageH, text);

  if (cornerState && typeof gStateCtor === 'function') {
    doc.setGState(new gStateCtor({ opacity: WATERMARK_RENDER.resetOpacity }));
  }
}
