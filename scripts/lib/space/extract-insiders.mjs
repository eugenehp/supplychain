/**
 * Form 4 insider transaction summary per ticker.
 *
 * Pulls the last 12 months of Form 4 filings from each ticker's cached
 * submissions.json — no extra scrape needed. Form 4 disclosure pace
 * (sales / buys / option exercises) tracks insider sentiment, especially
 * useful for SPAC-era space companies where lock-up expirations and
 * concentrated insider sales are common.
 *
 * Output: static/<topicId>/insiders/index.json
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { companyRawDir, topicStaticDir } from '../paths.mjs';

const FORM_FAMILY = new Set(['4', '4/A', '3', '3/A', '5', '5/A', 'SC 13D', 'SC 13D/A', 'SC 13G', 'SC 13G/A']);

function loadSubmissions(ticker) {
  const path = join(companyRawDir(ticker), 'submissions.json');
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

function buildEdgarUrl(cik, accession, doc) {
  if (!accession) return null;
  const plain = accession.replace(/-/g, '');
  const padded = String(cik).padStart(10, '0');
  const cikInt = parseInt(padded, 10);
  return `https://www.sec.gov/Archives/edgar/data/${cikInt}/${plain}/${doc || accession + '-index.htm'}`;
}

function extractInsidersForTicker(ticker, { windowDays = 365 } = {}) {
  const submissions = loadSubmissions(ticker);
  if (!submissions) return { ticker, error: 'No submissions.json' };
  const meta = loadMeta(ticker) ?? {};
  const r = submissions.filings?.recent;
  if (!r) return { ticker, error: 'Empty recent block' };

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - windowDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  /** @type {{ form: string, filingDate: string, accessionNumber: string, primaryDocument: string }[]} */
  const all = [];
  for (let i = 0; i < r.form.length; i++) {
    const form = r.form[i];
    if (!FORM_FAMILY.has(form)) continue;
    const date = r.filingDate[i];
    if (date < cutoffStr) continue;
    all.push({
      form,
      filingDate: date,
      accessionNumber: r.accessionNumber[i],
      primaryDocument: r.primaryDocument[i],
    });
  }

  const byForm = new Map();
  for (const f of all) {
    byForm.set(f.form, (byForm.get(f.form) ?? 0) + 1);
  }
  const byMonth = new Map();
  for (const f of all) {
    const key = f.filingDate.slice(0, 7);
    byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
  }

  // Keep latest 20 for sparkline / table.
  all.sort((a, b) => b.filingDate.localeCompare(a.filingDate));
  const latest = all.slice(0, 20).map((f) => ({
    form: f.form,
    filingDate: f.filingDate,
    accessionNumber: f.accessionNumber,
    url: buildEdgarUrl(meta.cik, f.accessionNumber, f.primaryDocument),
  }));

  return {
    ticker,
    name: meta.name ?? null,
    cik: meta.cik ?? null,
    windowDays,
    cutoff: cutoffStr,
    total: all.length,
    form4Count: byForm.get('4') ?? 0,
    form4ACount: byForm.get('4/A') ?? 0,
    initial35Count: (byForm.get('3') ?? 0) + (byForm.get('5') ?? 0),
    sc13Count: ['SC 13D', 'SC 13D/A', 'SC 13G', 'SC 13G/A'].reduce((n, k) => n + (byForm.get(k) ?? 0), 0),
    byForm: [...byForm.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([form, count]) => ({ form, count })),
    monthlyCounts: [...byMonth.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, count]) => ({ month, count })),
    latest,
  };
}

export function extractInsidersForTopic({ topicId, tickers, windowDays = 365 }) {
  const rows = tickers.map((t) => extractInsidersForTicker(t, { windowDays }));
  const ok = rows.filter((r) => !r.error);
  const ranked = [...ok].sort((a, b) => b.total - a.total);
  return {
    generatedAt: new Date().toISOString(),
    topicId,
    windowDays,
    tickerCount: ok.length,
    rows: ranked,
    errors: rows.filter((r) => r.error),
  };
}

export function writeInsiders({ topicId, tickers, windowDays = 365 }) {
  const result = extractInsidersForTopic({ topicId, tickers, windowDays });
  const outDir = join(topicStaticDir(topicId), 'insiders');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'index.json'), JSON.stringify(result, null, 2));
  return result;
}
