import { createWorkerBridge } from './worker-bridge.js';
import RagWorker from './workers/rag.worker.js?worker';

/** @type {ReturnType<typeof createWorkerBridge> | null} */
let bridge = null;
/** @type {Promise<object> | null} */
let indexPromise = null;

function getBridge() {
  if (typeof Worker === 'undefined') return null;
  if (!bridge) bridge = createWorkerBridge(RagWorker);
  return bridge;
}

/** Start loading RAG index + embeddings model in a background worker. */
export function preloadRagIndex() {
  const b = getBridge();
  if (!b) return Promise.reject(new Error('Workers unavailable'));
  if (!indexPromise) indexPromise = b.call('load-index');
  return indexPromise;
}

/** @returns {Promise<object>} */
export async function loadRagIndexViaWorker() {
  return preloadRagIndex();
}

/**
 * @param {string} query
 * @param {{ mode?: string, ticker?: string, limit?: number }} [options]
 */
export async function searchChunksViaWorker(query, options = {}) {
  const b = getBridge();
  if (!b) throw new Error('Workers unavailable');
  await preloadRagIndex();
  return b.call('search-chunks', { query, ...options });
}

/**
 * @param {string} query
 * @param {{ limit?: number }} [options]
 */
export async function searchVendorsViaWorker(query, options = {}) {
  const b = getBridge();
  if (!b) throw new Error('Workers unavailable');
  await preloadRagIndex();
  return b.call('search-vendors', { query, ...options });
}

/** Warm embedding model in worker (parallel with UI paint). */
export function warmEmbeddingModel() {
  const b = getBridge();
  if (!b) return Promise.resolve({ ready: false });
  return b.call('warm-embed').catch(() => ({ ready: false }));
}

export function isRagWorkerAvailable() {
  return typeof Worker !== 'undefined';
}
