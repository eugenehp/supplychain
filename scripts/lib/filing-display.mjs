/** Build-time filing display blocks and highlight resolution (mirrors src/lib/filing-format.js). */

export function cleanExcerpt(excerpt) {
  if (!excerpt) return '';
  return excerpt.replace(/^…+/g, '').replace(/…+$/g, '').replace(/\s+/g, ' ').trim();
}

function uniqueNonEmpty(arr) {
  const seen = new Set();
  const out = [];
  for (const s of arr) {
    if (!s || s.length < 20) continue;
    const key = s.slice(0, 60);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

function indexOfNormalizedRange(haystack, needle) {
  const normNeedle = needle.replace(/\s+/g, ' ').trim();
  if (normNeedle.length < 20) return null;

  const collapsed = haystack.replace(/\s+/g, ' ');
  const idx = collapsed.toLowerCase().indexOf(normNeedle.toLowerCase());
  if (idx >= 0) return mapCollapsedRange(haystack, idx, normNeedle.length);

  return null;
}

function mapCollapsedRange(raw, collapsedStart, collapsedLen) {
  let c = 0;
  let start = -1;
  let end = -1;
  for (let i = 0; i < raw.length; i++) {
    if (/\s/.test(raw[i])) {
      if (i > 0 && !/\s/.test(raw[i - 1])) c++;
      continue;
    }
    if (c === collapsedStart && start < 0) start = i;
    if (c === collapsedStart + collapsedLen) {
      end = i;
      break;
    }
    c++;
  }
  if (start < 0) return null;
  return { start, end: end > start ? end : Math.min(raw.length, start + collapsedLen + 60) };
}

export function findExcerptRange(text, excerpt, hintOffset = null) {
  const core = cleanExcerpt(excerpt);
  if (!core || !text) return null;

  const probes = uniqueNonEmpty([
    core,
    core.length > 140 ? core.slice(40, -40) : null,
    core.length > 80 ? core.slice(0, 80) : null,
    core.length > 80 ? core.slice(-80) : null,
  ]);

  const windows =
    hintOffset != null
      ? [[Math.max(0, hintOffset - 1200), Math.min(text.length, hintOffset + 1200)]]
      : [];
  windows.push([0, text.length]);

  for (const [winStart, winEnd] of windows) {
    for (const probe of probes) {
      const range = indexOfNormalizedRange(text.slice(winStart, winEnd), probe);
      if (range) {
        return { start: winStart + range.start, end: winStart + range.end };
      }
    }
  }

  if (hintOffset != null) return expandAroundOffset(text, hintOffset, 320);
  return null;
}

export function expandAroundOffset(text, offset, radius = 320) {
  const start = Math.max(0, offset - radius);
  const end = Math.min(text.length, offset + radius);
  return { start, end };
}

export function resolveHighlightRange(text, { offset, excerpt, vendor } = {}) {
  if (!text) return null;

  if (excerpt) {
    const fromExcerpt = findExcerptRange(text, excerpt, offset ?? undefined);
    if (fromExcerpt) return fromExcerpt;
  }

  if (vendor) {
    const searchStart = offset != null ? Math.max(0, offset - 800) : 0;
    const searchEnd = offset != null ? Math.min(text.length, offset + 800) : text.length;
    const window = text.slice(searchStart, searchEnd);
    const vendorNeedle = vendor.split(',')[0].trim();
    const vendorIdx = window.toLowerCase().indexOf(vendorNeedle.toLowerCase());
    if (vendorIdx >= 0) {
      return expandAroundOffset(text, searchStart + vendorIdx, 260);
    }
  }

  if (offset != null) return expandAroundOffset(text, offset, 320);
  return null;
}

function stripSectionHeader(body, header) {
  let stripped = body;
  let adjustment = 0;

  if (header) {
    const escaped = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const headerRe = new RegExp(`^\\s*${escaped}\\s*`, 'i');
    const m = stripped.match(headerRe);
    if (m) {
      adjustment += m[0].length;
      stripped = stripped.slice(m[0].length);
    }
  }

  const itemHeaderRe = /^(?:Item|ITEM)\s+\d+[A-Z]?\.?\s+[A-Za-z][^.]{0,120}\.?\s*/i;
  const itemMatch = stripped.match(itemHeaderRe);
  if (itemMatch) {
    adjustment += itemMatch[0].length;
    stripped = stripped.slice(itemMatch[0].length);
  }

  return { body: stripped, adjustment };
}

function splitRawParagraphs(body) {
  const ranges = [];
  const re = /[^.!?]+[.!?]+/g;
  let m;
  const sentences = [];
  while ((m = re.exec(body)) !== null) {
    sentences.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
  }

  if (!sentences.length) {
    const trimmed = body.trim();
    if (!trimmed) return [];
    const start = body.indexOf(trimmed);
    return [{ start, end: start + trimmed.length }];
  }

  let chunkStart = sentences[0].start;
  let chunkLen = 0;
  for (const s of sentences) {
    if (!chunkLen) chunkStart = s.start;
    chunkLen += s.text.length;
    if (chunkLen >= 900) {
      ranges.push({ start: chunkStart, end: s.end });
      chunkLen = 0;
    }
  }
  if (chunkLen > 0) {
    ranges.push({ start: chunkStart, end: sentences[sentences.length - 1].end });
  }
  return ranges;
}

/**
 * Precompute display blocks for a section (no inline highlight marks).
 * @returns {{ adjustment: number, blocks: Array<{ type: string, text: string, gStart?: number, gEnd?: number }> }}
 */
export function buildSectionBlocks(section, fullText) {
  const sectionBody = fullText.slice(section.charStart, section.charEnd);
  const { body, adjustment } = stripSectionHeader(sectionBody, section.header);
  const bodyBase = section.charStart + adjustment;

  const blocks = [];
  const fastPath = body.length > 100_000;

  const subheaderRe = /([A-Z][A-Z0-9\s\-–—&,\(\)\/\.\':]{10,90})(?=\s+[A-Z][a-z])/g;
  const subMatches = fastPath
    ? []
    : [...body.matchAll(subheaderRe)].filter((m) => {
        const t = m[1].trim();
        if (t.length < 12 || t.length > 90) return false;
        const upperRatio = (t.match(/[A-Z]/g)?.length ?? 0) / t.length;
        return upperRatio > 0.75 && t.split(/\s+/).length >= 2;
      });

  function addParagraphRange(localStart, localEnd) {
    const raw = body.slice(localStart, localEnd);
    const display = raw.replace(/\s+/g, ' ').trim();
    if (!display) return;

    blocks.push({
      type: 'paragraph',
      text: display,
      gStart: bodyBase + localStart,
      gEnd: bodyBase + localEnd,
    });
  }

  if (subMatches.length >= 2) {
    let last = 0;
    for (const m of subMatches) {
      if (m.index > last) {
        for (const range of splitRawParagraphs(body.slice(last, m.index))) {
          addParagraphRange(last + range.start, last + range.end);
        }
      }
      blocks.push({ type: 'subheader', text: m[1].trim() });
      last = m.index + m[0].length;
    }
    if (last < body.length) {
      for (const range of splitRawParagraphs(body.slice(last))) {
        addParagraphRange(last + range.start, last + range.end);
      }
    }
  } else {
    for (const range of splitRawParagraphs(body)) {
      addParagraphRange(range.start, range.end);
    }
  }

  if (!blocks.length) {
    const display = body.replace(/\s+/g, ' ').trim();
    if (display) {
      blocks.push({
        type: 'paragraph',
        text: display,
        gStart: bodyBase,
        gEnd: section.charEnd,
      });
    }
  }

  return { adjustment, blocks };
}

/**
 * @param {object[]} sections
 * @param {string} fullText
 */
export function buildFilingDisplay(sections, fullText) {
  /** @type {Record<string, { adjustment: number, blocks: object[] }>} */
  const sectionBlocks = {};
  let blockCount = 0;

  for (const section of sections) {
    const built = buildSectionBlocks(section, fullText);
    sectionBlocks[section.id] = built;
    blockCount += built.blocks.length;
  }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    blockCount,
    sectionBlocks,
  };
}

/** Attach precomputed highlight ranges to evidence entries. */
export function enrichEvidenceRanges(text, entries) {
  return entries.map((entry) => {
    const range = resolveHighlightRange(text, {
      offset: entry.charOffset ?? null,
      excerpt: entry.excerpt ?? null,
      vendor: entry.vendor ?? null,
    });
    if (!range) return entry;
    return { ...entry, range };
  });
}
