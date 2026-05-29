/** Shared hybrid BM25 + semantic search (browser-only) */

import { rankEvidenceByBm25 } from './bm25.js';
import { rankEvidenceByEmbedding, mergeHybridResults } from './embeddings.js';
import { embedQuery } from './embed-query.js';
import { rankByExactMatch } from './exact-match.js';

function mapBm25Results(ranked) {
  return (ranked ?? []).map((r) => ({
    ...r.entry,
    _hybridScore: null,
    _bm25Score: r.score,
    _bm25Max: r.maxScore,
    _semanticScore: null,
  }));
}

export async function hybridSearch({
  query,
  items,
  bm25Index,
  embeddingMap,
  mode = 'hybrid',
  bm25Min = 0.1,
  semanticMin = 0.28,
  limit = 400,
  getText = null,
  embedQueryFn = embedQuery,
}) {
  if (!query?.trim() || !items?.length) return [];

  const textFor = getText ?? ((item) => {
    if (item.text) return item.text;
    return [item.excerpt, item.vendor, item.sectionHeader, item.ticker].filter(Boolean).join(' ');
  });

  if (mode === 'exact') {
    const ranked = rankByExactMatch(query, items, { getText: textFor, limit });
    return ranked.map((r) => ({
      ...r.entry,
      _hybridScore: null,
      _exactScore: r.score,
      _exactMax: r.maxScore,
      _bm25Score: null,
      _semanticScore: null,
    }));
  }

  const effectiveMode = mode === 'hybrid' && !embeddingMap?.size ? 'bm25' : mode;

  if (effectiveMode === 'bm25' && bm25Index?.N) {
    const ranked = rankEvidenceByBm25(bm25Index, query, items, { minScore: bm25Min, limit });
    return mapBm25Results(ranked);
  }

  if ((effectiveMode === 'semantic' || effectiveMode === 'hybrid') && embeddingMap?.size) {
    let queryVec = null;
    try {
      queryVec = await embedQueryFn(query);
    } catch {
      queryVec = null;
    }

    if (!queryVec) {
      if (bm25Index?.N) {
        const ranked = rankEvidenceByBm25(bm25Index, query, items, { minScore: bm25Min, limit });
        return mapBm25Results(ranked);
      }
      return [];
    }

    const semanticRanked = rankEvidenceByEmbedding(queryVec, items, embeddingMap, {
      minScore: semanticMin,
      limit,
    });

    if (effectiveMode === 'semantic') {
      return semanticRanked.map((r) => ({
        ...r.entry,
        _hybridScore: null,
        _semanticScore: r.score,
        _semanticMax: r.maxScore,
        _bm25Score: null,
      }));
    }

    const bm25Ranked = bm25Index?.N
      ? rankEvidenceByBm25(bm25Index, query, items, { minScore: bm25Min * 0.75, limit }) ?? []
      : [];
    const byId = new Map(items.map((e) => [e.id, e]));
    return mergeHybridResults(bm25Ranked, semanticRanked, byId, { limit });
  }

  if (bm25Index?.N) {
    const ranked = rankEvidenceByBm25(bm25Index, query, items, { minScore: bm25Min, limit });
    return mapBm25Results(ranked);
  }

  return [];
}
