/**
 * Normalize SVG text layout for vector PDF (svg2pdf em/dy handling is inaccurate).
 */

/** @param {string | null | undefined} value @param {number} fallback */
function parseFontSizePx(value, fallback = 12) {
  if (!value) return fallback;
  const px = String(value).match(/^([\d.]+)px$/);
  if (px) return Number.parseFloat(px[1]);
  const n = Number.parseFloat(String(value));
  return Number.isFinite(n) ? n : fallback;
}

/** @param {string | null | undefined} value @param {number} fontSizePx */
function emToPx(value, fontSizePx) {
  if (!value) return 0;
  const em = String(value).match(/^([-\d.]+)em$/);
  if (em) return Number.parseFloat(em[1]) * fontSizePx;
  return parseFontSizePx(value, 0);
}

/** @param {SVGTextContentElement} node @param {SVGTextContentElement} [parentText] */
function fontSizeFor(node, parentText) {
  return parseFontSizePx(
    node.getAttribute('font-size') ?? parentText?.getAttribute('font-size'),
    parentText ? parseFontSizePx(parentText.getAttribute('font-size'), 12) : 12,
  );
}

/** @param {SVGTextContentElement} node */
function normalizeFontSizeAttr(node) {
  const px = fontSizeFor(node, node.parentElement instanceof SVGTextElement ? node.parentElement : undefined);
  node.setAttribute('font-size', String(px));
}

/** @param {SVGTextContentElement} node @param {number} fontSizePx */
function normalizeLetterSpacing(node, fontSizePx) {
  const raw = node.getAttribute('letter-spacing');
  if (!raw || raw === 'normal') return;
  if (raw.includes('em')) {
    node.setAttribute('letter-spacing', String(emToPx(raw, fontSizePx)));
  } else {
    node.setAttribute('letter-spacing', String(parseFontSizePx(raw, 0)));
  }
}

/** @param {SVGTextContentElement} from @param {SVGTextContentElement} to */
function copyTextPresentation(from, to) {
  for (const attr of [
    'fill',
    'font-size',
    'font-weight',
    'font-family',
    'font-style',
    'fill-opacity',
    'opacity',
    'class',
    'letter-spacing',
  ]) {
    const val = from.getAttribute(attr);
    if (val) to.setAttribute(attr, val);
  }
}

/** Alphabetic baseline y from measured ink box (svg2pdf default). */
function alphabeticYFromBBox(bb) {
  return bb.y + bb.height * 0.85;
}

/** @param {DOMRect} bb @param {string} textAnchor */
function anchorXFromBBox(bb, textAnchor) {
  if (textAnchor === 'middle') return bb.x + bb.width / 2;
  if (textAnchor === 'end') return bb.x + bb.width;
  return bb.x;
}

/** @param {{ bb: DOMRect | null }[]} measured */
function tspansVisuallyOverlap(measured) {
  for (let i = 1; i < measured.length; i++) {
    const prev = measured[i - 1].bb;
    const next = measured[i].bb;
    if (!prev || !next) continue;
    if (Math.abs(prev.y - next.y) < Math.min(prev.height, next.height) * 0.45) return true;
  }
  return false;
}

/**
 * Replace multi-tspan text with sibling text nodes (svg2pdf drops dy spacing).
 * @param {SVGTextElement} text
 */
function promoteTspansToTextNodes(text) {
  const tspans = [...text.querySelectorAll(':scope > tspan')];
  if (tspans.length < 2) return false;

  const parent = text.parentElement;
  if (!parent) return false;

  const transform = text.getAttribute('transform');
  const textAnchor = text.getAttribute('text-anchor') ?? 'start';
  const opacity = text.getAttribute('opacity');

  const measured = tspans.map((tspan) => {
    const fs = fontSizeFor(tspan, text);
    normalizeFontSizeAttr(tspan);
    normalizeLetterSpacing(tspan, fs);
    let bb = null;
    try {
      bb = tspan.getBBox();
    } catch {
      /* not painted */
    }
    return { tspan, fs, bb, dy: tspan.getAttribute('dy') };
  });

  const wrap = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  if (transform) wrap.setAttribute('transform', transform);
  if (opacity) wrap.setAttribute('opacity', opacity);
  parent.insertBefore(wrap, text);

  const useCumulativeDy = tspansVisuallyOverlap(measured);
  let cursorY = Number.parseFloat(text.getAttribute('y') ?? '0');
  if (!Number.isFinite(cursorY)) cursorY = 0;

  for (const { tspan, fs, bb, dy } of measured) {
    const newText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    copyTextPresentation(tspan, newText);
    newText.textContent = tspan.textContent ?? '';
    newText.setAttribute('text-anchor', textAnchor);
    newText.setAttribute('dominant-baseline', 'alphabetic');

    if (!useCumulativeDy && bb && (bb.width > 0 || bb.height > 0)) {
      newText.setAttribute('x', String(anchorXFromBBox(bb, textAnchor)));
      newText.setAttribute('y', String(alphabeticYFromBBox(bb)));
    } else {
      if (dy) cursorY += emToPx(dy, fs);
      newText.setAttribute('x', text.getAttribute('x') ?? '0');
      newText.setAttribute('y', String(cursorY + fs * 0.35));
    }

    wrap.appendChild(newText);
  }

  text.remove();
  return true;
}

/** @param {SVGTextElement} text */
function bakeSingleTextDy(text) {
  const dy = text.getAttribute('dy');
  if (!dy) return;
  const fs = fontSizeFor(text);
  const y0 = Number.parseFloat(text.getAttribute('y') ?? '0');
  if (!Number.isFinite(y0)) return;
  text.setAttribute('y', String(y0 + emToPx(dy, fs)));
  text.removeAttribute('dy');
}

/** @param {SVGTextElement} text */
function bakeCentralText(text) {
  const baseline = text.getAttribute('dominant-baseline');
  if (baseline !== 'central' && baseline !== 'middle') return false;

  try {
    const bb = text.getBBox();
    if (bb.width === 0 && bb.height === 0) return false;
    const textAnchor = text.getAttribute('text-anchor') ?? 'start';
    if (!text.hasAttribute('x')) text.setAttribute('x', String(anchorXFromBBox(bb, textAnchor)));
    text.setAttribute('y', String(alphabeticYFromBBox(bb)));
    text.setAttribute('dominant-baseline', 'alphabetic');
    return true;
  } catch {
    return false;
  }
}

/** @param {SVGTextElement} text */
function bakeTspanBlock(text) {
  const tspans = [...text.querySelectorAll(':scope > tspan')];
  if (!tspans.length) return;

  const measured = tspans.map((tspan) => {
    const fs = fontSizeFor(tspan, text);
    normalizeFontSizeAttr(tspan);
    normalizeLetterSpacing(tspan, fs);
    let bb = null;
    try {
      bb = tspan.getBBox();
    } catch {
      /* off-screen / not yet painted */
    }
    return { tspan, fs, bb, dy: tspan.getAttribute('dy') };
  });

  let cursorY = Number.parseFloat(text.getAttribute('y') ?? '0');
  if (!Number.isFinite(cursorY)) cursorY = 0;

  const useCumulativeDy = tspansVisuallyOverlap(measured);

  for (const { tspan, fs, bb, dy } of measured) {
    if (!useCumulativeDy && bb && (bb.width > 0 || bb.height > 0)) {
      const textAnchor = text.getAttribute('text-anchor') ?? 'start';
      tspan.setAttribute('x', String(anchorXFromBBox(bb, textAnchor)));
      tspan.setAttribute('y', String(alphabeticYFromBBox(bb)));
      tspan.setAttribute('dominant-baseline', 'alphabetic');
    } else if (dy) {
      cursorY += emToPx(dy, fs);
      tspan.setAttribute('y', String(cursorY + fs * 0.35));
      tspan.setAttribute('dominant-baseline', 'alphabetic');
    }

    tspan.removeAttribute('dy');
  }

  text.removeAttribute('dy');
  text.removeAttribute('dominant-baseline');
}

/** @param {SVGSVGElement} svg */
export function flattenSvgTextLayout(svg) {
  for (const text of [...svg.querySelectorAll('text')]) {
    if (!(text instanceof SVGTextElement)) continue;

    normalizeFontSizeAttr(text);
    const fs = fontSizeFor(text);
    normalizeLetterSpacing(text, fs);

    if (text.querySelector(':scope > tspan')) {
      if (!promoteTspansToTextNodes(text)) {
        bakeTspanBlock(text);
      }
      continue;
    }

    if (!bakeCentralText(text)) {
      bakeSingleTextDy(text);
    }
  }
}

/** Browser px → PDF pt at 96 CSS px/in. */
export const CSS_PX_TO_PT = 72 / 96;

/**
 * Logical chart size from SVG width/height (D3 coordinate space).
 * @param {SVGSVGElement} svg
 */
export function chartCoordinateSize(svg) {
  const w = Number.parseFloat(svg.getAttribute('width') ?? '');
  const h = Number.parseFloat(svg.getAttribute('height') ?? '');
  if (w > 0 && h > 0) return { width: w, height: h };

  const vb = svg.viewBox?.baseVal;
  if (vb?.width > 0 && vb?.height > 0) {
    return { width: vb.width, height: vb.height };
  }

  const rect = svg.getBoundingClientRect();
  return { width: Math.max(1, rect.width), height: Math.max(1, rect.height) };
}
