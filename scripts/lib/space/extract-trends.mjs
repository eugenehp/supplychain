/**
 * Multi-year XBRL trend extractor.
 *
 * Reads each ticker's cached companyfacts.json and pulls the last N annual
 * fiscal-year values for revenue, R&D, COGS, capex, OCF, cash, net income,
 * and total assets. Output drives the trend-sparkline panel.
 *
 * No new SEC scrape — purely re-shapes the bytes we already have on disk.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { companyRawDir, topicStaticDir } from '../paths.mjs';

const SERIES = {
  revenue: ['Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'SalesRevenueNet'],
  rd: ['ResearchAndDevelopmentExpense'],
  cogs: ['CostOfRevenue', 'CostOfGoodsAndServicesSold'],
  grossProfit: ['GrossProfit'],
  capex: ['PaymentsToAcquirePropertyPlantAndEquipment'],
  operatingCashFlow: ['NetCashProvidedByUsedInOperatingActivities'],
  cash: ['CashAndCashEquivalentsAtCarryingValue', 'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents'],
  netIncome: ['NetIncomeLoss'],
  assets: ['Assets'],
};

const ANNUAL_FORMS = new Set(['10-K', '20-F', '40-F']);

function loadCompanyFacts(ticker) {
  const path = join(companyRawDir(ticker), 'companyfacts.json');
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
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

/**
 * Find ALL annual observations for a tag. Returns { fy, value, end, filed, form }[]
 */
function annualSeries(facts, tags) {
  const out = [];
  const seenEnd = new Set();
  for (const taxonomy of ['us-gaap', 'ifrs-full', 'dei']) {
    for (const tag of tags) {
      const concept = facts?.facts?.[taxonomy]?.[tag];
      if (!concept?.units) continue;
      const unit = concept.units.USD ?? Object.values(concept.units)[0];
      if (!unit) continue;
      for (const u of unit) {
        if (!u.end || !ANNUAL_FORMS.has(u.form) || u.fp !== 'FY') continue;
        if (seenEnd.has(u.end)) continue;
        seenEnd.add(u.end);
        const fy = parseInt(u.end.slice(0, 4), 10);
        out.push({ fy, value: u.val, end: u.end, filed: u.filed, form: u.form });
      }
    }
  }
  out.sort((a, b) => a.end.localeCompare(b.end));
  return out;
}

function pickLastN(series, n) {
  return series.slice(-n);
}

function ratioSeries(a, b) {
  if (!a?.length || !b?.length) return [];
  const bByEnd = new Map(b.map((p) => [p.end, p.value]));
  return a.map((p) => {
    const denom = bByEnd.get(p.end);
    if (!Number.isFinite(denom) || denom === 0) return { fy: p.fy, end: p.end, value: null };
    return { fy: p.fy, end: p.end, value: (p.value / denom) * 100 };
  });
}

function growthSeries(series) {
  if (!series?.length) return [];
  const out = [];
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1].value;
    const curr = series[i].value;
    if (!Number.isFinite(prev) || prev === 0 || !Number.isFinite(curr)) {
      out.push({ fy: series[i].fy, end: series[i].end, value: null });
      continue;
    }
    out.push({ fy: series[i].fy, end: series[i].end, value: ((curr - prev) / Math.abs(prev)) * 100 });
  }
  return out;
}

function extractForTicker(ticker, { years = 5 } = {}) {
  const facts = loadCompanyFacts(ticker);
  const meta = loadMeta(ticker) ?? {};
  if (!facts) return { ticker, error: 'No companyfacts.json' };

  /** @type {Record<string, Array<{fy:number, end:string, value:number}>>} */
  const raw = {};
  for (const [key, tags] of Object.entries(SERIES)) {
    raw[key] = pickLastN(annualSeries(facts, tags), years);
  }

  // Derived
  const grossMarginPct = ratioSeries(raw.grossProfit, raw.revenue);
  const rdPctRevenue = ratioSeries(raw.rd, raw.revenue);
  const capexPctRevenue = ratioSeries(raw.capex, raw.revenue);
  const revenueGrowthPct = growthSeries(raw.revenue);

  return {
    ticker,
    name: meta.name ?? null,
    cik: meta.cik ?? null,
    years,
    series: {
      revenue: raw.revenue,
      rd: raw.rd,
      cogs: raw.cogs,
      grossProfit: raw.grossProfit,
      capex: raw.capex,
      operatingCashFlow: raw.operatingCashFlow,
      cash: raw.cash,
      netIncome: raw.netIncome,
      assets: raw.assets,
      grossMarginPct,
      rdPctRevenue,
      capexPctRevenue,
      revenueGrowthPct,
    },
  };
}

export function extractTrendsForTopic({ topicId, tickers, years = 5 }) {
  const rows = tickers.map((t) => extractForTicker(t, { years }));
  return {
    generatedAt: new Date().toISOString(),
    topicId,
    years,
    seriesLabels: {
      revenue: 'Revenue',
      rd: 'R&D',
      cogs: 'Cost of revenue',
      grossProfit: 'Gross profit',
      capex: 'Capex',
      operatingCashFlow: 'Operating cash flow',
      cash: 'Cash',
      netIncome: 'Net income',
      assets: 'Total assets',
      grossMarginPct: 'Gross margin %',
      rdPctRevenue: 'R&D / revenue %',
      capexPctRevenue: 'Capex / revenue %',
      revenueGrowthPct: 'Revenue growth %',
    },
    companies: rows,
  };
}

export function writeTrends({ topicId, tickers, years = 5 }) {
  const result = extractTrendsForTopic({ topicId, tickers, years });
  const outDir = join(topicStaticDir(topicId), 'trends');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'companies.json'), JSON.stringify(result, null, 2));
  return result;
}
