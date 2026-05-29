import { filterSankeyByMaxTier, clampSankeyTier } from './sankey-data.js';

/**
 * Pack layout + filtered graph for d3.pack and flow overlays.
 * Each tier is a group; vendor leaves are sized by $/chip flow.
 */
export function getPackGraph(data, maxTier = 5) {
  const filtered = filterSankeyByMaxTier(data, clampSankeyTier(maxTier));
  return {
    nodes: filtered.nodes ?? [],
    links: filtered.links ?? [],
    tree: buildPackHierarchyFromFiltered(filtered, maxTier),
  };
}

function buildPackHierarchyFromFiltered(filtered, maxTier) {
  const { nodes, links } = filtered;
  if (!nodes?.length) return null;

  const product = nodes.find((n) => n.tier === 0) ?? nodes[0];
  const inflow = new Map();
  const outflow = new Map();

  for (const link of links) {
    outflow.set(link.source, (outflow.get(link.source) ?? 0) + link.value);
    inflow.set(link.target, (inflow.get(link.target) ?? 0) + link.value);
  }

  function nodeValue(id) {
    const node = nodes.find((n) => n.id === id);
    if (!node) return 1;
    if (node.tier === 1 && product) {
      const direct = links.find((l) => l.source === id && l.target === product.id);
      if (direct) return direct.value;
    }
    return Math.max(inflow.get(id) ?? 0, outflow.get(id) ?? 0, 1);
  }

  const tierCap = clampSankeyTier(maxTier);
  const tierLabels = [
    '',
    'Tier 1 — Direct suppliers',
    'Tier 2 — Fab inputs',
    'Tier 3 — Sub-components',
    'Tier 4 — Raw materials',
    'Tier 5 — Bulk / extractive',
  ];

  const children = [];
  for (let tier = 1; tier <= tierCap; tier++) {
    const tierNodes = nodes
      .filter((n) => n.tier === tier)
      .map((n) => ({
        ...n,
        name: n.name,
        id: n.id,
        value: nodeValue(n.id),
      }))
      .sort((a, b) => b.value - a.value);

    if (!tierNodes.length) continue;
    children.push({
      name: tierLabels[tier] ?? `Tier ${tier}`,
      id: `__tier_${tier}`,
      tier,
      isTierGroup: true,
      children: tierNodes,
    });
  }

  return {
    name: product.name,
    id: product.id,
    tier: 0,
    group: product.group ?? 'product',
    isRoot: true,
    description: product.description,
    children,
  };
}

export function buildPackHierarchy(data, maxTier = 5) {
  const filtered = filterSankeyByMaxTier(data, clampSankeyTier(maxTier));
  return buildPackHierarchyFromFiltered(filtered, maxTier);
}
