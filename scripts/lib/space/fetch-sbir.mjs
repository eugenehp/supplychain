/**
 * SBIR.gov awards (Phase I/II/III for SBIR + STTR).
 * Free, no auth. Endpoint: https://api.www.sbir.gov/public/api/awards?firm=...
 *
 * Output: static/<topicId>/sbir/index.json (+ per-company stubs)
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { topicStaticDir, companyRawDir } from '../paths.mjs';

const SBIR_URL = 'https://api.www.sbir.gov/public/api/awards';
const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function loadMeta(ticker) {
  const p = join(companyRawDir(ticker), 'metadata.json');
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; }
}

function companyNames(ticker, meta) {
  const set = new Set();
  if (meta?.name) {
    const base = meta.name;
    set.add(base);
    set.add(base.replace(/,?\s+(?:Inc\.?|Corporation|Corp\.?|Company|Ltd\.?|LLC|PLC|Holdings|Group|Technologies|Technology)\.?$/i, '').trim());
  }
  const overrides = {
    RKLB: ['Rocket Lab USA, Inc.', 'Rocket Lab'],
    ASTS: ['AST & Science', 'AST SpaceMobile'],
    PL: ['Planet Labs', 'Planet'],
    BKSY: ['BlackSky', 'BlackSky Global'],
    SPIR: ['Spire Global', 'Spire Federal'],
    MNTS: ['Momentus'],
    RDW: ['Redwire', 'Made In Space', 'Adcole Space'],
    IRDM: ['Iridium'],
    VSAT: ['ViaSat', 'Viasat'],
    GSAT: ['Globalstar'],
    LMT: ['Lockheed Martin'],
    NOC: ['Northrop Grumman'],
    RTX: ['Raytheon', 'RTX'],
    LHX: ['L3Harris', 'Aerojet Rocketdyne'],
    BA: ['Boeing'],
  };
  if (overrides[ticker]) for (const v of overrides[ticker]) set.add(v);
  return [...set];
}

async function searchByFirm(firm) {
  // SBIR.gov rate-limits at 10 req / 10 min. Cap to 1 fetch per name with 65s spacing.
  const url = `${SBIR_URL}?firm=${encodeURIComponent(firm)}&rows=200&format=json`;
  let lastErr = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': BROWSER_UA, Accept: 'application/json' } });
      const text = await res.text();
      if (text.includes('exceeded the rate limit')) {
        lastErr = new Error('rate-limit');
        await sleep(65_000);
        continue;
      }
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status}`);
        await sleep(1500);
        continue;
      }
      const data = JSON.parse(text);
      if (Array.isArray(data)) return data;
      if (Array.isArray(data.data)) return data.data;
      return [];
    } catch (err) {
      lastErr = err;
      await sleep(2500);
    }
  }
  // Throw so caller can record the error but pipeline continues.
  throw lastErr ?? new Error('sbir unknown');
}

function dedupAwards(awards) {
  const seen = new Set();
  const out = [];
  for (const a of awards) {
    const key = `${a.award_title}|${a.award_year}|${a.firm}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(a);
  }
  return out;
}

function aggregate(rawAwards) {
  let total = 0;
  const byAgency = new Map();
  const byYear = new Map();
  const byPhase = new Map();
  for (const a of rawAwards) {
    const amount = Number(a.award_amount) || 0;
    if (amount > 0) total += amount;
    const agency = a.agency ?? 'Unknown';
    byAgency.set(agency, (byAgency.get(agency) ?? 0) + amount);
    const year = a.award_year ?? null;
    if (year) byYear.set(year, (byYear.get(year) ?? 0) + amount);
    const phase = a.phase ?? 'Unknown';
    byPhase.set(phase, (byPhase.get(phase) ?? 0) + 1);
  }
  return {
    totalAmount: total,
    awardCount: rawAwards.length,
    byAgency: [...byAgency.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([agency, amount]) => ({ agency, amount })),
    byYear: [...byYear.entries()].sort((a, b) => a[0] - b[0]).map(([year, amount]) => ({ year, amount })),
    byPhase: [...byPhase.entries()].map(([phase, count]) => ({ phase, count })),
  };
}

export async function fetchSbirForTicker(ticker) {
  const meta = loadMeta(ticker);
  const names = companyNames(ticker, meta);
  // Cap to first 2 name variants per ticker to stay under the 10 req / 10 min limit.
  const limitedNames = names.slice(0, 2);
  const all = [];
  for (const name of limitedNames) {
    try {
      const results = await searchByFirm(name);
      all.push(...results);
    } catch { /* skip — rate-limited or no data */ }
    await sleep(65_000);  // SBIR rate-limit window: 10 req / 10 min ≈ 1 req per minute.
  }
  const deduped = dedupAwards(all);
  const agg = aggregate(deduped);

  return {
    ticker,
    queriedNames: names,
    sampleFirms: [...new Set(deduped.map((a) => a.firm).filter(Boolean))].slice(0, 5),
    ...agg,
    topAwards: deduped
      .sort((a, b) => (Number(b.award_amount) || 0) - (Number(a.award_amount) || 0))
      .slice(0, 12)
      .map((a) => ({
        title: a.award_title,
        firm: a.firm,
        agency: a.agency,
        branch: a.branch,
        phase: a.phase,
        year: a.award_year,
        amount: Number(a.award_amount) || 0,
        abstract: (a.abstract ?? '').slice(0, 320),
        url: a.award_link ?? null,
      })),
  };
}

export async function fetchSbirForTopic({ topicId, tickers }) {
  const outDir = join(topicStaticDir(topicId), 'sbir');
  mkdirSync(outDir, { recursive: true });

  const summary = [];
  for (const ticker of tickers) {
    console.log(`  · ${ticker}: SBIR awards…`);
    try {
      const result = await fetchSbirForTicker(ticker);
      writeFileSync(join(outDir, `${ticker}.json`), JSON.stringify(result, null, 2));
      summary.push({
        ticker,
        totalAmount: result.totalAmount,
        awardCount: result.awardCount,
        topAgency: result.byAgency[0]?.agency ?? null,
        sampleFirms: result.sampleFirms,
      });
      console.log(`    ✓ ${result.awardCount} awards · $${(result.totalAmount / 1e6).toFixed(1)}M`);
    } catch (err) {
      summary.push({ ticker, error: err.message });
      console.log(`    ✗ ${err.message}`);
    }
  }
  const index = {
    generatedAt: new Date().toISOString(),
    topicId,
    tickers: summary.sort((a, b) => (b.totalAmount ?? 0) - (a.totalAmount ?? 0)),
  };
  writeFileSync(join(outDir, 'index.json'), JSON.stringify(index, null, 2));
  return index;
}
