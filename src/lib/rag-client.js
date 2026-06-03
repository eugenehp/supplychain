/** Browser RAG index — worker-backed search with main-thread fallback */

import { Bm25Index, tokenize, rankEvidenceByBm25 } from './bm25.js';
import { loadEmbeddingIndex } from './embeddings.js';
import { hybridSearch } from './hybrid-search.js';
import { exactHighlightTerms } from './exact-match.js';
import { excerptForHighlight } from './filing-open.js';
import { fetchRagChunkEntries } from './rag-chunks-loader.js';
import {
  isRagWorkerAvailable,
  preloadRagIndex,
  searchChunksViaWorker,
  searchVendorsViaWorker,
  warmEmbeddingModel,
} from './rag-worker-client.js';

/** @type {Promise<object> | null} */
let mainThreadLoadPromise = null;

function buildChunkBm25Index(chunks) {
  const index = new Bm25Index();
  for (const chunk of chunks) {
    if (!chunk?.id || !chunk.text) continue;
    index.add(chunk.id, chunk.text);
  }
  index.finalize();
  return index;
}

function highlightPattern(term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (term.length <= 4 && /^[a-z0-9]+$/i.test(term)) {
    return `(?<![a-z0-9])(${escaped})(?![a-z0-9])`;
  }
  return `(${escaped})`;
}

export function highlightSnippet(text, query, radius = 220) {
  if (!text) return '';
  const terms = exactHighlightTerms(query).length ? exactHighlightTerms(query) : tokenize(query);
  let anchor = 0;
  for (const term of terms) {
    const re = new RegExp(highlightPattern(term), 'i');
    const match = re.exec(text);
    if (match) {
      anchor = match.index;
      break;
    }
  }
  const start = Math.max(0, anchor - 60);
  const end = Math.min(text.length, start + radius);
  let snippet = text.slice(start, end);
  for (const term of terms) {
    snippet = snippet.replace(new RegExp(highlightPattern(term), 'gi'), '<mark>$1</mark>');
  }
  return `${start > 0 ? '…' : ''}${snippet}${end < text.length ? '…' : ''}`;
}

async function loadRagIndexMainThread() {
  const [manifestRes, vendorsRes] = await Promise.all([
    fetch('/rag/manifest.json'),
    fetch('/rag/vendors.json'),
  ]);

  if (!manifestRes.ok) {
    throw new Error('RAG static index missing — run `npm run rag`');
  }

  const manifest = await manifestRes.json();
  const chunks = await fetchRagChunkEntries(manifest);
  const vendorsData = vendorsRes.ok ? await vendorsRes.json() : { vendors: [] };
  const embeddingIndex = chunks[0]?.q
    ? loadEmbeddingIndex({ entries: chunks })
    : { map: new Map(), count: 0 };

  return {
    manifest,
    chunks,
    chunksById: new Map(chunks.map((c) => [c.id, c])),
    bm25: buildChunkBm25Index(chunks),
    embeddingMap: embeddingIndex.map,
    embeddingsReady: embeddingIndex.count > 0,
    vendors: vendorsData.vendors ?? [],
    workerBacked: false,
  };
}

/** @type {Promise<object> | null} */
let loadPromise = null;
/** @type {Promise<unknown> | null} */
let embedWarmPromise = null;

function usesEmbeddings(mode) {
  return mode === 'semantic' || mode === 'hybrid';
}

async function ensureEmbeddingsWarm(mode) {
  if (!usesEmbeddings(mode)) return;
  if (embedWarmPromise) return embedWarmPromise;
  if (isRagWorkerAvailable()) {
    embedWarmPromise = warmEmbeddingModel();
    return embedWarmPromise;
  }
  embedWarmPromise = Promise.resolve();
  return embedWarmPromise;
}

export async function loadRagIndex() {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    if (isRagWorkerAvailable()) {
      try {
        const stats = await preloadRagIndex();
        return {
          manifest: stats.manifest,
          chunks: [],
          chunksById: new Map(),
          bm25: null,
          embeddingMap: new Map(),
          embeddingsReady: stats.embeddingsReady,
          vendors: [],
          workerBacked: true,
        };
      } catch {
        /* fallback */
      }
    }
    if (!mainThreadLoadPromise) mainThreadLoadPromise = loadRagIndexMainThread();
    return mainThreadLoadPromise;
  })();

  return loadPromise;
}

export async function searchChunks(query, {
  mode = 'hybrid',
  ticker = '',
  limit = 12,
} = {}) {
  const index = await loadRagIndex();
  await ensureEmbeddingsWarm(mode);

  if (index.workerBacked) {
    const ranked = await searchChunksViaWorker(query, { mode, ticker, limit });
    return ranked.map((row) => ({
      ...row,
      excerpt: row.excerpt ?? excerptForHighlight(row.text, 600),
      snippet: highlightSnippet(row.text, query),
    }));
  }

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
    excerpt: row.excerpt ?? excerptForHighlight(row.text, 600),
    text: row.text,
    snippet: highlightSnippet(row.text, query),
    hybridScore: row._hybridScore,
    bm25Score: row._bm25Score,
    semanticScore: row._semanticScore,
    exactScore: row._exactScore,
  }));
}

export function searchVendorsLocal(vendors, query, { limit = 15 } = {}) {
  if (!query?.trim()) return vendors.slice(0, limit);

  const index = new Bm25Index();
  for (const v of vendors) {
    const id = `${v.name}|${v.ticker}`;
    const text = [v.name, v.ticker, ...(v.snippets ?? [])].join(' ');
    index.add(id, text);
  }
  index.finalize();

  const ranked = rankEvidenceByBm25(
    index,
    query,
    vendors.map((v) => ({ id: `${v.name}|${v.ticker}`, ...v })),
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

export async function searchVendors(query, { limit = 15 } = {}) {
  const index = await loadRagIndex();
  if (index.workerBacked) return searchVendorsViaWorker(query, { limit });
  return searchVendorsLocal(index.vendors, query, { limit });
}

export function extractVendorsFromChunks(chunks) {
  const counts = new Map();
  for (const chunk of chunks) {
    for (const term of tokenize(chunk.text)) {
      if (term.length < 4) continue;
      counts.set(term, (counts.get(term) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([name, count]) => ({ name, count }));
}

/** Kick off background index load (no embedding model until semantic/hybrid search). */
export function preloadRagInBackground() {
  if (isRagWorkerAvailable()) {
    void preloadRagIndex().catch(() => {});
    return;
  }
  void loadRagIndex().catch(() => {});
}
