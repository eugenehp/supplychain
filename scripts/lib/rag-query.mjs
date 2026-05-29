import { searchDocuments, searchVendors, getAllVendors, searchEvidence, searchEvidenceSemantic } from './rag-store.mjs';
import { SUPPLY_CHAIN_QUERIES } from './semi-vendors.mjs';
import { extractEntities } from './filing-processor.mjs';
import { embedText } from './embeddings.mjs';

function reciprocalRankFusion(lists, { k = 60, limit = 50 } = {}) {
  const scores = new Map();
  for (const list of lists) {
    list.forEach((item, rank) => {
      const id = item.id;
      if (!id) return;
      scores.set(id, (scores.get(id) ?? 0) + 1 / (k + rank + 1));
    });
  }
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, score]) => ({ id, score }));
}

export function queryEvidence(query, { limit = 50, ticker = null, vendor = null } = {}) {
  const results = searchEvidence(query, { limit, ticker, vendor });
  return {
    query,
    results,
    meta: { count: results.length, ranker: 'bm25' },
  };
}

export async function queryEvidenceHybrid(query, { limit = 50, ticker = null, vendor = null } = {}) {
  const bm25 = searchEvidence(query, { limit: limit * 2, ticker, vendor });
  const queryVec = await embedText(query);
  const semantic = searchEvidenceSemantic(queryVec, { limit: limit * 2, ticker, vendor });

  const byId = new Map();
  for (const r of [...bm25, ...semantic]) byId.set(r.id, r);

  const fused = reciprocalRankFusion([bm25, semantic], { limit });
  const results = fused.map(({ id, score }) => ({
    ...byId.get(id),
    hybridScore: score,
    bm25Score: bm25.find((r) => r.id === id)?.score ?? null,
    semanticScore: semantic.find((r) => r.id === id)?.score ?? null,
  }));

  return {
    query,
    results,
    meta: { count: results.length, ranker: 'hybrid-bm25-semantic' },
  };
}

export async function embedQueryText(query) {
  const vector = await embedText(query);
  return { model: 'Xenova/all-MiniLM-L6-v2', dim: vector.length, vector: [...vector] };
}

export function queryRag(query, options = {}) {
  const chunks = searchDocuments(query, options);
  const vendors = searchVendors(query, { limit: options.vendorLimit ?? 10 });

  const combinedText = chunks.map((c) => c.text ?? c.snippet ?? '').join('\n');
  const extracted = combinedText.length > 100 ? extractEntities(combinedText, { query }) : { vendors: [], relations: [], concentrations: [] };

  return {
    query,
    chunks,
    vendors,
    extracted: {
      vendors: extracted.vendors.slice(0, 15),
      relations: extracted.relations.slice(0, 10),
      concentrations: extracted.concentrations.slice(0, 10),
    },
    meta: { chunkCount: chunks.length, vendorCount: vendors.length },
  };
}

export function runSupplyChainQueries() {
  const results = {};
  for (const q of SUPPLY_CHAIN_QUERIES) {
    results[q] = queryRag(q, { limit: 6 });
  }
  return results;
}

export function findVendorsForProduct(productQuery = 'H200 GPU semiconductor suppliers') {
  const ragResults = queryRag(productQuery, { limit: 12 });
  const allVendors = getAllVendors();

  const seen = new Map();
  for (const v of [...ragResults.extracted.vendors, ...allVendors.map((v) => ({ name: v.name, count: v.mentionCount, snippets: v.snippets }))]) {
    const prev = seen.get(v.name) ?? { name: v.name, score: 0, snippets: [], evidence: [] };
    prev.score += v.count ?? v.mentionCount ?? 1;
    prev.snippets.push(...(v.snippets ?? []).slice(0, 2));
    seen.set(v.name, prev);
  }

  return {
    query: productQuery,
    vendors: [...seen.values()].sort((a, b) => b.score - a.score).slice(0, 40),
    ragChunks: ragResults.chunks,
    queryResults: runSupplyChainQueries(),
  };
}
