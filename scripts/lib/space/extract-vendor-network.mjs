/**
 * Cross-company vendor radial-tree.
 *
 * Where the per-ticker Sankey shows ONE company's supply chain, this view
 * aggregates the supplier-catalog hits across ALL 15 filers and produces a
 * radial hierarchy so you can see which suppliers are cited by multiple
 * companies (shared chokepoints):
 *
 *   Root → Subsystem → Supplier → Filer
 *
 * Reuses the existing RadialTreeChart component — same {nodes, links}
 * shape used by the accelerator tree views.
 *
 * Output: static/<topicId>/vendor-network/tree.json
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { topicStaticDir, topicStaticSecDir } from '../paths.mjs';
import { SUPPLIERS, SUBSYSTEM_CATEGORIES, SUB } from './supplier-catalog.mjs';

const MIN_HITS_PER_FILER = 1;

function loadFilingText(topicId, ticker) {
  const path = join(topicStaticSecDir(topicId, ticker), 'filing.txt');
  if (!existsSync(path)) return null;
  return readFileSync(path, 'utf8');
}

function countMatches(text, pattern) {
  const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
  const m = text.match(re);
  return m ? m.length : 0;
}

/**
 * @param {{ topicId: string, tickers: string[] }} params
 */
export function extractVendorNetworkForTopic({ topicId, tickers }) {
  const texts = new Map();
  for (const t of tickers) {
    const x = loadFilingText(topicId, t);
    if (x) texts.set(t, x);
  }
  if (!texts.size) return { error: 'No filings' };

  const ROOT_ID = 'Space supply chain';
  /** @type {Map<string, object>} */
  const nodes = new Map();
  /** @type {Map<string, object>} */
  const linkMap = new Map();

  nodes.set(ROOT_ID, {
    id: ROOT_ID,
    name: 'Space supply chain',
    tier: 0,
    group: 'product',
    description: `Aggregate vendor citations across ${texts.size} SEC filers`,
    country: null,
    mentionScore: 0,
  });

  function addLink(source, target, value) {
    if (!value || value <= 0) return;
    const key = `${source}→${target}`;
    const prev = linkMap.get(key) ?? { source, target, value: 0 };
    prev.value += value;
    linkMap.set(key, prev);
  }

  // For each supplier, count per-ticker hits.
  /** @type {Map<string, { supplier: object, perFiler: Map<string, number>, total: number }>} */
  const supplierHits = new Map();
  for (const supplier of SUPPLIERS) {
    if (supplier.tier !== 2) continue;
    /** @type {Map<string, number>} */
    const perFiler = new Map();
    let total = 0;
    for (const [ticker, text] of texts.entries()) {
      const n = countMatches(text, supplier.pattern);
      if (n >= MIN_HITS_PER_FILER) {
        perFiler.set(ticker, n);
        total += n;
      }
    }
    if (perFiler.size === 0) continue;
    supplierHits.set(supplier.id, { supplier, perFiler, total });
  }

  // Filter to suppliers with at least 2 filers OR >= 4 mentions (catches niche-but-named).
  const kept = [...supplierHits.values()].filter(
    (s) => s.perFiler.size >= 2 || s.total >= 4,
  );

  // Track which subsystem-supplier pairs we've actually used.
  const usedSubsystems = new Set();

  for (const { supplier, perFiler, total } of kept) {
    const sub = SUB[supplier.subsystem];
    if (!sub) continue;

    // Tier 1: subsystem
    if (!nodes.has(sub.label)) {
      nodes.set(sub.label, {
        id: sub.label,
        name: sub.label,
        tier: 1,
        group: sub.color,
        description: `Subsystem category`,
        country: null,
        mentionScore: 0,
      });
    }
    usedSubsystems.add(sub.label);

    // Tier 2: supplier
    const supplierId = supplier.label;
    nodes.set(supplierId, {
      id: supplierId,
      name: supplier.label,
      tier: 2,
      group: sub.color,
      description: `${sub.label} · ${perFiler.size} filer${perFiler.size === 1 ? '' : 's'} cite this supplier`,
      country: supplier.country ?? null,
      mentionScore: total,
    });
    addLink(supplierId, sub.label, total);

    // Tier 3: filers that cite this supplier (the cross-company signal)
    for (const [ticker, count] of perFiler.entries()) {
      const filerId = `${supplierId} · ${ticker}`;
      nodes.set(filerId, {
        id: filerId,
        name: ticker,
        tier: 3,
        group: sub.color,
        description: `${ticker} cites ${supplier.label} ${count}× in 10-K`,
        country: 'US',
        mentionScore: count,
      });
      addLink(filerId, supplierId, count);
    }
  }

  // Root edge: subsystem → root, value = sum of all subsystem outgoing.
  for (const subLabel of usedSubsystems) {
    const inbound = [...linkMap.values()]
      .filter((l) => l.target === subLabel)
      .reduce((n, l) => n + l.value, 0);
    if (inbound > 0) addLink(subLabel, ROOT_ID, inbound);
  }

  // Trim to used nodes.
  const used = new Set([ROOT_ID]);
  const links = [...linkMap.values()];
  for (const l of links) {
    used.add(l.source);
    used.add(l.target);
  }
  const finalNodes = [...nodes.values()].filter((n) => used.has(n.id));

  // Summary stats.
  const supplierNodes = finalNodes.filter((n) => n.tier === 2);
  const filerNodes = finalNodes.filter((n) => n.tier === 3);
  const sharedSuppliers = kept.filter((s) => s.perFiler.size >= 2).length;
  const topShared = [...kept]
    .sort((a, b) => b.perFiler.size - a.perFiler.size || b.total - a.total)
    .slice(0, 10)
    .map((s) => ({
      supplier: s.supplier.label,
      subsystem: SUB[s.supplier.subsystem]?.label ?? '',
      filers: s.perFiler.size,
      mentions: s.total,
    }));

  return {
    generatedAt: new Date().toISOString(),
    topicId,
    summary: {
      filerCount: texts.size,
      supplierCount: supplierNodes.length,
      filerLinkCount: filerNodes.length,
      sharedSuppliers,
      topShared,
    },
    nodes: finalNodes,
    links,
  };
}

export function writeVendorNetwork({ topicId, tickers }) {
  const result = extractVendorNetworkForTopic({ topicId, tickers });
  if (result.error) return result;
  const outDir = join(topicStaticDir(topicId), 'vendor-network');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'tree.json'), JSON.stringify(result, null, 2));
  return result;
}
