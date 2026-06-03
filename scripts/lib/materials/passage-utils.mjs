/** Locate an extracted excerpt inside source plain text (flexible whitespace). */

function collapseWhitespace(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * @param {string} fullText
 * @param {string} excerpt
 * @returns {{ start: number, end: number } | null}
 */
export function findExcerptInText(fullText, excerpt) {
  if (!fullText || !excerpt) return null;

  const core = collapseWhitespace(excerpt);
  if (core.length < 24) return null;

  for (const len of [140, 100, 70, 50, 36]) {
    const anchor = core.slice(0, Math.min(len, core.length));
    if (anchor.length < 24) continue;

    const direct = fullText.indexOf(anchor);
    if (direct >= 0) {
      return { start: direct, end: direct + anchor.length };
    }

    const pattern = anchor
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\s+/g, '\\s+');
    const re = new RegExp(pattern, 'i');
    const m = re.exec(fullText);
    if (m) {
      const start = m.index;
      const end = Math.min(fullText.length, start + core.length);
      return { start, end };
    }
  }

  return null;
}

/**
 * @param {string} fullText
 * @param {string} excerpt
 * @param {{ before?: number, after?: number }} [opts]
 */
export function extractPassage(fullText, excerpt, { before = 2400, after = 2400 } = {}) {
  const loc = findExcerptInText(fullText, excerpt);
  if (!loc) {
    return {
      passage: excerpt,
      charStart: 0,
      charEnd: excerpt.length,
      truncatedBefore: false,
      truncatedAfter: false,
    };
  }

  const start = Math.max(0, loc.start - before);
  const end = Math.min(fullText.length, loc.end + after);
  return {
    passage: fullText.slice(start, end),
    charStart: loc.start - start,
    charEnd: loc.end - start,
    truncatedBefore: start > 0,
    truncatedAfter: end < fullText.length,
  };
}

/**
 * @param {string} text
 * @param {{ text: string, charStart?: number, charEnd?: number }} ref
 */
export function enrichExcerptRef(text, ref) {
  if (!text || !ref?.text) return ref;
  if (ref.charStart != null && ref.charEnd != null) return ref;
  const loc = findExcerptInText(text, ref.text);
  if (!loc) return ref;
  return { ...ref, charStart: loc.start, charEnd: loc.end };
}
