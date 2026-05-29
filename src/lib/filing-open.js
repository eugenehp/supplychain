import { cleanExcerpt, documentOffsetForRagChunk } from './filing-format.js';

/** Plain-text excerpt suitable for filing highlight resolution. */
export function excerptForHighlight(text, maxLen = 500) {
  if (!text) return null;
  const plain = String(text)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const core = cleanExcerpt(plain) || plain;
  if (!core) return null;
  return core.length > maxLen ? `${core.slice(0, maxLen - 1)}…` : core;
}

/**
 * Highlight props for FilingViewer from a RAG search chunk.
 * @param {object | null | undefined} chunk
 */
export function highlightFromRagChunk(chunk) {
  if (!chunk) {
    return { offset: null, excerpt: null, sectionId: null };
  }

  const text = chunk.text ?? '';
  return {
    offset: chunk.charOffset ?? chunk.charStart ?? null,
    excerpt: chunk.excerpt ?? excerptForHighlight(text, 600),
    sectionId: chunk.sectionId ?? null,
  };
}

export { documentOffsetForRagChunk };
