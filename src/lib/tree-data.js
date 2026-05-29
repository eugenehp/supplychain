import { filterSankeyByMaxTier, clampSankeyTier } from './sankey-data.js';

/**
 * Filtered graph + supply-chain tree for radial tree layout.
 * Each vendor is placed under its primary customer (largest $/chip outbound link).
 */
export function getTreeGraph(data, maxTier = 5) {
  const filtered = filterSankeyByMaxTier(data, clampSankeyTier(maxTier));
  return {
    nodes: filtered.nodes ?? [],
    links: filtered.links ?? [],
    tree: buildSupplyRadialTree(filtered),
  };
}

export function buildSupplyRadialTree(filtered) {
  const { nodes, links } = filtered;
  if (!nodes?.length) return null;

  const product = nodes.find((n) => n.tier === 0);
  if (!product) return null;

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  /** @type {Map<string, { target: string, value: number }>} */
  const bestOutLink = new Map();
  for (const link of links) {
    const prev = bestOutLink.get(link.source);
    if (!prev || link.value > prev.value) {
      bestOutLink.set(link.source, { target: link.target, value: link.value });
    }
  }

  /** @type {Map<string, { id: string, value: number }[]>} */
  const childrenByParent = new Map();
  for (const [sourceId, { target, value }] of bestOutLink) {
    if (!nodeById.has(target)) continue;
    if (!childrenByParent.has(target)) childrenByParent.set(target, []);
    childrenByParent.get(target).push({ id: sourceId, value });
  }

  for (const kids of childrenByParent.values()) {
    kids.sort((a, b) => b.value - a.value);
  }

  function flowIn(id) {
    let sum = 0;
    for (const link of links) {
      if (link.target === id) sum += link.value ?? 0;
    }
    return sum;
  }

  function build(id, visited) {
    const node = nodeById.get(id);
    if (!node) return null;

    const kids = (childrenByParent.get(id) ?? [])
      .filter((k) => !visited.has(k.id))
      .map((k) => build(k.id, new Set(visited).add(id)))
      .filter(Boolean);

    return {
      name: node.name,
      id: node.id,
      tier: node.tier,
      group: node.group,
      description: node.description,
      value: Math.max(flowIn(id), 0.01),
      children: kids.length ? kids : undefined,
    };
  }

  return build(product.id, new Set());
}
