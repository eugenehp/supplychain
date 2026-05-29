/** Chart SVG rules inlined for PDF export (mirrors Svelte :global chart styles). */
export const CHART_EXPORT_CSS = `
.sankey-wrap svg,
.pack-wrap svg,
.radial-tree-wrap svg,
.map-wrap svg {
  display: block;
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
  overflow: visible;
}

.sankey-wrap .tier-label {
  fill: var(--tier-label, #8892a4);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.sankey-wrap .node-label {
  fill: var(--node-label, #1a1f2e);
  font-size: 13px;
  font-weight: 500;
}

.sankey-wrap .node-value {
  fill: var(--accent);
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.sankey-wrap .link-label text {
  fill: var(--text);
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  paint-order: stroke fill;
  stroke: var(--bg);
  stroke-width: 4px;
  stroke-linejoin: round;
}

.sankey-wrap .logo-initials-text {
  font-size: 8px;
  font-weight: 700;
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
}

.pack-wrap .pack-label-text {
  font-variant-numeric: tabular-nums;
}

.pack-wrap .flow-line {
  stroke-linecap: round;
  opacity: 0.92;
}

.pack-wrap .flow-amount {
  fill: var(--text);
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  paint-order: stroke fill;
  stroke: var(--bg);
  stroke-width: 4px;
  stroke-linejoin: round;
}

.radial-tree-wrap g.tree-label text {
  paint-order: stroke fill;
  stroke: var(--bg);
  stroke-width: 3px;
  stroke-linejoin: round;
  font-variant-numeric: tabular-nums;
}

.radial-tree-wrap g.tree-label text.tree-label-value {
  stroke-width: 2.5px;
}

.map-wrap path.flow {
  stroke-linecap: round;
}

.map-wrap .country-label {
  fill: var(--text-subtle);
  font-size: 11px;
  font-weight: 500;
}

.map-wrap .country-flow-total {
  fill: var(--accent);
  font-size: 9px;
  font-weight: 600;
}

.map-wrap .flow-label-bg {
  fill: var(--surface-solid, #ffffff);
  stroke: var(--border);
  stroke-width: 0.5;
  opacity: 0.94;
}

.map-wrap .flow-companies {
  fill: var(--text);
  font-size: 10px;
  font-weight: 500;
}

.map-wrap .flow-value {
  fill: var(--accent);
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.map-wrap .marker-count {
  fill: var(--map-marker-text, #1a1f2e);
  font-size: 10px;
  font-weight: 700;
}
`;
