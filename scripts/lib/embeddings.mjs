/** Neural sentence embeddings via transformers.js (Node + browser) */

import { join } from 'node:path';
import { PATHS, ROOT } from './paths.mjs';

export const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
export const EMBEDDING_DIM = 384;

/** @type {Promise<(text: string, opts?: object) => Promise<{ data: Float32Array }>> | null} */
let embedPipelinePromise = null;

export async function getEmbedPipeline() {
  if (!embedPipelinePromise) {
    embedPipelinePromise = (async () => {
      const { pipeline, env } = await import('@xenova/transformers');
      env.allowLocalModels = false;
      env.useBrowserCache = typeof window !== 'undefined';
      if (typeof window === 'undefined') {
        env.cacheDir = join(ROOT, 'data', '.cache', 'transformers');
      }
      const pipe = await pipeline('feature-extraction', EMBEDDING_MODEL);
      return pipe;
    })();
  }
  return embedPipelinePromise;
}

export function evidenceEmbedText(entry) {
  return [entry.excerpt, entry.vendor, entry.sectionHeader, entry.ticker].filter(Boolean).join(' ');
}

export async function embedText(text) {
  const pipe = await getEmbedPipeline();
  const out = await pipe(text.slice(0, 512), { pooling: 'mean', normalize: true });
  return new Float32Array(out.data);
}

export async function embedTexts(texts, { batchSize = 32, onProgress = null } = {}) {
  const pipe = await getEmbedPipeline();
  const vectors = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    for (const text of batch) {
      const out = await pipe(text.slice(0, 512), { pooling: 'mean', normalize: true });
      vectors.push(new Float32Array(out.data));
    }
    onProgress?.(Math.min(i + batch.length, texts.length), texts.length);
  }
  return vectors;
}

export function quantizeVector(vec) {
  const q = new Int8Array(vec.length);
  for (let i = 0; i < vec.length; i++) q[i] = Math.max(-127, Math.min(127, Math.round(vec[i] * 127)));
  return q;
}

export function dequantizeVector(q) {
  const vec = new Float32Array(q.length);
  for (let i = 0; i < q.length; i++) vec[i] = q[i] / 127;
  return vec;
}

export function cosineSimilarity(a, b) {
  let dot = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) dot += a[i] * b[i];
  return dot;
}

export function rankByEmbedding(queryVec, entries, {
  getVector = (e) => e.vector,
  getId = (e) => e.id,
  minScore = 0.25,
  limit = 400,
} = {}) {
  const scored = entries
    .map((entry) => {
      const vec = getVector(entry);
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
