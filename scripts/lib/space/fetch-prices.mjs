/**
 * Daily price history from Yahoo Finance v8 chart endpoint.
 * Free, no key. Returns JSON.
 *   https://query2.finance.yahoo.com/v8/finance/chart/{TICKER}?range=2y&interval=1d
 *
 * Output: static/<topicId>/prices/<TICKER>.json
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { topicStaticDir } from '../paths.mjs';

const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FMP_KEY = process.env.FMP_API_KEY ?? null;
const HEADERS = {
  'User-Agent': BROWSER_UA,
  Accept: 'application/json,text/plain,*/*',
  Referer: 'https://finance.yahoo.com/',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function curlFetch(url) {
  const args = ['-sSL', '--max-time', '60', '-A', BROWSER_UA, '-H', 'Referer: https://finance.yahoo.com/', url];
  return execFileSync('curl', args, { maxBuffer: 32 * 1024 * 1024 }).toString('utf8');
}

async function fetchChartJsonYahoo(ticker, range = '2y') {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=${range}&interval=1d`;
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) {
      if (res.status === 429) throw new Error('Yahoo 429 (IP throttled)');
      throw new Error(`Yahoo ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    throw err;
  }
}

async function fetchFmpJson(ticker, range) {
  if (!FMP_KEY) throw new Error('No FMP_API_KEY');
  const days = range === '5y' ? 1825 : range === '2y' ? 730 : 365;
  const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${encodeURIComponent(ticker)}?timeseries=${days}&apikey=${FMP_KEY}`;
  const res = await fetch(url, { headers: { 'User-Agent': BROWSER_UA, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`FMP ${res.status}`);
  const json = await res.json();
  // FMP format → Yahoo-like normalized form.
  const historical = (json?.historical ?? []).reverse();   // chronological order
  return {
    chart: {
      result: [{
        timestamp: historical.map((h) => Math.floor(new Date(h.date).getTime() / 1000)),
        indicators: {
          quote: [{
            open: historical.map((h) => h.open),
            high: historical.map((h) => h.high),
            low: historical.map((h) => h.low),
            close: historical.map((h) => h.close),
            volume: historical.map((h) => h.volume),
          }],
          adjclose: [{ adjclose: historical.map((h) => h.adjClose ?? h.close) }],
        },
      }],
    },
  };
}

async function fetchChartJson(ticker, range = '2y') {
  if (FMP_KEY) {
    try { return await fetchFmpJson(ticker, range); } catch { /* fall through to Yahoo */ }
  }
  return await fetchChartJsonYahoo(ticker, range);
}

function parseChart(json) {
  const result = json?.chart?.result?.[0];
  if (!result) return [];
  const timestamps = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0] ?? {};
  const adj = result.indicators?.adjclose?.[0]?.adjclose ?? [];
  const out = [];
  for (let i = 0; i < timestamps.length; i++) {
    const ts = timestamps[i];
    const close = quote.close?.[i];
    if (!Number.isFinite(close)) continue;
    out.push({
      date: new Date(ts * 1000).toISOString().slice(0, 10),
      open: quote.open?.[i] ?? null,
      high: quote.high?.[i] ?? null,
      low: quote.low?.[i] ?? null,
      close,
      adjClose: adj[i] ?? null,
      volume: quote.volume?.[i] ?? null,
    });
  }
  return out;
}

export async function fetchPricesForTicker(ticker, { range = '2y' } = {}) {
  const json = await fetchChartJson(ticker, range);
  const points = parseChart(json);
  if (!points.length) {
    return { ticker, error: 'No data', points: [] };
  }
  return {
    ticker,
    source: 'query2.finance.yahoo.com/v8',
    range,
    points,
    summary: {
      first: points[0],
      last: points[points.length - 1],
      ytdReturnPct: points.length > 1
        ? ((points[points.length - 1].close / points[0].close) - 1) * 100
        : null,
    },
  };
}

export async function fetchPricesForTopic({ topicId, tickers, years = 2 }) {
  const outDir = join(topicStaticDir(topicId), 'prices');
  mkdirSync(outDir, { recursive: true });
  const range = years >= 5 ? '5y' : years >= 2 ? '2y' : '1y';

  const summary = [];
  for (const ticker of tickers) {
    try {
      const result = await fetchPricesForTicker(ticker, { range });
      writeFileSync(join(outDir, `${ticker}.json`), JSON.stringify(result));
      const ret = result.summary?.ytdReturnPct;
      summary.push({
        ticker,
        pointCount: result.points.length,
        firstDate: result.points[0]?.date,
        lastDate: result.points.at(-1)?.date,
        lastClose: result.points.at(-1)?.close,
        windowReturnPct: ret,
        error: result.error,
      });
      console.log(`    ✓ ${ticker}: ${result.points.length} bars · ${ret != null ? ret.toFixed(1) + '%' : '—'} return`);
    } catch (err) {
      summary.push({ ticker, error: err.message });
      console.log(`    ✗ ${ticker}: ${err.message}`);
    }
    await sleep(500);
  }
  const indexPath = join(outDir, 'index.json');
  writeFileSync(indexPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    topicId,
    range,
    tickers: summary,
  }, null, 2));
  return summary;
}
