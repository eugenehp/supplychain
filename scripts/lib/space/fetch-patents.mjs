/**
 * USPTO PatentsView — granted patents per assignee.
 *
 * Endpoint: https://search.patentsview.org/api/v1/patent/
 * Free, requires User-Agent. Filters patents by assignee organization name
 * across the last N years for each ticker. Aggregates count, top CPC class,
 * and surfaces recent titles.
 *
 * Output: static/<topicId>/patents/<TICKER>.json + index.json
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { topicStaticDir, companyRawDir } from '../paths.mjs';

const PV_URL = 'https://search.patentsview.org/api/v1/patent/';
const API_KEY = process.env.PATENTSVIEW_API_KEY ?? null;
const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function loadMeta(ticker) {
  const p = join(companyRawDir(ticker), 'metadata.json');
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; }
}

function assigneeVariants(ticker, meta) {
  const set = new Set();
  if (meta?.name) {
    set.add(meta.name);
    set.add(meta.name.replace(/,?\s+(?:Inc\.?|Corporation|Corp\.?|Company|Ltd\.?|LLC|PLC|Holdings|Group)\.?$/i, '').trim());
  }
  const overrides = {
    RKLB: ['Rocket Lab USA, Inc.', 'Rocket Lab'],
    ASTS: ['AST & Science', 'AST SpaceMobile'],
    PL: ['Planet Labs', 'Planet'],
    BKSY: ['BlackSky Global', 'BlackSky'],
    SPIR: ['Spire Global', 'Spire'],
    MNTS: ['Momentus'],
    RDW: ['Redwire', 'Made In Space'],
    IRDM: ['Iridium Communications'],
    VSAT: ['ViaSat', 'Viasat'],
    GSAT: ['Globalstar'],
    LMT: ['Lockheed Martin'],
    NOC: ['Northrop Grumman'],
    RTX: ['Raytheon Technologies', 'Raytheon Company', 'RTX'],
    LHX: ['L3Harris Technologies', 'Aerojet Rocketdyne'],
    BA: ['The Boeing Company', 'Boeing'],
  };
  if (overrides[ticker]) for (const v of overrides[ticker]) set.add(v);
  return [...set];
}

async function queryPatents(assignee, years = 7) {
  const cutoffYear = new Date().getFullYear() - years;
  const body = {
    q: {
      _and: [
        { _text_phrase: { 'assignees.assignee_organization': assignee } },
        { _gte: { patent_year: cutoffYear } },
      ],
    },
    f: ['patent_id', 'patent_title', 'patent_date', 'patent_year', 'cpc_current.cpc_class_id', 'assignees.assignee_organization'],
    o: { size: 100, page: 1 },
    s: [{ patent_date: 'desc' }],
  };
  try {
    const headers = {
      'User-Agent': BROWSER_UA,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    if (API_KEY) headers['X-Api-Key'] = API_KEY;
    const res = await fetch(PV_URL, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.patents) ? json.patents : [];
  } catch {
    return [];
  }
}

function uniqByPatentId(rows) {
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    if (!r?.patent_id) continue;
    if (seen.has(r.patent_id)) continue;
    seen.add(r.patent_id);
    out.push(r);
  }
  return out;
}

function aggregate(patents) {
  const byYear = new Map();
  const byCpc = new Map();
  for (const p of patents) {
    const yr = p.patent_year ?? (p.patent_date ?? '').slice(0, 4);
    if (yr) byYear.set(Number(yr), (byYear.get(Number(yr)) ?? 0) + 1);
    for (const c of p.cpc_current ?? []) {
      const cls = c?.cpc_class_id;
      if (cls) byCpc.set(cls, (byCpc.get(cls) ?? 0) + 1);
    }
  }
  return {
    total: patents.length,
    byYear: [...byYear.entries()].sort((a, b) => a[0] - b[0]).map(([year, count]) => ({ year, count })),
    topCpc: [...byCpc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([cpc, count]) => ({ cpc, count })),
  };
}

export async function fetchPatentsForTicker(ticker, { years = 7 } = {}) {
  const meta = loadMeta(ticker);
  const variants = assigneeVariants(ticker, meta);
  const merged = [];
  for (const v of variants) {
    const rows = await queryPatents(v, years);
    merged.push(...rows);
    await sleep(800);
  }
  const deduped = uniqByPatentId(merged);
  return {
    ticker,
    assigneeVariants: variants,
    ...aggregate(deduped),
    recent: deduped.slice(0, 15).map((p) => ({
      patentId: p.patent_id,
      title: p.patent_title,
      date: p.patent_date,
      assignee: (p.assignees ?? []).map((a) => a.assignee_organization).filter(Boolean).join('; ').slice(0, 200),
      cpc: (p.cpc_current ?? []).slice(0, 3).map((c) => c.cpc_class_id).filter(Boolean),
    })),
  };
}

export async function fetchPatentsForTopic({ topicId, tickers, years = 7 }) {
  const outDir = join(topicStaticDir(topicId), 'patents');
  mkdirSync(outDir, { recursive: true });

  if (!API_KEY) {
    console.log('  · PatentsView API key not configured (set PATENTSVIEW_API_KEY env var); skipping.');
    const index = {
      generatedAt: new Date().toISOString(),
      topicId,
      years,
      tickers: [],
      note: 'PATENTSVIEW_API_KEY not set. Get a free key at https://patentsview.org/forms/api-key',
    };
    writeFileSync(join(outDir, 'index.json'), JSON.stringify(index, null, 2));
    return index;
  }

  const summary = [];
  for (const ticker of tickers) {
    console.log(`  · ${ticker}: USPTO patents…`);
    try {
      const result = await fetchPatentsForTicker(ticker, { years });
      writeFileSync(join(outDir, `${ticker}.json`), JSON.stringify(result, null, 2));
      summary.push({
        ticker,
        total: result.total,
        topCpc: result.topCpc.slice(0, 3).map((c) => c.cpc),
      });
      console.log(`    ✓ ${result.total} patents`);
    } catch (err) {
      summary.push({ ticker, error: err.message });
      console.log(`    ✗ ${err.message}`);
    }
  }
  const index = {
    generatedAt: new Date().toISOString(),
    topicId,
    years,
    tickers: summary.sort((a, b) => (b.total ?? 0) - (a.total ?? 0)),
  };
  writeFileSync(join(outDir, 'index.json'), JSON.stringify(index, null, 2));
  return index;
}
