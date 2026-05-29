/**
 * Vector PDF export via svg2pdf (primary) with raster fallback.
 */

/**
 * @param {string} svgString
 * @returns {SVGSVGElement}
 */
function parseSvgElement(svgString) {
  const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml');
  const root = doc.documentElement;
  const err = doc.querySelector('parsererror');
  if (err || !(root instanceof SVGSVGElement)) {
    throw new Error('Invalid export SVG');
  }
  return root;
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {string} svgString
 * @param {{ x: number, y: number, width: number, height: number }} placement
 */
export async function drawVectorSvgToPdf(doc, svgString, placement) {
  const [{ svg2pdf }] = await Promise.all([import('svg2pdf.js')]);
  const svgEl = parseSvgElement(svgString);
  await svg2pdf(svgEl, doc, {
    x: placement.x,
    y: placement.y,
    width: placement.width,
    height: placement.height,
  });
}
