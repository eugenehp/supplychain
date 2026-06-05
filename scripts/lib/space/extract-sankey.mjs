/**
 * Per-ticker supply-chain Sankey extractor.
 *
 * For each of the 15 SEC filers, scans the company's filing.txt for the
 * curated supplier catalog and emits a {nodes, links} payload compatible
 * with the existing SankeyChart.svelte component.
 *
 * Tier model (same shape as accelerator topics):
 *   Tier 0 — Product (per-ticker anchor)
 *   Tier 1 — Subsystem categories (propulsion, avionics, …)
 *   Tier 2 — Named suppliers
 *   Tier 3 — Raw inputs / materials
 *
 * Link `value` = mention count in the company's 10-K. Not dollar-weighted,
 * but proportional weighting still tells you which subsystems dominate the
 * filing's narrative.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { topicStaticDir, topicStaticSecDir } from '../paths.mjs';
import { SUPPLIERS, SUBSYSTEM_CATEGORIES, TICKER_PRODUCTS, SUB } from './supplier-catalog.mjs';

const MIN_LINK_VALUE = 1;
const MIN_SUPPLIER_HITS = 2;     // suppress one-off mentions

function loadFilingText(topicId, ticker) {
  const path = join(topicStaticSecDir(topicId, ticker), 'filing.txt');
  if (!existsSync(path)) return null;
  return readFileSync(path, 'utf8');
}

function loadFilingMeta(topicId, ticker) {
  const path = join(topicStaticSecDir(topicId, ticker), 'metadata.json');
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return {};
  }
}

function countMatches(text, pattern) {
  const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
  const matches = text.match(re);
  return matches ? matches.length : 0;
}

function clean(name) {
  return String(name).trim();
}

/** Walk the supplier catalog and build per-ticker node/link sets. */
function buildSankeyForTicker(topicId, ticker) {
  const text = loadFilingText(topicId, ticker);
  if (!text) return null;
  const meta = loadFilingMeta(topicId, ticker);
  const productMeta = TICKER_PRODUCTS[ticker] ?? { product: meta.name ?? ticker, segment: null };

  /** @type {Map<string, { id: string, name: string, tier: number, group: string, description?: string, country?: string|null, mentionScore: number }>} */
  const nodes = new Map();
  /** @type {Map<string, { source: string, target: string, value: number }>} */
  const linkMap = new Map();

  // Filing length used to normalize mention counts for cross-company comparison.
  const filingChars = text.length;

  const productNode = {
    id: productMeta.product,
    name: productMeta.product,
    tier: 0,
    group: 'product',
    description: `${ticker} 10-K / 20-F · ${meta.filing?.form ?? ''} ${meta.filing?.filingDate ?? ''}`.trim(),
    country: productMeta.country ?? 'US',
    mentionScore: 0,
  };
  nodes.set(productNode.id, productNode);

  // Tier-1 subsystem nodes are added lazily as we find suppliers that belong to them.
  function ensureSubsystem(subId) {
    const meta = SUB[subId];
    if (!meta) return null;
    const id = meta.label;
    if (!nodes.has(id)) {
      nodes.set(id, {
        id,
        name: meta.label,
        tier: 1,
        group: meta.color,
        description: `Subsystem category — ${meta.label}`,
        country: null,
        mentionScore: 0,
        disclosure: 'aggregate',
      });
    }
    return id;
  }

  function ensureMaterial(materialId) {
    const supplier = SUPPLIERS.find((s) => s.id === materialId);
    if (!supplier || supplier.tier !== 3) return null;
    if (!nodes.has(supplier.label)) {
      nodes.set(supplier.label, {
        id: supplier.label,
        name: supplier.label,
        tier: 3,
        group: SUB[supplier.subsystem]?.color ?? 'material',
        description: `Raw input — ${supplier.label}`,
        country: supplier.country ?? null,
        mentionScore: 0,
        disclosure: 'industry-modeled',
      });
    }
    return supplier.label;
  }

  function addLink(sourceId, targetId, value) {
    if (!sourceId || !targetId || value <= 0) return;
    const key = `${sourceId}→${targetId}`;
    const prev = linkMap.get(key) ?? { source: sourceId, target: targetId, value: 0 };
    prev.value += value;
    linkMap.set(key, prev);
  }

  // Pass 1 — Tier 2 suppliers and Tier 1 subsystem subgroups.
  for (const supplier of SUPPLIERS) {
    if (supplier.tier !== 2 && supplier.tier !== 1) continue;
    const hits = countMatches(text, supplier.pattern);
    if (hits < MIN_SUPPLIER_HITS) continue;

    if (supplier.tier === 1) {
      // It IS the subsystem-level node (e.g., "Space-grade ASIC / FPGA") — link directly to product.
      const subId = ensureSubsystem(supplier.subsystem);
      const node = nodes.get(subId);
      if (node) node.mentionScore += hits;
      addLink(subId, productNode.id, hits);
      continue;
    }

    const subId = ensureSubsystem(supplier.subsystem);
    if (!subId) continue;

    // Disclosure tier — explicit if the supplier is named ≥3 times, otherwise heuristic.
    const disclosure = hits >= 3 ? 'explicit' : 'heuristic';

    const supplierNode = {
      id: supplier.label,
      name: supplier.label,
      tier: 2,
      group: SUB[supplier.subsystem]?.color ?? 'supplier',
      description: `${SUB[supplier.subsystem]?.label ?? 'Supplier'} · ${ticker} 10-K mentions: ${hits}`,
      country: supplier.country ?? null,
      mentionScore: hits,
      disclosure,
    };
    nodes.set(supplier.label, supplierNode);
    addLink(supplier.label, subId, hits);

    // Optional Tier-3 material edges.
    for (const inputId of supplier.inputs ?? []) {
      const materialId = ensureMaterial(inputId);
      if (!materialId) continue;
      // Material's contribution to a supplier is bounded by the supplier's own count.
      const inputSupplier = SUPPLIERS.find((s) => s.id === inputId);
      const inputHits = inputSupplier ? countMatches(text, inputSupplier.pattern) : 0;
      const sharedValue = Math.min(hits, Math.max(1, inputHits));
      addLink(materialId, supplier.label, sharedValue);
      const node = nodes.get(materialId);
      if (node) node.mentionScore += sharedValue;
    }
  }

  // Aggregate subsystem → product values from incoming Tier 2 links.
  for (const node of nodes.values()) {
    if (node.tier !== 1) continue;
    const inbound = [...linkMap.values()].filter((l) => l.target === node.id);
    const aggregate = inbound.reduce((n, l) => n + l.value, 0);
    if (aggregate > 0) {
      addLink(node.id, productNode.id, aggregate);
      node.mentionScore = aggregate;
    }
  }

  const links = [...linkMap.values()].filter((l) => l.value >= MIN_LINK_VALUE);
  const usedIds = new Set([productNode.id]);
  for (const l of links) {
    usedIds.add(l.source);
    usedIds.add(l.target);
  }
  const finalNodes = [...nodes.values()].filter((n) => usedIds.has(n.id));
  productNode.mentionScore = links
    .filter((l) => l.target === productNode.id)
    .reduce((n, l) => n + l.value, 0);

  if (finalNodes.length <= 1 || !links.length) return null;

  return {
    ticker,
    topicId,
    product: productMeta.product,
    segment: productMeta.segment,
    filing: meta.filing ?? null,
    filingUrl: meta.filingUrl ?? null,
    summary: {
      nodeCount: finalNodes.length,
      linkCount: links.length,
      totalFlow: productNode.mentionScore,
      filingChars,
      mentionDensity: filingChars > 0 ? Number((productNode.mentionScore / (filingChars / 1000)).toFixed(2)) : 0,
      subsystemBreakdown: finalNodes
        .filter((n) => n.tier === 1)
        .map((n) => ({ subsystem: n.name, score: n.mentionScore }))
        .sort((a, b) => b.score - a.score),
      countryBreakdown: (() => {
        const tally = new Map();
        for (const n of finalNodes) {
          if (n.tier !== 2 || !n.country) continue;
          tally.set(n.country, (tally.get(n.country) ?? 0) + (n.mentionScore ?? 0));
        }
        return [...tally.entries()]
          .map(([country, score]) => ({ country, score }))
          .sort((a, b) => b.score - a.score);
      })(),
      countries: [...new Set(finalNodes.map((n) => n.country).filter(Boolean))].sort(),
      explicitSuppliers: finalNodes.filter((n) => n.tier === 2 && n.disclosure === 'explicit').length,
      heuristicSuppliers: finalNodes.filter((n) => n.tier === 2 && n.disclosure === 'heuristic').length,
    },
    nodes: finalNodes,
    links,
  };
}

/**
 * @param {{ topicId: string, tickers: string[] }} params
 */
export function extractSankeysForTopic({ topicId, tickers }) {
  const outDir = join(topicStaticDir(topicId), 'sankey');
  mkdirSync(outDir, { recursive: true });

  const index = [];
  for (const ticker of tickers) {
    const result = buildSankeyForTicker(topicId, ticker);
    if (!result) {
      index.push({ ticker, error: 'no supplier matches' });
      continue;
    }
    writeFileSync(join(outDir, `${ticker}.json`), JSON.stringify(result, null, 2));
    index.push({
      ticker,
      product: result.product,
      segment: result.segment,
      nodeCount: result.summary.nodeCount,
      linkCount: result.summary.linkCount,
      totalFlow: result.summary.totalFlow,
      mentionDensity: result.summary.mentionDensity,
      topSubsystems: result.summary.subsystemBreakdown.slice(0, 3).map((s) => s.subsystem),
      countries: result.summary.countries,
      explicitSuppliers: result.summary.explicitSuppliers,
      heuristicSuppliers: result.summary.heuristicSuppliers,
    });
  }
  writeFileSync(join(outDir, 'index.json'), JSON.stringify({
    generatedAt: new Date().toISOString(),
    topicId,
    tickers: index,
  }, null, 2));
  return index;
}
