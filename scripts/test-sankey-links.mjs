#!/usr/bin/env node
/**
 * Verify Sankey dataset links layout completely (no orphans, zero-width, or bad paths).
 */
import { readFileSync } from 'node:fs';
import { sankey } from 'd3-sankey';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = join(root, 'data/topics/nvidia-h200/supply-chain.json');
const data = JSON.parse(readFileSync(dataPath, 'utf8'));

function tierNodeAlign(tierCap) {
  return (node) => Math.max(0, Math.min(tierCap, tierCap - (node.tier ?? 0)));
}

function annotateNodeFlow(nodes, links) {
  const flow = new Map(nodes.map((n) => [n.id, 0]));
  for (const l of links) {
    const v = l.value ?? 0;
    flow.set(l.source, (flow.get(l.source) ?? 0) + v);
    flow.set(l.target, (flow.get(l.target) ?? 0) + v);
  }
  for (const n of nodes) n._flow = flow.get(n.id) ?? 0;
}

function sankeyLinkRibbon(d) {
  const w = Math.max(d.width ?? 1, 0);
  const half = w / 2;
  const x0 = d.source.x1;
  const x1 = d.target.x0;
  const y0 = d.y0 ?? 0;
  const y1 = d.y1 ?? 0;
  const xi = (x0 + x1) / 2;
  return `M${x0},${y0 - half}C${xi},${y0 - half} ${xi},${y1 - half} ${x1},${y1 - half}L${x1},${y1 + half}C${xi},${y1 + half} ${xi},${y0 + half} ${x0},${y0 + half}Z`;
}

function layout(dataset, tierCap = 5) {
  const nodes = dataset.nodes.filter((n) => n.tier <= tierCap).map((n) => ({ ...n }));
  const ids = new Set(nodes.map((n) => n.id));
  const links = dataset.links
    .filter((l) => ids.has(l.source) && ids.has(l.target))
    .map((l) => ({ source: l.source, target: l.target, value: Math.max(l.value ?? 0, 0.01) }));
  annotateNodeFlow(nodes, links);

  const width = 1200;
  const height = 2000;
  const margin = { top: 52, right: 220, bottom: 36, left: 220 };
  const innerHeight = height - margin.top - margin.bottom - 16;
  const nodePadding = Math.max(22, Math.min(42, innerHeight / Math.max(nodes.length, 1) - 2));

  return sankey()
    .nodeId((d) => d.id)
    .nodeAlign(tierNodeAlign(tierCap))
    .nodeWidth(20)
    .nodePadding(nodePadding)
    .iterations(96)
    .nodeSort((a, b) => (b._flow ?? 0) - (a._flow ?? 0) || String(a.name ?? '').localeCompare(b.name ?? ''))
    .linkSort((a, b) => b.value - a.value)
    .extent([
      [margin.left, margin.top + 12],
      [width - margin.right, height - margin.bottom],
    ])({ nodes, links });
}

const nodeIds = new Set(data.nodes.map((n) => n.id));
const orphans = data.links.filter((l) => !nodeIds.has(l.source) || !nodeIds.has(l.target));
const pathGen = sankeyLinkRibbon;
let failed = false;

if (orphans.length) {
  console.error(`FAIL: ${orphans.length} orphan link(s)`);
  failed = true;
}

for (const tierCap of [1, 2, 3, 4, 5]) {
  const ids = new Set(data.nodes.filter((n) => n.tier <= tierCap).map((n) => n.id));
  const expected = data.links.filter((l) => ids.has(l.source) && ids.has(l.target)).length;
  const graph = layout(data, tierCap);
  const zeroW = graph.links.filter((l) => !l.width || l.width < 0.01);
  const badPaths = graph.links.filter((l) => {
    const d = pathGen(l);
    return !d || d.includes('NaN');
  });

  if (graph.links.length !== expected) {
    console.error(`FAIL tier ${tierCap}: expected ${expected} links, got ${graph.links.length}`);
    failed = true;
  }
  if (zeroW.length) {
    console.error(`FAIL tier ${tierCap}: ${zeroW.length} zero-width link(s)`);
    failed = true;
  }
  if (badPaths.length) {
    console.error(`FAIL tier ${tierCap}: ${badPaths.length} invalid path(s)`);
    failed = true;
  }
  console.log(`tier ${tierCap}: ${graph.links.length} links OK`);
}

if (failed) process.exit(1);
console.log(`All ${data.links.length} Sankey links layout correctly.`);
