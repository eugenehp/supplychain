/** Client-side helpers for SEC filing display and highlighting */

export function cleanExcerpt(excerpt) {
  if (!excerpt) return '';
  return excerpt.replace(/^…+/g, '').replace(/…+$/g, '').replace(/\s+/g, ' ').trim();
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

  const windows = hintOffset != null
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

/** Match RAG pipeline section ids to static filing section metadata. */
export function findSectionForRag(sectionList, sectionId) {
  if (!sectionId || !sectionList?.length) return null;

  const exact = sectionList.find((s) => s.id === sectionId);
  if (exact) return exact;

  const itemMatch = sectionId.match(/^(item_\d+[a-z]?)/i);
  if (itemMatch) {
    const itemId = itemMatch[1].toLowerCase();
    const byItem = sectionList.find((s) => s.id === itemId);
    if (byItem) return byItem;
  }

  return (
    sectionList.find((s) => sectionId.startsWith(`${s.id}_`) || sectionId.startsWith(s.id)) ?? null
  );
}

/**
 * RAG chunks store charStart relative to section text; filings use document-absolute offsets.
 * @param {object[]} sectionList
 * @param {string | null | undefined} sectionId
 * @param {number | null | undefined} offset
 */
export function documentOffsetForRagChunk(sectionList, sectionId, offset) {
  if (offset == null) {
    return findSectionForRag(sectionList, sectionId)?.charStart ?? null;
  }
  if (!sectionList?.length) return offset;

  const section = findSectionForRag(sectionList, sectionId);
  if (!section) return offset;

  const docStart = section.charStart ?? 0;
  const sectionLen = Math.max(0, (section.charEnd ?? docStart) - docStart);

  if (offset >= 0 && offset <= sectionLen && offset < docStart) {
    return docStart + offset;
  }
  return offset;
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

function markExcerptInDisplay(display, excerpt) {
  const core = cleanExcerpt(excerpt);
  if (!core || !display) return null;

  const probes = uniqueNonEmpty([
    core,
    core.length > 140 ? core.slice(30, 130) : null,
    core.length > 80 ? core.slice(0, 80) : null,
    core.length > 48 ? core.slice(0, 48) : null,
  ]);

  for (const probe of probes) {
    const idx = display.toLowerCase().indexOf(probe.toLowerCase());
    if (idx >= 0) {
      const markLen = Math.min(core.length, display.length - idx);
      return display.slice(idx, idx + Math.max(probe.length, Math.min(markLen, probe.length + 20)));
    }
  }
  return null;
}

function partsForRange(display, hlDisplay) {
  if (!hlDisplay) return [{ type: 'text', text: display }];
  const normalized = display.replace(/\s+/g, ' ').trim();
  const needle = hlDisplay.replace(/\s+/g, ' ').trim();
  const idx = normalized.toLowerCase().indexOf(needle.toLowerCase());
  if (idx >= 0) {
    return [
      { type: 'text', text: display.slice(0, idx) },
      { type: 'mark', text: display.slice(idx, idx + needle.length) },
      { type: 'text', text: display.slice(idx + needle.length) },
    ];
  }
  const anchor = needle.length > 50 ? needle.slice(15, 55) : needle.slice(0, 30);
  const idx2 = normalized.toLowerCase().indexOf(anchor.toLowerCase());
  if (idx2 >= 0) {
    const markEnd = Math.min(display.length, idx2 + needle.length);
    return [
      { type: 'text', text: display.slice(0, idx2) },
      { type: 'mark', text: display.slice(idx2, markEnd) },
      { type: 'text', text: display.slice(markEnd) },
    ];
  }
  return [{ type: 'text', text: display }];
}

/** Build display blocks for a section, with inline highlight marks when range overlaps */
export function buildSectionDisplay(section, fullText, highlightRange) {
  const hlKey = highlightRange ? `${highlightRange.start}:${highlightRange.end}` : 'none';
  const cacheKey = `${section.id ?? section.charStart}|${section.charEnd}|${hlKey}|${fullText.length}`;
  const hit = sectionDisplayCache.get(cacheKey);
  if (hit) return hit;

  const blocks = buildSectionDisplayUncached(section, fullText, highlightRange);
  sectionDisplayCache.set(cacheKey, blocks);
  if (sectionDisplayCache.size > 128) {
    const oldest = sectionDisplayCache.keys().next().value;
    if (oldest) sectionDisplayCache.delete(oldest);
  }
  return blocks;
}

/** @type {Map<string, object[]>} */
const sectionDisplayCache = new Map();

function buildSectionDisplayUncached(section, fullText, highlightRange) {
  const sectionBody = fullText.slice(section.charStart, section.charEnd);
  const { body, adjustment } = stripSectionHeader(sectionBody, section.header);

  const hlStartLocal = highlightRange
    ? Math.max(0, highlightRange.start - section.charStart - adjustment)
    : null;
  const hlEndLocal = highlightRange
    ? Math.min(body.length, highlightRange.end - section.charStart - adjustment)
    : null;

  const blocks = [];
  /** Skip expensive subheader scan on very large sections (e.g. ASML Item 8). */
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

  function addParagraphRange(start, end) {
    const raw = body.slice(start, end);
    const display = raw.replace(/\s+/g, ' ').trim();
    if (!display) return;

    let hlDisplay = null;
    if (hlStartLocal != null && hlEndLocal != null && hlEndLocal > start && hlStartLocal < end) {
      const oStart = Math.max(start, hlStartLocal);
      const oEnd = Math.min(end, hlEndLocal);
      hlDisplay = body.slice(oStart, oEnd).replace(/\s+/g, ' ').trim();
    }

    blocks.push({
      type: 'paragraph',
      parts: partsForRange(display, hlDisplay),
      hasHighlight: Boolean(hlDisplay),
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
      blocks.push({ type: 'subheader', text: m[1].trim(), parts: null, hasHighlight: false });
      last = m.index + m[0].length;
    }
    if (last < body.length) {
      for (const range of splitRawParagraphs(body.slice(last))) {
        addParagraphRange(last + range.start, last + range.end);
      }
    }
    return blocks.length ? blocks : [{ type: 'paragraph', parts: partsForRange(body.trim(), null), hasHighlight: false }];
  }

  for (const range of splitRawParagraphs(body)) {
    addParagraphRange(range.start, range.end);
  }
  return blocks.length ? blocks : [{ type: 'paragraph', parts: partsForRange(body.trim(), null), hasHighlight: false }];
}

/**
 * Apply highlight marks to precomputed display blocks (from display.json).
 * @param {Array<{ type: string, text?: string, gStart?: number, gEnd?: number }>} blocks
 * @param {{ start: number, end: number } | null} highlightRange
 * @param {{ excerpt?: string | null, vendor?: string | null }} [meta]
 */
export function applyHighlightToBlocks(blocks, highlightRange, meta = {}) {
  if (!blocks?.length) return [];

  const hlCore = meta.excerpt ? cleanExcerpt(meta.excerpt) : null;
  const vendorNeedle = meta.vendor?.split(',')[0]?.trim() ?? null;

  function excerptInBlock(blockText) {
    return markExcerptInDisplay(blockText, hlCore);
  }

  return blocks.map((block) => {
    if (block.type === 'subheader') {
      return { type: 'subheader', text: block.text, parts: null, hasHighlight: false };
    }

    let hlDisplay = null;
    if (highlightRange && block.gStart != null && block.gEnd != null) {
      const overlaps = highlightRange.end > block.gStart && highlightRange.start < block.gEnd;
      if (overlaps) {
        hlDisplay = excerptInBlock(block.text);
        if (!hlDisplay && vendorNeedle) {
          const idx = block.text.toLowerCase().indexOf(vendorNeedle.toLowerCase());
          if (idx >= 0) {
            hlDisplay = block.text.slice(idx, Math.min(block.text.length, idx + vendorNeedle.length + 80));
          }
        }
      }
    }

    if (!hlDisplay && hlCore) {
      hlDisplay = excerptInBlock(block.text);
    }

    if (!hlDisplay && vendorNeedle) {
      const idx = block.text.toLowerCase().indexOf(vendorNeedle.toLowerCase());
      if (idx >= 0) {
        hlDisplay = block.text.slice(idx, Math.min(block.text.length, idx + vendorNeedle.length + 80));
      }
    }

    return {
      type: 'paragraph',
      parts: partsForRange(block.text, hlDisplay),
      hasHighlight: Boolean(hlDisplay),
    };
  });
}

/** @deprecated use buildSectionDisplay */
export function formatSectionBlocks(text, header) {
  return buildSectionDisplay(
    { charStart: 0, charEnd: text.length, header },
    text,
    null,
  ).map((b) => (b.type === 'subheader' ? b : { ...b, text: b.parts?.map((p) => p.text).join('') ?? '' }));
}

/** @deprecated */
export function renderBlockHighlight() {
  return null;
}

export function highlightInText(text, query) {
  if (!query?.trim()) return [{ type: 'text', value: text }];
  const parts = [];
  const re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: 'text', value: text.slice(last, m.index) });
    parts.push({ type: 'mark', value: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) });
  return parts.length ? parts : [{ type: 'text', value: text }];
}
