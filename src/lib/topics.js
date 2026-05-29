/** Client-side research topic registry — synced from data/topics/index.json by pipeline. */
import topicsIndex from '../../data/topics/index.json';

/** Lazy loaders — one async chunk per topic (not bundled upfront). */
const dataLoaders = import.meta.glob('../../data/topics/*/supply-chain.json');

/** @type {Map<string, object>} */
const dataCache = new Map();
/** @type {Map<string, Promise<object | null>>} */
const inflight = new Map();

export const TOPICS = topicsIndex.topics ?? [];

/** @param {string} topicId */
function loaderPath(topicId) {
  return `../../data/topics/${topicId}/supply-chain.json`;
}

/** @param {string} topicId @returns {Promise<object | null>} */
export async function loadTopicData(topicId) {
  if (dataCache.has(topicId)) return dataCache.get(topicId) ?? null;

  const existing = inflight.get(topicId);
  if (existing) return existing;

  const loader = dataLoaders[loaderPath(topicId)];
  if (!loader) return null;

  const promise = loader()
    .then((mod) => {
      const data = mod?.default ?? mod ?? null;
      if (data) dataCache.set(topicId, data);
      inflight.delete(topicId);
      return data;
    })
    .catch(() => {
      inflight.delete(topicId);
      return null;
    });

  inflight.set(topicId, promise);
  return promise;
}

/** Warm the cache for a topic (e.g. selector hover). */
export function prefetchTopicData(topicId) {
  void loadTopicData(topicId);
}

/** Sync read — only returns data already in cache. */
export function getTopicData(topicId) {
  return dataCache.get(topicId) ?? null;
}

/** @param {string[]} topicIds */
export async function loadTopicDataBatch(topicIds) {
  await Promise.all(topicIds.map((id) => loadTopicData(id)));
}

export function getTopicMeta(topicId) {
  return TOPICS.find((t) => t.id === topicId);
}

export function getActiveTopics() {
  return TOPICS.filter((t) => t.status === 'active');
}

export function getLimitedTopics() {
  return TOPICS.filter((t) => t.status === 'limited');
}

export function getPlannedTopics() {
  return getLimitedTopics();
}

export function isLimitedTopicId(id) {
  return TOPICS.some((t) => t.id === id && t.status === 'limited');
}

export function isBrowsableTopicId(id) {
  return isActiveTopicId(id) || isLimitedTopicId(id);
}

export function getDefaultTopicId() {
  const active = getActiveTopics();
  return active[0]?.id ?? 'nvidia-h200';
}

export const GROUP_LEGEND = [
  { key: 'product', label: 'Finished Product' },
  { key: 'foundry', label: 'Foundry / CoWoS' },
  { key: 'memory', label: 'HBM Memory' },
  { key: 'osat', label: 'Assembly / OSAT' },
  { key: 'eda', label: 'EDA & IP' },
  { key: 'equipment', label: 'Fab Equipment' },
  { key: 'materials', label: 'Materials & Substrates' },
  { key: 'subcomponent', label: 'Equipment Sub-components' },
  { key: 'raw', label: 'Tier 4 — Raw Materials' },
  { key: 'commodity', label: 'Tier 5 — Bulk / Extractive' },
];

export const TIER_LABELS = ['Product', 'Tier 1', 'Tier 2', 'Tier 3', 'Tier 4', 'Tier 5'];

const STORAGE_KEY = 'supply-chain-topic';

export function isActiveTopicId(id) {
  return TOPICS.some((t) => t.id === id && t.status === 'active');
}

/** @param {string} [hash] */
export function topicIdFromHash(hash = typeof window !== 'undefined' ? window.location.hash : '') {
  const raw = String(hash).replace(/^#/, '').trim();
  if (!raw) return null;
  const id = raw.startsWith('/') ? raw.slice(1).split('/')[0] : raw.split('/')[0];
  return isBrowsableTopicId(id) ? id : null;
}

/** @param {string} id */
export function hashForTopicId(id) {
  return `#${id}`;
}

export function loadTopicId() {
  if (typeof window !== 'undefined') {
    const fromHash = topicIdFromHash(window.location.hash);
    if (fromHash) return fromHash;
  }
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && isBrowsableTopicId(saved)) return saved;
  }
  return getDefaultTopicId();
}

/**
 * Persist topic choice to localStorage and optionally the URL hash.
 * @param {string} id
 * @param {{ hash?: 'push' | 'replace' | false }} [opts]
 */
export function saveTopicId(id, { hash = 'push' } = {}) {
  if (!isBrowsableTopicId(id)) return;
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, id);
  if (typeof window === 'undefined' || hash === false) return;

  const nextHash = hashForTopicId(id);
  if (window.location.hash === nextHash) return;

  const url = `${window.location.pathname}${window.location.search}${nextHash}`;
  if (hash === 'replace') {
    history.replaceState(null, '', url);
  } else {
    window.location.hash = id;
  }
}

/**
 * Keep topic state in sync when the user navigates with back/forward.
 * @param {(id: string) => void} onTopicId
 */
export function installTopicHashSync(onTopicId) {
  if (typeof window === 'undefined') return () => {};

  const handler = () => {
    const fromHash = topicIdFromHash(window.location.hash);
    if (fromHash) onTopicId(fromHash);
  };

  window.addEventListener('hashchange', handler);
  return () => window.removeEventListener('hashchange', handler);
}
