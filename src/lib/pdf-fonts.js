/** IBM Plex Sans registration for jsPDF + svg2pdf vector export. */

export const PDF_FONT_FAMILY = 'IBM Plex Sans';

/**
 * Only Regular + Medium — map heavier svg2pdf styles to Medium so PDF text
 * matches browser weight (Bold/SemiBold TTF render too heavy in jsPDF).
 * @type {ReadonlyArray<{ file: string, style: string }>}
 */
const FONT_ASSETS = [
  { file: 'IBMPlexSans-Regular.ttf', style: 'normal' },
  { file: 'IBMPlexSans-Medium.ttf', style: '500normal' },
  { file: 'IBMPlexSans-Medium.ttf', style: '600normal' },
  { file: 'IBMPlexSans-Medium.ttf', style: 'bold' },
];

/** @type {Map<string, string>} */
const base64Cache = new Map();

/** @type {Promise<void> | null} */
let preloadPromise = null;

/**
 * @param {string} fileName
 * @returns {Promise<string>}
 */
async function loadFontBase64(fileName) {
  const cached = base64Cache.get(fileName);
  if (cached) return cached;

  const res = await fetch(`/fonts/${fileName}`);
  if (!res.ok) throw new Error(`Could not load PDF font: ${fileName}`);
  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);
  base64Cache.set(fileName, base64);
  return base64;
}

/** Preload font binaries so export does not wait on four sequential fetches. */
export function preloadPdfFonts() {
  if (!preloadPromise) {
    preloadPromise = Promise.all(FONT_ASSETS.map(({ file }) => loadFontBase64(file))).then(() => {});
  }
  return preloadPromise;
}

/**
 * @param {import('jspdf').jsPDF} doc
 */
export async function registerPdfFonts(doc) {
  await preloadPdfFonts();

  for (const { file, style } of FONT_ASSETS) {
    const base64 = await loadFontBase64(file);
    doc.addFileToVFS(file, base64);
    doc.addFont(file, PDF_FONT_FAMILY, style);
  }
}

/**
 * Snap browser weights to the two faces we embed (400 → Regular, 500+ → Medium).
 * @param {string | number | null | undefined} weight
 * @returns {'400' | '500'}
 */
export function exportFontWeightAttr(weight) {
  const n = Number.parseInt(String(weight ?? '400'), 10);
  if (!Number.isFinite(n)) return weight === 'bold' ? '500' : '400';
  if (n >= 500) return '500';
  return '400';
}

/**
 * Map browser font-weight to jsPDF/svg2pdf style keys.
 * @param {string | number | null | undefined} weight
 * @param {string} style
 */
export function pdfFontStyleKey(weight, style = 'normal') {
  if (style === 'italic') return exportFontWeightAttr(weight) === '500' ? '500normal' : 'italic';
  return exportFontWeightAttr(weight) === '500' ? '500normal' : 'normal';
}
