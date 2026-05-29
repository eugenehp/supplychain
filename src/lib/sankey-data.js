export const MIN_SANKEY_TIER = 1;
export const MAX_SANKEY_TIER = 5;

/** Filter Sankey graph to tiers 0..maxTier (inclusive). Product is always tier 0. */
export function filterSankeyByMaxTier(data, maxTier = MAX_SANKEY_TIER) {
  if (!data?.nodes?.length) return data;

  const cap = Math.max(0, Math.min(MAX_SANKEY_TIER, maxTier));
  const nodes = data.nodes.filter((n) => (n.tier ?? 99) <= cap);
  const ids = new Set(nodes.map((n) => n.id));
  const links = (data.links ?? []).filter((l) => ids.has(l.source) && ids.has(l.target));

  return { ...data, nodes, links };
}

export function visibleTierLabels(allLabels, maxTier) {
  const cap = Math.max(0, Math.min(MAX_SANKEY_TIER, maxTier));
  return allLabels.slice(0, cap + 1);
}

export function tierColumnX(tier, maxTier, margin, width) {
  const inner = width - margin.left - margin.right;
  if (maxTier <= 0) return margin.left + inner * 0.9;
  const frac = 1 - tier / maxTier;
  return margin.left + frac * inner;
}

export function clampSankeyTier(value) {
  return Math.max(MIN_SANKEY_TIER, Math.min(MAX_SANKEY_TIER, value));
}

export function tierDepthLabel(maxTier) {
  if (maxTier <= 1) return 'Product + Tier 1';
  return `Product → Tier ${maxTier}`;
}
