/** Browser helpers for excerpt highlighting in materials source text. */

export function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

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
 * @param {number | null | undefined} charStart
 * @param {number | null | undefined} charEnd
 */
export function resolveExcerptRange(fullText, excerpt, charStart, charEnd) {
  if (charStart != null && charEnd != null && charEnd > charStart) {
    return { start: charStart, end: charEnd };
  }
  return findExcerptInText(fullText, excerpt);
}

/**
 * @param {string} fullText
 * @param {{ text: string, charStart?: number | null, charEnd?: number | null }} ref
 */
export function renderHighlightedSourceHtml(fullText, ref) {
  const text = String(fullText ?? '');
  const excerpt = ref?.text ?? '';
  if (!text) return `<p>${escapeHtml(excerpt)}</p>`;

  const range = resolveExcerptRange(text, excerpt, ref?.charStart, ref?.charEnd);
  if (!range) {
    return `<p class="whitespace-pre-wrap leading-relaxed">${escapeHtml(text)}</p>`;
  }

  const before = escapeHtml(text.slice(0, range.start));
  const mid = escapeHtml(text.slice(range.start, range.end));
  const after = escapeHtml(text.slice(range.end));

  return `<p class="whitespace-pre-wrap leading-relaxed">${before}<mark id="materials-excerpt-highlight" class="materials-excerpt-mark">${mid}</mark>${after}</p>`;
}
