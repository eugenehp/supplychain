/**
 * USAspending.gov federal contract awards.
 *
 * Endpoint: POST https://api.usaspending.gov/api/v2/search/spending_by_award/
 * Free, no auth. Filter by recipient_name; aggregate obligated amount per
 * fiscal year and per agency.
 *
 * Output: static/<topicId>/contracts/<TICKER>.json + index.json
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { topicStaticDir, companyRawDir } from '../paths.mjs';

const USA_API = 'https://api.usaspending.gov/api/v2/search/spending_by_award/';
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function recipientNameVariants(ticker, meta) {
  const base = meta?.name ?? ticker;
  const variants = new Set();
  variants.add(base);
  // Common abbreviations: drop CORP/INC/LLC suffixes; also try base in upper case.
  const stripped = base.replace(/,?\s+(?:Inc\.?|Corporation|Corp\.?|Company|Ltd\.?|LLC|PLC|Holdings|Group|Technologies|Technology|Systems|Industries|International)\.?$/i, '').trim();
  if (stripped !== base) variants.add(stripped);
  variants.add(base.toUpperCase());

  // Hand overrides for ticker mismatches with company-of-record names.
  const overrides = {
    RKLB: ['ROCKET LAB USA, INC.', 'Rocket Lab USA Inc'],
    ASTS: ['AST & SCIENCE, LLC', 'AST SpaceMobile Inc', 'AST SpaceMobile'],
    LMT: ['LOCKHEED MARTIN CORPORATION', 'Lockheed Martin'],
    NOC: ['NORTHROP GRUMMAN SYSTEMS CORPORATION', 'Northrop Grumman'],
    RTX: ['RTX CORPORATION', 'RAYTHEON COMPANY', 'RAYTHEON TECHNOLOGIES CORPORATION'],
    LHX: ['L3HARRIS TECHNOLOGIES, INC.', 'AEROJET ROCKETDYNE INC.', 'AEROJET ROCKETDYNE HOLDINGS, INC.'],
    BA: ['BOEING COMPANY, THE', 'THE BOEING COMPANY'],
    IRDM: ['IRIDIUM COMMUNICATIONS INC.', 'IRIDIUM SATELLITE LLC'],
    VSAT: ['VIASAT, INC.'],
    GSAT: ['GLOBALSTAR, INC.'],
    PL: ['PLANET LABS PBC', 'PLANET LABS FEDERAL INC.'],
    BKSY: ['BLACKSKY TECHNOLOGY INC.'],
    SPIR: ['SPIRE GLOBAL, INC.', 'SPIRE FEDERAL LLC'],
    MNTS: ['MOMENTUS INC.'],
    RDW: ['REDWIRE SPACE INC.'],
  };
  if (overrides[ticker]) for (const v of overrides[ticker]) variants.add(v);
  return [...variants];
}

async function fetchAwards(recipientName, { years = 5 } = {}) {
  const now = new Date();
  const start = new Date(now);
  start.setFullYear(start.getFullYear() - years);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = now.toISOString().slice(0, 10);

  const body = {
    filters: {
      recipient_search_text: [recipientName],
      time_period: [{ start_date: startStr, end_date: endStr }],
      award_type_codes: ['A', 'B', 'C', 'D'],   // contracts
    },
    fields: [
      'Award ID',
      'Recipient Name',
      'Awarding Agency',
      'Awarding Sub Agency',
      'Award Type',
      'Award Amount',
      'Period of Performance Start Date',
      'Period of Performance Current End Date',
      'NAICS Code',
      'NAICS Description',
      'PSC Code',
      'Description',
    ],
    page: 1,
    limit: 100,
    sort: 'Award Amount',
    order: 'desc',
    subawards: false,
  };

  const res = await fetch(USA_API, {
    method: 'POST',
    headers: BROWSER_HEADERS,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`USAspending ${res.status}`);
  const data = await res.json();
  return Array.isArray(data.results) ? data.results : [];
}

function loadMeta(ticker) {
  const path = join(companyRawDir(ticker), 'metadata.json');
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function aggregate(rawAwards) {
  const byAgency = new Map();
  const byYear = new Map();
  let total = 0;
  for (const a of rawAwards) {
    const amount = Number(a['Award Amount']) || 0;
    if (amount <= 0) continue;
    total += amount;
    const agency = a['Awarding Agency'] ?? 'Unknown';
    byAgency.set(agency, (byAgency.get(agency) ?? 0) + amount);
    const startDate = a['Period of Performance Start Date'];
    const fy = startDate ? Number(startDate.slice(0, 4)) : null;
    if (fy) byYear.set(fy, (byYear.get(fy) ?? 0) + amount);
  }
  return {
    totalAmount: total,
    awardCount: rawAwards.length,
    byAgency: [...byAgency.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([agency, amount]) => ({ agency, amount })),
    byYear: [...byYear.entries()].sort((a, b) => a[0] - b[0]).map(([year, amount]) => ({ year, amount })),
  };
}

export async function fetchContractsForTicker(ticker, { years = 5, perRequestDelayMs = 350 } = {}) {
  const meta = loadMeta(ticker);
  const variants = recipientNameVariants(ticker, meta);
  const seen = new Set();
  const merged = [];
  for (const name of variants) {
    try {
      const results = await fetchAwards(name, { years });
      for (const r of results) {
        const key = `${r['Award ID']}|${r['Recipient Name']}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(r);
      }
    } catch (err) {
      // Continue — some recipients yield no results.
    }
    await sleep(perRequestDelayMs);
  }

  const agg = aggregate(merged);
  return {
    ticker,
    queryVariants: variants,
    sampleRecipients: [...new Set(merged.map((a) => a['Recipient Name']).filter(Boolean))].slice(0, 5),
    ...agg,
    topAwards: merged.slice(0, 15).map((a) => ({
      id: a['Award ID'],
      recipient: a['Recipient Name'],
      agency: a['Awarding Agency'],
      subAgency: a['Awarding Sub Agency'],
      amount: Number(a['Award Amount']) || 0,
      psc: a['PSC Code'],
      naics: a['NAICS Description'],
      description: (a['Description'] ?? '').slice(0, 240),
      periodStart: a['Period of Performance Start Date'],
      periodEnd: a['Period of Performance Current End Date'],
    })),
  };
}

export async function extractContractsForTopic({ topicId, tickers, years = 5 }) {
  const outDir = join(topicStaticDir(topicId), 'contracts');
  mkdirSync(outDir, { recursive: true });

  const summary = [];
  for (const ticker of tickers) {
    console.log(`  · ${ticker}: USAspending awards…`);
    try {
      const result = await fetchContractsForTicker(ticker, { years });
      writeFileSync(join(outDir, `${ticker}.json`), JSON.stringify(result, null, 2));
      summary.push({
        ticker,
        recipientUsed: result.sampleRecipients[0] ?? null,
        totalAmount: result.totalAmount,
        awardCount: result.awardCount,
        topAgency: result.byAgency[0]?.agency ?? null,
        years: result.byYear.length,
      });
      console.log(`    ✓ $${(result.totalAmount / 1e6).toFixed(1)}M across ${result.awardCount} awards`);
    } catch (err) {
      summary.push({ ticker, error: err.message });
      console.log(`    ✗ ${err.message}`);
    }
  }
  const index = {
    generatedAt: new Date().toISOString(),
    topicId,
    years,
    tickers: summary.sort((a, b) => (b.totalAmount ?? 0) - (a.totalAmount ?? 0)),
  };
  writeFileSync(join(outDir, 'index.json'), JSON.stringify(index, null, 2));
  return index;
}
