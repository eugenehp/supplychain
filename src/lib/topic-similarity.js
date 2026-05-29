import { countryForNode, countryCodeToFlag, COUNTRY_NAMES } from './vendor-geography.js';
import { GROUP_COLORS, brandForNode, NODE_TO_TICKER } from './vendor-colors.js';
import { GROUP_LEGEND, TOPICS, getTopicData } from './topics.js';

/** @typedef {{ nodeWeights: Map<string, number>, groupWeights: Map<string, number>, countryWeights: Map<string, number>, nodeGroups: Map<string, string>, nodeCountries: Map<string, string | null> }} TopicSignature */

const signatureCache = new Map();

/** @param {Map<string, number>} map */
function mapTotal(map) {
  let sum = 0;
  for (const v of map.values()) sum += v;
  return sum;
}

/** Weighted overlap: Σ min(a,b) / Σ max(a,b) over union of keys. */
export function weightedOverlap(mapA, mapB) {
  const keys = new Set([...mapA.keys(), ...mapB.keys()]);
  let minSum = 0;
  let maxSum = 0;
  for (const key of keys) {
    const a = mapA.get(key) ?? 0;
    const b = mapB.get(key) ?? 0;
    minSum += Math.min(a, b);
    maxSum += Math.max(a, b);
  }
  return maxSum > 0 ? minSum / maxSum : 0;
}

/** @param {Map<string, number>} mapA @param {Map<string, number>} mapB */
function vendorJaccard(mapA, mapB) {
  const setA = new Set([...mapA.keys()].filter((k) => (mapA.get(k) ?? 0) > 0));
  const setB = new Set([...mapB.keys()].filter((k) => (mapB.get(k) ?? 0) > 0));
  if (!setA.size && !setB.size) return 1;
  let inter = 0;
  for (const k of setA) if (setB.has(k)) inter++;
  const union = new Set([...setA, ...setB]).size;
  return union > 0 ? inter / union : 0;
}

/** @param {object | null | undefined} data */
export function buildTopicSignature(data) {
  const nodes = data?.nodes ?? [];
  const links = data?.links ?? [];
  const productId = nodes.find((n) => n.tier === 0)?.id ?? data?.methodology?.product ?? null;
  const nodeMeta = new Map(nodes.map((n) => [n.id, n]));

  /** @type {Map<string, number>} */
  const nodeWeights = new Map();
  for (const link of links) {
    nodeWeights.set(link.source, (nodeWeights.get(link.source) ?? 0) + (link.value ?? 0));
    nodeWeights.set(link.target, (nodeWeights.get(link.target) ?? 0) + (link.value ?? 0));
  }
  if (productId) nodeWeights.delete(productId);

  /** @type {Map<string, string>} */
  const nodeGroups = new Map();
  /** @type {Map<string, string | null>} */
  const nodeCountries = new Map();
  /** @type {Map<string, number>} */
  const groupWeights = new Map();
  /** @type {Map<string, number>} */
  const countryWeights = new Map();

  for (const [id, weight] of nodeWeights) {
    const node = nodeMeta.get(id) ?? { id };
    const group = node.group ?? 'other';
    const country = countryForNode(node);

    nodeGroups.set(id, group);
    nodeCountries.set(id, country);
    groupWeights.set(group, (groupWeights.get(group) ?? 0) + weight);
    if (country) {
      countryWeights.set(country, (countryWeights.get(country) ?? 0) + weight);
    }
  }

  return { nodeWeights, groupWeights, countryWeights, nodeGroups, nodeCountries };
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

/** @param {TopicSignature} sigA @param {TopicSignature} sigB */
export function topicSimilarityScore(sigA, sigB) {
  const nodeOverlap = weightedOverlap(sigA.nodeWeights, sigB.nodeWeights);
  const vendorJac = vendorJaccard(sigA.nodeWeights, sigB.nodeWeights);
  const groupOverlap = weightedOverlap(sigA.groupWeights, sigB.groupWeights);
  const countryOverlap = weightedOverlap(sigA.countryWeights, sigB.countryWeights);

  const score = 0.45 * nodeOverlap + 0.25 * vendorJac + 0.15 * groupOverlap + 0.15 * countryOverlap;
  return Math.round(score * 1000) / 10;
}

/** @param {TopicSignature} sig @param {string} country */
function sliceByCountry(sig, country) {
  /** @type {Map<string, number>} */
  const slice = new Map();
  for (const [id, weight] of sig.nodeWeights) {
    if (sig.nodeCountries.get(id) === country) slice.set(id, weight);
  }
  return slice;
}

/** @param {TopicSignature} sig @param {string} group */
function sliceByGroup(sig, group) {
  /** @type {Map<string, number>} */
  const slice = new Map();
  for (const [id, weight] of sig.nodeWeights) {
    if (sig.nodeGroups.get(id) === group) slice.set(id, weight);
  }
  return slice;
}

/** @param {TopicSignature} current @param {TopicSignature} peer @param {(sig: TopicSignature, key: string) => Map<string, number>} sliceFn @param {string[]} keys */
function pairwiseSliceBreakdown(current, peer, sliceFn, keys) {
  return keys
    .map((key) => {
      const currentSlice = sliceFn(current, key);
      const peerSlice = sliceFn(peer, key);
      const currentTotal = mapTotal(currentSlice);
      const peerTotal = mapTotal(peerSlice);
      if (currentTotal <= 0 && peerTotal <= 0) return null;
      return {
        key,
        percent: Math.round(weightedOverlap(currentSlice, peerSlice) * 1000) / 10,
        weight: Math.max(currentTotal, peerTotal),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.percent - a.percent || b.weight - a.weight);
}

/** @param {string} nodeId */
function vendorDisplayMeta(nodeId) {
  const brand = brandForNode(nodeId);
  const ticker = NODE_TO_TICKER[nodeId] ?? brand?.ticker ?? null;
  const country = countryForNode(nodeId);

  return {
    id: nodeId,
    name: brand?.name ?? nodeId,
    ticker: ticker ? String(ticker).toUpperCase() : null,
    countryCode: country,
    countryName: country ? (COUNTRY_NAMES[country] ?? country) : null,
    flag: country ? countryCodeToFlag(country) : '',
  };
}

/** @param {TopicSignature} current @param {TopicSignature} peer */
function sharedVendorsForPair(current, peer) {
  /** @type {object[]} */
  const shared = [];

  for (const [id, weightA] of current.nodeWeights) {
    const weightB = peer.nodeWeights.get(id) ?? 0;
    if (weightA <= 0 || weightB <= 0) continue;

    shared.push({
      ...vendorDisplayMeta(id),
      weight: Math.min(weightA, weightB),
      group: current.nodeGroups.get(id) ?? peer.nodeGroups.get(id) ?? 'other',
    });
  }

  return shared.sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name));
}

/** @param {TopicSignature} current @param {TopicSignature} peer */
function countryBreakdownForPair(current, peer) {
  const codes = new Set([...current.countryWeights.keys(), ...peer.countryWeights.keys()]);
  const rows = pairwiseSliceBreakdown(current, peer, sliceByCountry, [...codes]);
  return rows.map(({ key, percent }) => ({
    code: key,
    name: COUNTRY_NAMES[key] ?? key,
    flag: countryCodeToFlag(key),
    percent,
  }));
}

/** @param {TopicSignature} current @param {TopicSignature} peer */
function categoryBreakdownForPair(current, peer) {
  const keys = GROUP_LEGEND.filter((g) => g.key !== 'product').map((g) => g.key);
  const rows = pairwiseSliceBreakdown(current, peer, sliceByGroup, keys);
  return rows.map(({ key, percent }) => {
    const legend = GROUP_LEGEND.find((g) => g.key === key);
    return {
      key,
      label: legend?.label ?? key,
      color: GROUP_COLORS[key] ?? GROUP_COLORS.other,
      percent,
    };
  });
}

/**
 * Full similarity report for the active topic vs all other research topics.
 * @param {string} currentTopicId
 * @param {object | null | undefined} currentData
 */
export function computeTopicSimilarityReport(currentTopicId, currentData) {
  const currentSig = getTopicSignature(currentTopicId, currentData);
  if (!currentSig) {
    return { topics: [] };
  }

  const browsable = TOPICS.filter((t) => t.dataFile);
  /** @type {object[]} */
  const topics = [];

  for (const meta of browsable) {
    if (meta.id === currentTopicId) continue;
    const peerData = getTopicData(meta.id);
    const peerSig = getTopicSignature(meta.id, peerData);
    if (!peerSig) continue;

    topics.push({
      id: meta.id,
      label: meta.label,
      shortLabel: meta.shortLabel,
      status: meta.status,
      percent: topicSimilarityScore(currentSig, peerSig),
      sharedVendors: sharedVendorsForPair(currentSig, peerSig),
      countries: countryBreakdownForPair(currentSig, peerSig),
      categories: categoryBreakdownForPair(currentSig, peerSig),
    });
  }

  topics.sort((a, b) => b.percent - a.percent);

  return { topics };
}
