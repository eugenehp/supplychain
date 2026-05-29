import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeIntermediateFlows, applySecScaling } from './build-sankey-utils.mjs';
import { PATHS, topicDir, topicSupplyChainPath } from './paths.mjs';
import { extractSecGroundedVendors } from './sec-grounding.mjs';
import { buildGraphFromPipeline, graphToSankeyLinks } from './graph-builder.mjs';
import { buildMethodologySources } from './sources.mjs';
import { getActiveTopics, getBuildTopics, getTopic, TOPICS } from './topics/index.mjs';
import { TOPIC_MODULES } from './topics/registry.mjs';

export { normalizeIntermediateFlows, applySecScaling } from './build-sankey-utils.mjs';

export function buildSankeyFromGraph(graph, topicMeta, secData = [], topicModule) {
  const nodeMeta = topicModule?.NODE_META ?? {};
  const sankeyLinks = graphToSankeyLinks(graph);
  let links = normalizeIntermediateFlows(
    sankeyLinks.map((l) => ({ source: l.source, target: l.target, value: l.value, tier: l.tier })),
    nodeMeta,
  );
  links = applySecScaling(links, secData);

  const nodeNames = [...new Set(links.flatMap((l) => [l.source, l.target]))];
  const nodes = nodeNames.map((name) => {
    const fromGraph = graph.nodes.find((n) => n.id === name || n.name === name);
    const meta = nodeMeta[name] ?? {};
    return {
      id: name,
      name,
      tier: fromGraph?.tier ?? meta.tier ?? 99,
      group: fromGraph?.group ?? meta.group ?? 'other',
      description: meta.description ?? '',
      country: fromGraph?.country ?? meta.country ?? null,
      mentionScore: fromGraph?.mentionScore ?? 0,
    };
  });

  const productNode = topicModule?.PRODUCT_NODE ?? 'Nvidia H200';
  const tier1ToProduct = links.filter((l) => l.target === productNode);
  const tsmcFlow = tier1ToProduct.find((l) => l.source === 'TSMC')?.value ?? 0;
  const hynixFlow = tier1ToProduct.find((l) => l.source === 'SK Hynix')?.value ?? 0;
  const totalBom = tier1ToProduct.reduce((s, l) => s + l.value, 0);
  const methodologyNotes = topicModule?.METHODOLOGY ?? {};

  const secFilings = secData.filter((f) => !f.error && topicMeta.secWatchlist?.includes(f.ticker));

  const isLimited = topicMeta.status === 'limited';

  return {
    topicId: topicMeta.id,
    topicLabel: topicMeta.label,
    generatedAt: new Date().toISOString(),
    disclosureLevel: isLimited ? 'limited' : 'full',
    disclosureNote: topicMeta.disclosureNote ?? null,
    methodology: {
      approach: isLimited
        ? 'Industry-modeled supply chain — limited or no chip-level SEC anchor filings'
        : 'reverse-tracing from SEC 10-K / 20-F filings',
      product: productNode,
      linkMetric: 'USD spend per chip',
      normalization: 'Intermediate node inflows scaled to equal outflows; internal margin not shown',
      tiers: 'Product → Tier 1 (direct) → Tier 2 (fab inputs) → Tier 3 (equipment sub-components) → Tier 4 (raw materials) → Tier 5 (bulk / extractive inputs)',
      edaRouting: methodologyNotes.edaRouting ?? 'Synopsys, Cadence, Siemens EDA, Ansys, Arm flow directly to product (design-time)',
      assemblyRouting: methodologyNotes.assemblyRouting ?? 'Assembly subcontractors disclosed in anchor company 10-K',
      sources: buildMethodologySources(topicMeta.id, secFilings),
    },
    summary: {
      totalBomPerChip: Math.round(totalBom * 100) / 100,
      tsmcShare: totalBom > 0 ? Math.round((tsmcFlow / totalBom) * 1000) / 10 : 0,
      skHynixShare: totalBom > 0 ? Math.round((hynixFlow / totalBom) * 1000) / 10 : 0,
      hbmTotalPerChip: Math.round(
        tier1ToProduct.filter((l) => ['SK Hynix', 'Samsung', 'Micron'].includes(l.source)).reduce((s, l) => s + l.value, 0) * 100,
      ) / 100,
      annualVolumeEstimate: topicModule?.ANNUAL_VOLUME_ESTIMATE ?? topicModule?.H200_ANNUAL_VOLUME_ESTIMATE ?? null,
      tsmcVsHynixRatio: hynixFlow > 0 ? Math.round((tsmcFlow / hynixFlow) * 100) / 100 : 0,
      graphNodes: graph.nodes.length,
      graphLinks: graph.links.length,
      secGroundedVendors: graph.secGroundedCount ?? 0,
    },
    nodes,
    links: links.map(({ source, target, value }) => ({ source, target, value })),
    graph: { nodes: graph.nodes, links: graph.links, evidence: graph.evidence },
    secEvidence: secData,
    secFilings,
  };
}

export function writeTopicOutputs(topicId, dataset) {
  const dir = topicDir(topicId);
  mkdirSync(dir, { recursive: true });
  const path = topicSupplyChainPath(topicId);
  writeFileSync(path, JSON.stringify(dataset, null, 2));
  if (dataset.graph) {
    writeFileSync(join(dir, 'supply-chain-graph.json'), JSON.stringify(dataset.graph, null, 2));
  }
  return path;
}

export function writeTopicsIndex(datasets) {
  mkdirSync(PATHS.topics, { recursive: true });
  const index = {
    generatedAt: new Date().toISOString(),
    topics: TOPICS.map((t) => ({
      id: t.id,
      label: t.label,
      shortLabel: t.shortLabel,
      description: t.description,
      category: t.category,
      status: t.status,
      subtitle: t.subtitle,
      anchorCompany: t.anchorCompany ?? null,
      anchorCountry: t.anchorCountry ?? null,
      anchorTicker: t.anchorTicker ?? null,
      disclosureNote: t.disclosureNote ?? null,
      dataFile: t.status === 'active' || t.status === 'limited' ? `${t.id}/supply-chain.json` : null,
      summary: datasets[t.id]?.summary ?? null,
    })),
  };
  writeFileSync(join(PATHS.topics, 'index.json'), JSON.stringify(index, null, 2));
  // Legacy compat for older imports
  if (datasets['nvidia-h200']) {
    writeFileSync(PATHS.supplyChainJson, JSON.stringify(datasets['nvidia-h200'], null, 2));
  }
  return index;
}

export function buildTopicPipeline(topicMeta, secData, processed, secGrounded) {
  const topicModule = TOPIC_MODULES[topicMeta.id];
  if (!topicModule) throw new Error(`No topic module for ${topicMeta.id}`);
  const { graph } = buildGraphFromPipeline(topicModule, processed, secGrounded);
  return buildSankeyFromGraph(graph, topicMeta, secData, topicModule);
}

export function buildSankeyDataset(secData = []) {
  const topicMeta = getTopic('nvidia-h200');
  const secGrounded = extractSecGroundedVendors(topicMeta.secWatchlist);
  return buildTopicPipeline(topicMeta, secData, [], secGrounded);
}
