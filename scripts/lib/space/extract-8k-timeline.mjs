/**
 * 8-K event timeline per ticker.
 *
 * Reads the cached submissions.json for each ticker and classifies recent
 * 8-K filings by the SEC item codes already embedded in submissions.recent.items.
 * Operational tempo that 10-K snapshots miss — material agreements,
 * earnings, officer changes, disclosure-trigger events.
 *
 * Output: static/<topicId>/event-timeline/index.json + per-ticker JSON
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { companyRawDir, topicStaticDir } from '../paths.mjs';

const ITEM_DESCRIPTIONS = {
  '1.01': { label: 'Material agreement entered', category: 'contract' },
  '1.02': { label: 'Material agreement terminated', category: 'contract' },
  '1.03': { label: 'Bankruptcy / receivership', category: 'distress' },
  '2.01': { label: 'Acquisition or disposition', category: 'm-and-a' },
  '2.02': { label: 'Earnings results', category: 'earnings' },
  '2.03': { label: 'Material direct financial obligation', category: 'financing' },
  '2.04': { label: 'Triggering events accelerating debt', category: 'distress' },
  '2.05': { label: 'Costs of exit / disposal', category: 'distress' },
  '2.06': { label: 'Material impairment', category: 'distress' },
  '3.01': { label: 'Notice of delisting / non-compliance', category: 'distress' },
  '3.02': { label: 'Unregistered equity sale', category: 'financing' },
  '3.03': { label: 'Material modification to security holder rights', category: 'governance' },
  '4.01': { label: 'Auditor changes', category: 'governance' },
  '4.02': { label: 'Non-reliance on prior financials', category: 'distress' },
  '5.01': { label: 'Change in control', category: 'm-and-a' },
  '5.02': { label: 'Officer / director change', category: 'governance' },
  '5.03': { label: 'Amendments to charter or bylaws', category: 'governance' },
  '5.04': { label: 'Trading plans', category: 'governance' },
  '5.05': { label: 'Code of ethics amendment', category: 'governance' },
  '5.07': { label: 'Submission of matters to vote', category: 'governance' },
  '5.08': { label: 'Shareholder director nominations', category: 'governance' },
  '6.01': { label: 'ABS informational / computational material', category: 'other' },
  '7.01': { label: 'Regulation FD disclosure', category: 'disclosure' },
  '8.01': { label: 'Other events', category: 'disclosure' },
  '9.01': { label: 'Financial statements / exhibits', category: 'disclosure' },
};

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
  const cikInt = parseInt(String(cik), 10);
  return `https://www.sec.gov/Archives/edgar/data/${cikInt}/${plain}/${doc || accession + '-index.htm'}`;
}

function classifyItems(itemString) {
  if (!itemString) return [];
  return itemString
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((code) => ({
      code,
      label: ITEM_DESCRIPTIONS[code]?.label ?? code,
      category: ITEM_DESCRIPTIONS[code]?.category ?? 'other',
    }));
}

function dominantCategory(items) {
  // Priority: distress > m-and-a > contract > financing > earnings > governance > disclosure > other
  const order = ['distress', 'm-and-a', 'contract', 'financing', 'earnings', 'governance', 'disclosure', 'other'];
  let best = 'other';
  let bestIdx = order.indexOf(best);
  for (const it of items) {
    const idx = order.indexOf(it.category);
    if (idx >= 0 && idx < bestIdx) {
      best = it.category;
      bestIdx = idx;
    }
  }
  return best;
}

export function extractTimelineForTicker(ticker, { windowDays = 365 } = {}) {
  const submissions = loadSubmissions(ticker);
  if (!submissions) return { ticker, error: 'No submissions.json' };
  const meta = loadMeta(ticker) ?? {};
  const r = submissions.filings?.recent;
  if (!r) return { ticker, error: 'Empty recent' };

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - windowDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const events = [];
  for (let i = 0; i < r.form.length; i++) {
    if (r.form[i] !== '8-K') continue;
    const date = r.filingDate[i];
    if (date < cutoffStr) continue;
    const items = classifyItems(r.items?.[i] ?? '');
    events.push({
      accessionNumber: r.accessionNumber[i],
      filingDate: date,
      reportDate: r.reportDate?.[i] ?? null,
      items,
      category: dominantCategory(items),
      summary: items.map((it) => it.label).join('; '),
      url: buildEdgarUrl(meta.cik, r.accessionNumber[i], r.primaryDocument[i]),
    });
  }

  events.sort((a, b) => b.filingDate.localeCompare(a.filingDate));

  const byCategory = new Map();
  for (const e of events) {
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + 1);
  }
  const byMonth = new Map();
  for (const e of events) {
    const key = e.filingDate.slice(0, 7);
    byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
  }

  return {
    ticker,
    name: meta.name ?? null,
    windowDays,
    cutoff: cutoffStr,
    total: events.length,
    byCategory: [...byCategory.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({ category, count })),
    monthlyCounts: [...byMonth.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, count]) => ({ month, count })),
    events,
  };
}

export function extractTimelineForTopic({ topicId, tickers, windowDays = 365 }) {
  const outDir = join(topicStaticDir(topicId), 'event-timeline');
  mkdirSync(outDir, { recursive: true });

  const summaries = [];
  for (const ticker of tickers) {
    const result = extractTimelineForTicker(ticker, { windowDays });
    if (result.error) {
      summaries.push({ ticker, error: result.error });
      continue;
    }
    writeFileSync(join(outDir, `${ticker}.json`), JSON.stringify(result, null, 2));
    summaries.push({
      ticker,
      name: result.name,
      total: result.total,
      byCategory: result.byCategory,
      latestDate: result.events[0]?.filingDate ?? null,
    });
  }

  const index = {
    generatedAt: new Date().toISOString(),
    topicId,
    windowDays,
    itemDescriptions: ITEM_DESCRIPTIONS,
    tickers: summaries.sort((a, b) => (b.total ?? 0) - (a.total ?? 0)),
  };
  writeFileSync(join(outDir, 'index.json'), JSON.stringify(index, null, 2));
  return index;
}
