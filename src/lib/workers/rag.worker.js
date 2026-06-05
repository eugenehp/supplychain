/**
 * Background RAG: index load, BM25, hybrid search, query embeddings (transformers).
 */

import { Bm25Index, tokenize, rankEvidenceByBm25 } from '../bm25.js';
import { loadEmbeddingIndex, rankEvidenceByEmbedding, mergeHybridResults } from '../embeddings.js';
import { rankByExactMatch } from '../exact-match.js';
import { hybridSearch } from '../hybrid-search.js';
import { fetchRagChunkEntries } from '../rag-chunks-loader.js';

/** @type {import('@xenova/transformers').Pipeline | null} */
let embedPipeline = null;
/** @type {Error | null} */
let embedLoadError = null;
/** Current model id loaded — clear pipeline on mismatch so namespace swaps reload. */
let loadedModelId = null;

/**
 * Query-time task prefixes for instruction-tuned embedding models. Models the
 * pipeline doesn't recognize fall back to no prefix and a 512-char cap.
 */
const MODEL_PROFILES = {
  'Xenova/all-MiniLM-L6-v2':            { queryPrefix: '', maxChars: 512 * 4 },
  'Xenova/nomic-embed-text-v1':         { queryPrefix: 'search_query: ', maxChars: 768 * 4 },
  'onnx-community/Qwen3-Embedding-0.6B-ONNX': {
    queryPrefix: 'Represent this query for searching relevant passages: ',
    maxChars: 1024 * 4,
  },
};

/** @type {{
 *   manifest: object,
 *   chunks: object[],
 *   chunksById: Map<string, object>,
 *   bm25: import('../bm25.js').Bm25Index,
 *   embeddingMap: Map<string, Float32Array>,
 *   embeddingsReady: boolean,
 *   vendors: object[],
 *   embeddingModel: string,
 * } | null} */
let indexState = null;

async function ensureEmbedPipeline(modelId) {
  const wantedModel = modelId ?? indexState?.embeddingModel ?? 'Xenova/all-MiniLM-L6-v2';
  // If a previous index loaded a different model, drop the pipeline.
  if (embedPipeline && loadedModelId && loadedModelId !== wantedModel) {
    embedPipeline = null;
    loadedModelId = null;
    embedLoadError = null;
  }
  if (embedLoadError) throw embedLoadError;
  if (embedPipeline) return embedPipeline;
  try {
    const { pipeline, env } = await import('@xenova/transformers');
    env.allowLocalModels = false;
    env.useBrowserCache = true;
    embedPipeline = await pipeline('feature-extraction', wantedModel);
    loadedModelId = wantedModel;
    return embedPipeline;
  } catch (err) {
    embedLoadError = err instanceof Error ? err : new Error(String(err));
    throw embedLoadError;
  }
}

/** @param {string} text */
async function embedQueryInWorker(text) {
  const pipe = await ensureEmbedPipeline();
  const profile = MODEL_PROFILES[loadedModelId] ?? MODEL_PROFILES['Xenova/all-MiniLM-L6-v2'];
  const input = (profile.queryPrefix + text).slice(0, profile.maxChars);
  const out = await pipe(input, { pooling: 'mean', normalize: true });
  return new Float32Array(out.data);
}

function buildChunkBm25Index(chunks) {
  const index = new Bm25Index();
  for (const chunk of chunks) {
    if (!chunk?.id || !chunk.text) continue;
    index.add(chunk.id, chunk.text);
  }
  index.finalize();
  return index;
}

async function loadIndex(payload = {}) {
  const ragRoot = typeof payload?.ragRoot === 'string' && payload.ragRoot ? payload.ragRoot : '/rag';
  const [manifestRes, vendorsRes] = await Promise.all([
    fetch(`${ragRoot}/manifest.json`),
    fetch(`${ragRoot}/vendors.json`),
  ]);

  if (!manifestRes.ok) {
    throw new Error(`RAG static index missing at ${ragRoot} — run the topic pipeline`);
  }

  const manifest = await manifestRes.json();
  const chunks = await fetchRagChunkEntries(manifest, { ragRoot });
  const vendorsData = vendorsRes.ok ? await vendorsRes.json() : { vendors: [] };
  const embeddingIndex = chunks[0]?.q
    ? loadEmbeddingIndex({ entries: chunks })
    : { map: new Map(), count: 0 };

  indexState = {
    manifest,
    chunks,
    chunksById: new Map(chunks.map((c) => [c.id, c])),
    bm25: buildChunkBm25Index(chunks),
    embeddingMap: embeddingIndex.map,
    embeddingsReady: embeddingIndex.count > 0,
    vendors: vendorsData.vendors ?? [],
    embeddingModel: manifest?.embeddingModel ?? 'Xenova/all-MiniLM-L6-v2',
  };

  return {
    manifest,
    embeddingsReady: indexState.embeddingsReady,
    embeddingModel: indexState.embeddingModel,
    chunkCount: chunks.length,
    vendorCount: indexState.vendors.length,
  };
}

function requireIndex() {
  if (!indexState) throw new Error('RAG index not loaded');
  return indexState;
}

/** @param {{ query: string, mode?: string, ticker?: string, limit?: number }} payload */
async function searchChunks(payload) {
  const index = requireIndex();
  const { query, mode = 'hybrid', ticker = '', limit = 12 } = payload;

  let items = index.chunks;
  if (ticker) items = items.filter((c) => c.ticker === ticker.toUpperCase());

  const ranked = await hybridSearch({
    query,
    items,
    bm25Index: index.bm25,
    embeddingMap: index.embeddingMap,
    mode: mode === 'exact' ? 'exact' : index.embeddingsReady ? mode : 'bm25',
    bm25Min: 0.12,
    semanticMin: 0.26,
    limit,
    embedQueryFn: embedQueryInWorker,
  });

  return ranked.map((row) => ({
    id: row.id,
    ticker: row.ticker,
    form: row.form,
    filingDate: row.filingDate,
    sectionId: row.sectionId,
    sectionHeader: row.sectionHeader,
    charStart: row.charStart ?? null,
    charEnd: row.charEnd ?? null,
    charOffset: row.charStart ?? row.charOffset ?? null,
    text: row.text,
    hybridScore: row._hybridScore,
    bm25Score: row._bm25Score,
    semanticScore: row._semanticScore,
    exactScore: row._exactScore,
  }));
}

/** @param {{ query: string, limit?: number }} payload */
function searchVendors(payload) {
  const index = requireIndex();
  const { query, limit = 15 } = payload;
  if (!query?.trim()) return index.vendors.slice(0, limit);

  const bm25 = new Bm25Index();
  for (const v of index.vendors) {
    const id = `${v.name}|${v.ticker}`;
    const text = [v.name, v.ticker, ...(v.snippets ?? [])].join(' ');
    bm25.add(id, text);
  }
  bm25.finalize();

  const ranked = rankEvidenceByBm25(
    bm25,
    query,
    index.vendors.map((v) => ({ id: `${v.name}|${v.ticker}`, ...v })),
    { minScore: 0.1, limit },
  );

  return (ranked ?? []).map((r) => ({
    name: r.entry.name,
    ticker: r.entry.ticker,
    mentionCount: r.entry.mentionCount ?? r.entry.count,
    snippets: r.entry.snippets ?? [],
    score: r.score,
  }));
}

/** @param {{ id: number, type: string, payload?: unknown }} msg */
async function handleMessage(msg) {
  const { id, type, payload } = msg;
  try {
    let result;
    switch (type) {
      case 'load-index':
        result = await loadIndex(payload);
        break;
      case 'search-chunks':
        result = await searchChunks(/** @type {Parameters<typeof searchChunks>[0]} */ (payload));
        break;
      case 'search-vendors':
        result = searchVendors(/** @type {Parameters<typeof searchVendors>[0]} */ (payload));
        break;
      case 'warm-embed':
        await ensureEmbedPipeline();
        result = { ready: true };
        break;
      default:
        throw new Error(`Unknown worker task: ${type}`);
    }
    self.postMessage({ id, ok: true, result });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    self.postMessage({ id, ok: false, error });
  }
}

self.onmessage = (event) => {
  void handleMessage(event.data);
};
