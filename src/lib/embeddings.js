/** Client-side embedding search over precomputed vectors */

export const EMBEDDING_DIM = 384;

export function dequantizeVector(q) {
  const arr = q instanceof Int8Array ? q : Int8Array.from(q);
  const vec = new Float32Array(arr.length);
  for (let i = 0; i < arr.length; i++) vec[i] = arr[i] / 127;
  return vec;
}

export function cosineSimilarity(a, b) {
  let dot = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) dot += a[i] * b[i];
  return dot;
}

export function loadEmbeddingIndex(data) {
  const map = new Map();
  for (const entry of data.entries ?? []) {
    map.set(entry.id, dequantizeVector(entry.q));
  }
  return {
    model: data.model,
    dim: data.dim ?? EMBEDDING_DIM,
    map,
    count: map.size,
  };
}

export function rankEvidenceByEmbedding(queryVec, entries, embeddingMap, {
  minScore = 0.28,
  limit = 400,
} = {}) {
  const scored = entries
    .map((entry) => {
      const vec = embeddingMap.get(entry.id);
      if (!vec) return { entry, score: 0 };
      return { entry, score: cosineSimilarity(queryVec, vec) };
    })
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (!scored.length) return [];
  const maxScore = scored[0].score;
  return scored.map((r) => ({ ...r, maxScore }));
}

/** Reciprocal rank fusion — merges lexical + semantic ranked lists */
export function reciprocalRankFusion(lists, { k = 60, limit = 400 } = {}) {
  const scores = new Map();
  for (const list of lists) {
    list.forEach((item, rank) => {
      const id = item.id ?? item.entry?.id;
      if (!id) return;
      scores.set(id, (scores.get(id) ?? 0) + 1 / (k + rank + 1));
    });
  }
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, score]) => ({ id, score }));
}

export function mergeHybridResults(bm25Ranked, semanticRanked, entriesById, { limit = 400 } = {}) {
  const fused = reciprocalRankFusion(
    [
      bm25Ranked.map((r) => ({ id: r.entry.id })),
      semanticRanked.map((r) => ({ id: r.entry.id })),
    ],
    { limit },
  );

  const bm25ById = new Map(bm25Ranked.map((r) => [r.entry.id, r]));
  const semById = new Map(semanticRanked.map((r) => [r.entry.id, r]));
  const maxBm25 = bm25Ranked[0]?.score ?? 1;
  const maxSem = semanticRanked[0]?.score ?? 1;

  const maxHybrid = fused[0]?.score ?? 1;

  return fused.map(({ id, score }) => {
    const entry = entriesById.get(id);
    const bm = bm25ById.get(id);
    const sem = semById.get(id);
    return {
      ...entry,
      _hybridScore: score,
      _hybridMax: maxHybrid,
      _bm25Score: bm?.score ?? null,
      _bm25Max: bm?.maxScore ?? maxBm25,
      _semanticScore: sem?.score ?? null,
      _semanticMax: sem?.maxScore ?? maxSem,
    };
  });
}
