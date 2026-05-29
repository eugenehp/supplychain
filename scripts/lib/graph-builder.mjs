import { TIERS } from './topics/index.mjs';
import { VENDOR_TIERS, canonicalize, isKnownVendor } from './semi-vendors.mjs';
import { findVendorsForProduct } from './rag-query.mjs';
import { buildLinksForTopic } from './sec-grounding.mjs';

function tierFor(name, nodeMeta) {
  return VENDOR_TIERS[name] ?? nodeMeta[name] ?? null;
}

export function buildSupplyGraph({ topicModule, ragVendors = [], secProcessed = [], secGrounded = [] } = {}) {
  const { NODE_META, PRODUCT_NODE } = topicModule;
  const nodes = new Map();
  const links = [];
  const evidence = [];

  const addNode = (name, extra = {}) => {
    const canonical = canonicalize(name);
    if (!canonical || canonical.length < 2) return null;
    const tierInfo = tierFor(canonical, NODE_META) ?? { tier: 2, group: 'other' };
    const meta = NODE_META[canonical] ?? {};
    if (!nodes.has(canonical)) {
      nodes.set(canonical, {
        id: canonical,
        name: canonical,
        tier: tierInfo.tier ?? meta.tier ?? 2,
        group: tierInfo.group ?? meta.group ?? 'other',
        description: meta.description ?? '',
        country: meta.country ?? null,
        mentionScore: 0,
        sources: [],
        inSankey: true,
        ...extra,
      });
    }
    return nodes.get(canonical);
  };

  addNode(PRODUCT_NODE, { tier: TIERS.product, group: 'product' });

  for (const link of buildLinksForTopic(topicModule, secGrounded)) {
    addNode(link.source);
    addNode(link.target);
    links.push(link);
  }

  for (const v of secGrounded) {
    const canonical = canonicalize(v.name === 'Carl Zeiss SMT' ? 'Zeiss' : v.name);
    const node = addNode(canonical);
    if (!node) continue;
    node.mentionScore += v.count ?? 0;
    node.sources.push(...new Set(v.filings?.map((f) => f.ticker) ?? []));
    if (v.snippets?.[0]) {
      evidence.push({ vendor: canonical, ticker: v.filings?.[0]?.ticker, snippet: v.snippets[0], count: v.count });
    }
  }

  for (const v of ragVendors) {
    if (!isKnownVendor(v.name)) continue;
    const node = addNode(v.name);
    if (node) {
      node.mentionScore += v.score ?? 1;
      node.sources.push('rag');
    }
  }

  for (const proc of secProcessed) {
    for (const v of proc.entities?.vendors ?? []) {
      if (!isKnownVendor(v.name)) continue;
      const node = addNode(v.name);
      if (node) {
        node.mentionScore += v.count ?? 0;
        node.sources.push(proc.ticker);
      }
    }
  }

  for (const name of Object.keys(NODE_META)) addNode(name);

  const linkMap = new Map();
  for (const link of links) {
    const key = `${link.source}→${link.target}`;
    const prev = linkMap.get(key);
    if (!prev || link.value > prev.value) linkMap.set(key, link);
  }

  return {
    nodes: [...nodes.values()],
    links: [...linkMap.values()],
    evidence,
    secGroundedCount: secGrounded.length,
    stats: {
      nodeCount: nodes.size,
      linkCount: linkMap.size,
    },
  };
}

export function buildGraphFromPipeline(topicModule, processedCompanies, secGrounded = []) {
  const ragResult = findVendorsForProduct('GPU HBM foundry supplier TSMC Hynix CoWoS Fabrinet Wistron Hon Hai Carl Zeiss');
  const graph = buildSupplyGraph({
    topicModule,
    ragVendors: ragResult.vendors,
    secProcessed: processedCompanies,
    secGrounded,
  });
  return { graph, ragResult };
}

export function graphToSankeyLinks(graph) {
  const sankeyNodes = new Set(graph.nodes.filter((n) => n.inSankey !== false).map((n) => n.id));
  return graph.links.filter((l) => sankeyNodes.has(l.source) && sankeyNodes.has(l.target));
}
