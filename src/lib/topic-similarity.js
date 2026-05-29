import { GROUP_LEGEND, TOPICS, getTopicData, loadTopicDataBatch } from './topics.js';
import {
  buildTopicSignature,
  computeSimilarityReportFromDatasets,
} from './topic-similarity-core.js';

export { weightedOverlap, buildTopicSignature, topicSimilarityScore } from './topic-similarity-core.js';

/** @typedef {import('./topic-similarity-core.js').TopicSignature} TopicSignature */

const signatureCache = new Map();

/** @type {Promise<{ generatedAt?: string, byTopic?: Record<string, object> } | null> | null} */
let similarityIndexPromise = null;

async function loadSimilarityIndex() {
  if (!similarityIndexPromise) {
    similarityIndexPromise = fetch('/topics/similarity-index.json')
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null);
  }
  return similarityIndexPromise;
}

/** @param {string} topicId @param {object | null | undefined} data */
export function getTopicSignature(topicId, data) {
  if (!data) return null;
  const cached = signatureCache.get(topicId);
  if (cached?.generatedAt === data.generatedAt) return cached.signature;

  const signature = buildTopicSignature(data);
  signatureCache.set(topicId, { generatedAt: data.generatedAt, signature });
  return signature;
}

/**
 * Precomputed similarity report (fast path).
 * @param {string} currentTopicId
 */
export async function loadSimilarityReport(currentTopicId) {
  const index = await loadSimilarityIndex();
  const precomputed = index?.byTopic?.[currentTopicId];
  if (precomputed?.topics?.length) return precomputed;

  const browsable = TOPICS.filter((t) => t.dataFile && t.id !== currentTopicId);
  await loadTopicDataBatch(browsable.map((t) => t.id));

  /** @type {Map<string, object>} */
  const datasets = new Map();
  const currentData = getTopicData(currentTopicId);
  if (currentData) datasets.set(currentTopicId, currentData);
  for (const meta of browsable) {
    const peer = getTopicData(meta.id);
    if (peer) datasets.set(meta.id, peer);
  }

  return computeSimilarityReportFromDatasets(
    currentTopicId,
    currentData,
    datasets,
    TOPICS,
    GROUP_LEGEND,
  );
}

/**
 * Sync fallback when peer datasets are already cached.
 * @param {string} currentTopicId
 * @param {object | null | undefined} currentData
 */
export function computeTopicSimilarityReport(currentTopicId, currentData) {
  /** @type {Map<string, object>} */
  const datasets = new Map();
  if (currentData) datasets.set(currentTopicId, currentData);

  for (const meta of TOPICS) {
    if (!meta.dataFile || meta.id === currentTopicId) continue;
    const peer = getTopicData(meta.id);
    if (peer) datasets.set(meta.id, peer);
  }

  return computeSimilarityReportFromDatasets(
    currentTopicId,
    currentData,
    datasets,
    TOPICS,
    GROUP_LEGEND,
  );
}
