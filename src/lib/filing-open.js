import { cleanExcerpt } from './filing-format.js';

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
