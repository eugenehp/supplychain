/** @param {number | null | undefined} value */
export function formatFlowUsd(value, { decimals = 'auto' } = {}) {
  if (value == null || Number.isNaN(value)) return '';
  if (decimals === 'auto') {
    if (value >= 100) return `$${Math.round(value)}`;
    if (value >= 10) return `$${value.toFixed(0)}`;
    return `$${value.toFixed(1)}`;
  }
  return `$${value.toFixed(decimals)}`;
}

/** @param {{ targetLinks?: { value: number }[], sourceLinks?: { value: number }[] }} node */
export function nodeFlowTotals(node) {
  const inVal = node.targetLinks?.reduce((s, l) => s + (l.value ?? 0), 0) ?? 0;
  const outVal = node.sourceLinks?.reduce((s, l) => s + (l.value ?? 0), 0) ?? 0;
  return { inVal, outVal };
}

/** Compact in/out label for Sankey nodes. */
export function nodeFlowLabel(node) {
  const { inVal, outVal } = nodeFlowTotals(node);
  const parts = [];
  if (inVal > 0.05) parts.push(`↓${formatFlowUsd(inVal)}`);
  if (outVal > 0.05) parts.push(`↑${formatFlowUsd(outVal)}`);
  return parts.join(' ');
}

/** Top-N link labels only — keeps the Sankey readable. */
export function shouldShowLinkLabel(value, width, rank = 0, maxLabels = 14) {
  return rank < maxLabels && width >= 5 && value >= 8;
}

/** @param {{ y0?: number, y1?: number }} node */
export function nodeHasRoomForValue(node, minHeight = 26) {
  return ((node?.y1 ?? 0) - (node?.y0 ?? 0)) >= minHeight;
}

/** Short name for map labels (max ~14 chars). */
export function abbrevVendor(name, max = 14) {
  if (!name || name.length <= max) return name ?? '';
  const words = name.split(/\s+/);
  if (words.length > 1 && words[0].length <= max - 4) {
    return `${words[0]}…`;
  }
  return `${name.slice(0, max - 1)}…`;
}
