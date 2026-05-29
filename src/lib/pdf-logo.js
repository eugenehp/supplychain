import logoSvg from '../../static/favicon.svg?raw';

/** Logo size in PDF points — matches site header proportion. */
export const PDF_LOGO_SIZE_PT = 28;

/** Gap between logo and title text. */
export const PDF_LOGO_TEXT_GAP_PT = 10;

/**
 * @param {string} svgString
 * @returns {SVGSVGElement}
 */
function parseLogoSvg(svgString) {
  const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml');
  const root = doc.documentElement;
  const err = doc.querySelector('parsererror');
  if (err || !(root instanceof SVGSVGElement)) throw new Error('Invalid logo SVG');
  return root;
}

/**
 * Draw site logo (H200 favicon SVG) on a PDF page.
 * @param {import('jspdf').jsPDF} doc
 * @param {{ x: number, y: number, size?: number }} placement
 */
export async function drawPdfLogo(doc, { x, y, size = PDF_LOGO_SIZE_PT }) {
  const [{ svg2pdf }] = await Promise.all([import('svg2pdf.js')]);
  await svg2pdf(parseLogoSvg(logoSvg), doc, { x, y, width: size, height: size });
}

/**
 * Left inset for header text when a logo is shown at {@link margin}.
 * @param {number} margin
 */
export function pdfHeaderTextX(margin) {
  return margin + PDF_LOGO_SIZE_PT + PDF_LOGO_TEXT_GAP_PT;
}
