/** Client loader for the space-economy research Q&A bundle. */

let cache = /** @type {object | null} */ (null);
let inflight = /** @type {Promise<object | null> | null} */ (null);

export async function loadSpaceEconomyResearchAnswers() {
  if (cache) return cache;
  if (inflight) return inflight;

  inflight = fetch('/space-economy/research/answers.json')
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      cache = data;
      inflight = null;
      return data;
    })
    .catch(() => {
      inflight = null;
      return null;
    });

  return inflight;
}

let deepDivesCache = /** @type {object | null} */ (null);
let deepDivesInflight = /** @type {Promise<object | null> | null} */ (null);

export async function loadSpaceEconomyDeepDives() {
  if (deepDivesCache) return deepDivesCache;
  if (deepDivesInflight) return deepDivesInflight;
  deepDivesInflight = fetch('/space-economy/research/deep-dives.json')
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      deepDivesCache = data;
      deepDivesInflight = null;
      return data;
    })
    .catch(() => {
      deepDivesInflight = null;
      return null;
    });
  return deepDivesInflight;
}

let metricsCache = /** @type {object | null} */ (null);
let metricsInflight = /** @type {Promise<object | null> | null} */ (null);

export async function loadSpaceEconomyMetrics() {
  if (metricsCache) return metricsCache;
  if (metricsInflight) return metricsInflight;
  metricsInflight = fetch('/space-economy/metrics/companies.json')
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      metricsCache = data;
      metricsInflight = null;
      return data;
    })
    .catch(() => {
      metricsInflight = null;
      return null;
    });
  return metricsInflight;
}

let riskDiffsIndexCache = /** @type {object | null} */ (null);
let riskDiffsIndexInflight = /** @type {Promise<object | null> | null} */ (null);

export async function loadSpaceEconomyRiskDiffsIndex() {
  if (riskDiffsIndexCache) return riskDiffsIndexCache;
  if (riskDiffsIndexInflight) return riskDiffsIndexInflight;
  riskDiffsIndexInflight = fetch('/space-economy/risk-diffs/index.json')
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      riskDiffsIndexCache = data;
      riskDiffsIndexInflight = null;
      return data;
    })
    .catch(() => {
      riskDiffsIndexInflight = null;
      return null;
    });
  return riskDiffsIndexInflight;
}

const riskDiffCache = new Map();
export async function loadSpaceEconomyRiskDiff(ticker) {
  if (!ticker) return null;
  if (riskDiffCache.has(ticker)) return riskDiffCache.get(ticker);
  const promise = fetch(`/space-economy/risk-diffs/${ticker}.json`)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  riskDiffCache.set(ticker, promise);
  return promise;
}

let crossTopicCache = /** @type {object | null} */ (null);
let crossTopicInflight = /** @type {Promise<object | null> | null} */ (null);

export async function loadSpaceEconomyCrossTopic() {
  if (crossTopicCache) return crossTopicCache;
  if (crossTopicInflight) return crossTopicInflight;
  crossTopicInflight = fetch('/space-economy/cross-topic/shared-vendors.json')
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      crossTopicCache = data;
      crossTopicInflight = null;
      return data;
    })
    .catch(() => {
      crossTopicInflight = null;
      return null;
    });
  return crossTopicInflight;
}

function makeJsonLoader(url) {
  let cache = null;
  let inflight = null;
  return async function load() {
    if (cache) return cache;
    if (inflight) return inflight;
    inflight = fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        cache = data;
        inflight = null;
        return data;
      })
      .catch(() => {
        inflight = null;
        return null;
      });
    return inflight;
  };
}

export const loadSpaceEconomyGlossary = makeJsonLoader('/space-economy/glossary/terms.json');
export const loadSpaceEconomyInsiders = makeJsonLoader('/space-economy/insiders/index.json');
export const loadSpaceEconomyVendorNetwork = makeJsonLoader('/space-economy/vendor-network/tree.json');
export const loadSpaceEconomyTimelineIndex = makeJsonLoader('/space-economy/event-timeline/index.json');
export const loadSpaceEconomyTrends = makeJsonLoader('/space-economy/trends/companies.json');
export const loadSpaceEconomyConcentration = makeJsonLoader('/space-economy/concentration/companies.json');
export const loadSpaceEconomyContractsIndex = makeJsonLoader('/space-economy/contracts/index.json');
export const loadSpaceEconomyPricesIndex = makeJsonLoader('/space-economy/prices/index.json');
export const loadSpaceEconomySbir = makeJsonLoader('/space-economy/sbir/index.json');
export const loadSpaceEconomyLaunches = makeJsonLoader('/space-economy/launches/index.json');
export const loadSpaceEconomyPatents = makeJsonLoader('/space-economy/patents/index.json');

const contractsCache = new Map();
export async function loadSpaceEconomyContracts(ticker) {
  if (!ticker) return null;
  if (contractsCache.has(ticker)) return contractsCache.get(ticker);
  const p = fetch(`/space-economy/contracts/${ticker}.json`).then((r) => r.ok ? r.json() : null).catch(() => null);
  contractsCache.set(ticker, p);
  return p;
}

const pricesCache = new Map();
export async function loadSpaceEconomyPrices(ticker) {
  if (!ticker) return null;
  if (pricesCache.has(ticker)) return pricesCache.get(ticker);
  const p = fetch(`/space-economy/prices/${ticker}.json`).then((r) => r.ok ? r.json() : null).catch(() => null);
  pricesCache.set(ticker, p);
  return p;
}

const sbirTickerCache = new Map();
export async function loadSpaceEconomySbirTicker(ticker) {
  if (!ticker) return null;
  if (sbirTickerCache.has(ticker)) return sbirTickerCache.get(ticker);
  const p = fetch(`/space-economy/sbir/${ticker}.json`).then((r) => r.ok ? r.json() : null).catch(() => null);
  sbirTickerCache.set(ticker, p);
  return p;
}

const patentsTickerCache = new Map();
export async function loadSpaceEconomyPatentsTicker(ticker) {
  if (!ticker) return null;
  if (patentsTickerCache.has(ticker)) return patentsTickerCache.get(ticker);
  const p = fetch(`/space-economy/patents/${ticker}.json`).then((r) => r.ok ? r.json() : null).catch(() => null);
  patentsTickerCache.set(ticker, p);
  return p;
}

const timelineCache = new Map();
export async function loadSpaceEconomyTimeline(ticker) {
  if (!ticker) return null;
  if (timelineCache.has(ticker)) return timelineCache.get(ticker);
  const promise = fetch(`/space-economy/event-timeline/${ticker}.json`)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  timelineCache.set(ticker, promise);
  return promise;
}

let sankeyIndexCache = /** @type {object | null} */ (null);
let sankeyIndexInflight = /** @type {Promise<object | null> | null} */ (null);

export async function loadSpaceEconomySankeyIndex() {
  if (sankeyIndexCache) return sankeyIndexCache;
  if (sankeyIndexInflight) return sankeyIndexInflight;
  sankeyIndexInflight = fetch('/space-economy/sankey/index.json')
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      sankeyIndexCache = data;
      sankeyIndexInflight = null;
      return data;
    })
    .catch(() => {
      sankeyIndexInflight = null;
      return null;
    });
  return sankeyIndexInflight;
}

const sankeyCache = new Map();
export async function loadSpaceEconomySankey(ticker) {
  if (!ticker) return null;
  if (sankeyCache.has(ticker)) return sankeyCache.get(ticker);
  const promise = fetch(`/space-economy/sankey/${ticker}.json`)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  sankeyCache.set(ticker, promise);
  return promise;
}

let wordCloudCache = /** @type {object | null} */ (null);
let wordCloudInflight = /** @type {Promise<object | null> | null} */ (null);

export async function loadSpaceEconomyWordCloud() {
  if (wordCloudCache) return wordCloudCache;
  if (wordCloudInflight) return wordCloudInflight;
  wordCloudInflight = fetch('/space-economy/wordcloud/terms.json')
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      wordCloudCache = data;
      wordCloudInflight = null;
      return data;
    })
    .catch(() => {
      wordCloudInflight = null;
      return null;
    });
  return wordCloudInflight;
}

let umapCache = /** @type {object | null} */ (null);
let umapInflight = /** @type {Promise<object | null> | null} */ (null);

export async function loadSpaceEconomyUmap() {
  if (umapCache) return umapCache;
  if (umapInflight) return umapInflight;
  umapInflight = fetch('/space-economy/umap/scatter.json')
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      umapCache = data;
      umapInflight = null;
      return data;
    })
    .catch(() => {
      umapInflight = null;
      return null;
    });
  return umapInflight;
}

let geographyCache = /** @type {object | null} */ (null);
let geographyInflight = /** @type {Promise<object | null> | null} */ (null);

export async function loadSpaceEconomyGeography() {
  if (geographyCache) return geographyCache;
  if (geographyInflight) return geographyInflight;
  geographyInflight = fetch('/space-economy/geography.json')
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      geographyCache = data;
      geographyInflight = null;
      return data;
    })
    .catch(() => {
      geographyInflight = null;
      return null;
    });
  return geographyInflight;
}

/** @param {object} answers — payload from loadSpaceEconomyResearchAnswers */
export function groupQuestionsByCategory(answers) {
  if (!answers?.questions?.length) return [];
  /** @type {Map<string, object[]>} */
  const map = new Map();
  for (const q of answers.questions) {
    if (!map.has(q.category)) map.set(q.category, []);
    map.get(q.category).push(q);
  }
  const order = Array.isArray(answers.categories) ? answers.categories : [...map.keys()];
  return order
    .filter((c) => map.has(c))
    .map((category) => ({
      category,
      questions: map.get(category),
      totalAnswers: map.get(category).reduce((n, q) => n + (q.answerCount ?? 0), 0),
    }));
}
