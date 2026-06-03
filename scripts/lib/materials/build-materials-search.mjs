import { MATERIALS_INDUSTRIES } from './element-notes-data.mjs';
import { enrichExcerptRef } from './passage-utils.mjs';

/**
 * @param {object[]} filingRows
 * @param {Map<string, string>} textCache
 */
export function enrichFilingRowsWithExcerptRefs(filingRows, textCache) {
  for (const row of filingRows) {
    const text = textCache.get(row.id);
    if (!text) continue;

    for (const hit of Object.values(row.elementHits ?? {})) {
      hit.snippetRefs = (hit.snippets ?? []).map((snippet) =>
        enrichExcerptRef(text, { text: snippet }),
      );
    }

    row.generalSnippetRefs = (row.generalSnippets ?? []).map((snippet) =>
      enrichExcerptRef(text, { text: snippet }),
    );
  }
}

/**
 * @param {string | { text: string, charStart?: number, charEnd?: number }} snippet
 */
function snippetText(snippet) {
  return typeof snippet === 'string' ? snippet : snippet?.text ?? '';
}

/**
 * Build a lightweight search corpus from filing excerpts and element reference text.
 *
 * @param {object[]} filingRows
 * @param {object[]} elements
 */
export function buildMaterialsSearchIndex(filingRows, elements) {
  /** @type {object[]} */
  const chunks = [];
  let seq = 0;

  for (const row of filingRows) {
    const sourceType =
      row.sourceRegime === 'US-SEC'
        ? 'sec'
        : ['PUBLIC', 'EU'].includes(row.sourceRegime)
          ? 'report'
          : row.sourceRegime
            ? 'international'
            : 'other';

    for (const [symbol, hit] of Object.entries(row.elementHits ?? {})) {
      const refs = hit.snippetRefs?.length ? hit.snippetRefs : (hit.snippets ?? []).map((text) => ({ text }));
      for (const ref of refs) {
        chunks.push({
          id: `f:${seq++}`,
          text: ref.text,
          charStart: ref.charStart ?? null,
          charEnd: ref.charEnd ?? null,
          symbol,
          sourceId: row.id,
          ticker: row.ticker,
          company: row.companyName,
          sourceType,
          sourceRegime: row.sourceRegime ?? null,
          filingUrl: row.filingUrl ?? null,
          form: row.filing?.form ?? null,
          filingDate: row.filing?.filingDate ?? null,
        });
      }
    }
  }

  for (const el of elements) {
    const text = [
      el.name,
      el.symbol,
      ...(el.aliases ?? []),
      ...(el.uses ?? []),
      ...(el.industries ?? []),
      el.usesDetail,
      el.importance,
    ]
      .filter(Boolean)
      .join('. ');
    if (!text.trim()) continue;
    chunks.push({
      id: `ref:${el.symbol}`,
      text,
      charStart: null,
      charEnd: null,
      symbol: el.symbol,
      sourceId: null,
      ticker: null,
      company: 'Element reference',
      sourceType: 'reference',
      sourceRegime: null,
      filingUrl: null,
      form: null,
      filingDate: null,
    });
  }

  return {
    version: 2,
    generatedAt: new Date().toISOString(),
    chunkCount: chunks.length,
    industries: MATERIALS_INDUSTRIES,
    chunks,
  };
}

/**
 * @param {object | null} row
 * @param {number} [limit]
 */
export function reportExcerptsFromRow(row, limit = 8) {
  if (!row) {
    return { excerpts: [], elementMentions: [], mentionCount: 0 };
  }

  /** @type {{ symbol: string | null, text: string, charStart?: number, charEnd?: number, sourceId?: string }[]} */
  const excerpts = [];
  const elementMentions = Object.keys(row.elementHits ?? {});

  for (const [symbol, hit] of Object.entries(row.elementHits ?? {})) {
    const refs = hit.snippetRefs?.length ? hit.snippetRefs : (hit.snippets ?? []).map((text) => ({ text }));
    for (const ref of refs) {
      excerpts.push({
        symbol,
        text: ref.text,
        charStart: ref.charStart,
        charEnd: ref.charEnd,
        sourceId: row.id,
      });
      if (excerpts.length >= limit) break;
    }
    if (excerpts.length >= limit) break;
  }

  if (excerpts.length < limit) {
    const general = row.generalSnippetRefs?.length
      ? row.generalSnippetRefs
      : (row.generalSnippets ?? []).map((text) => ({ text }));
    for (const ref of general) {
      const text = snippetText(ref);
      if (excerpts.some((e) => e.text.slice(0, 80) === text.slice(0, 80))) continue;
      excerpts.push({
        symbol: null,
        text,
        charStart: ref.charStart,
        charEnd: ref.charEnd,
        sourceId: row.id,
      });
      if (excerpts.length >= limit) break;
    }
  }

  const mentionCount =
    elementMentions.reduce((n, sym) => n + (row.elementHits[sym]?.mentionCount ?? 0), 0) ||
    row.generalMentions ||
    excerpts.length;

  return {
    excerpts: excerpts.slice(0, limit),
    elementMentions,
    mentionCount,
  };
}
