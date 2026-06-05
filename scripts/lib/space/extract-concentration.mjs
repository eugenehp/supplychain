/**
 * Per-company × per-subsystem Herfindahl-Hirschman Index (HHI) over named
 * supplier mention shares. Quantifies "is this company single-source-exposed
 * in propulsion vs avionics vs solar?" from the same supplier-catalog hits
 * that drive the Sankey.
 *
 * HHI = Σ s_i² for supplier shares (0-1) within each subsystem.
 *   0       → infinitely fragmented (impossible)
 *   0.25    → ~4 equal suppliers
 *   0.50    → 2 equal suppliers
 *   1.00    → single source
 *
 * Output: static/<topicId>/concentration/companies.json
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { topicStaticDir, topicStaticSecDir } from '../paths.mjs';
import { SUPPLIERS, SUBSYSTEM_CATEGORIES, SUB } from './supplier-catalog.mjs';

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

function hhi(shares) {
  return shares.reduce((sum, s) => sum + s * s, 0);
}

function bucketLabel(score) {
  if (score >= 0.75) return 'sole-source';
  if (score >= 0.5) return 'highly-concentrated';
  if (score >= 0.25) return 'concentrated';
  if (score >= 0.15) return 'moderate';
  return 'diversified';
}

export function extractConcentrationForTopic({ topicId, tickers }) {
  const subsystemIds = SUBSYSTEM_CATEGORIES.map((s) => s.id);

  const companies = [];
  for (const ticker of tickers) {
    const text = loadFilingText(topicId, ticker);
    if (!text) continue;

    /** @type {Record<string, { supplier: string, mentions: number }[]>} */
    const bySubsystem = Object.fromEntries(subsystemIds.map((id) => [id, []]));
    for (const supplier of SUPPLIERS) {
      if (supplier.tier !== 2) continue;
      const n = countMatches(text, supplier.pattern);
      if (n > 0) bySubsystem[supplier.subsystem].push({ supplier: supplier.label, mentions: n });
    }

    const subsystems = subsystemIds
      .map((id) => {
        const rows = bySubsystem[id];
        if (!rows.length) return null;
        const total = rows.reduce((s, r) => s + r.mentions, 0);
        const shares = rows.map((r) => r.mentions / total);
        const score = hhi(shares);
        return {
          subsystem: id,
          label: SUB[id]?.label ?? id,
          totalMentions: total,
          supplierCount: rows.length,
          topSupplier: rows.sort((a, b) => b.mentions - a.mentions)[0]?.supplier ?? null,
          hhi: Number(score.toFixed(3)),
          bucket: bucketLabel(score),
          breakdown: rows.map((r) => ({ supplier: r.supplier, mentions: r.mentions, share: Number((r.mentions / total).toFixed(3)) })),
        };
      })
      .filter(Boolean);

    const totalMentions = subsystems.reduce((n, s) => n + s.totalMentions, 0);
    const weightedHHI = subsystems.length
      ? subsystems.reduce((n, s) => n + s.hhi * (s.totalMentions / totalMentions), 0)
      : 0;

    // Worst bucket is now derived from the weightedHHI (avoids "100% sole-source"
    // false positives when one subsystem has a single named supplier in the catalog
    // with tiny sample size).
    const overallBucket = bucketLabel(weightedHHI);

    // Flag genuinely sole-source-exposed subsystems: HHI ≥ 0.75 AND ≥ 3 mentions
    // (filters out 1-supplier × 1-mention noise).
    const exposedSubsystems = subsystems.filter(
      (s) => s.hhi >= 0.75 && s.totalMentions >= 3,
    );

    companies.push({
      ticker,
      subsystemCount: subsystems.length,
      totalSupplierMentions: totalMentions,
      weightedHHI: Number(weightedHHI.toFixed(3)),
      overallBucket,
      exposedSubsystemCount: exposedSubsystems.length,
      exposedSubsystems: exposedSubsystems.map((s) => ({
        subsystem: s.label,
        hhi: s.hhi,
        topSupplier: s.topSupplier,
        totalMentions: s.totalMentions,
      })),
      subsystems,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    topicId,
    buckets: [
      { id: 'diversified', threshold: 0, label: 'Diversified (HHI < 0.15)' },
      { id: 'moderate', threshold: 0.15, label: 'Moderate (0.15–0.25)' },
      { id: 'concentrated', threshold: 0.25, label: 'Concentrated (0.25–0.50)' },
      { id: 'highly-concentrated', threshold: 0.5, label: 'Highly concentrated (0.50–0.75)' },
      { id: 'sole-source', threshold: 0.75, label: 'Sole-source exposure (HHI ≥ 0.75)' },
    ],
    companies,
  };
}

export function writeConcentration({ topicId, tickers }) {
  const result = extractConcentrationForTopic({ topicId, tickers });
  const outDir = join(topicStaticDir(topicId), 'concentration');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'companies.json'), JSON.stringify(result, null, 2));
  return result;
}
