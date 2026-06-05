/**
 * Best-effort fetcher for space-agency / regulator public reports.
 *
 * Uses a real browser User-Agent and Accept headers from the start (many
 * federal sites — FAA, NOAA, GAO — return 403/404 to crawler-shaped UAs but
 * happily serve normal browsers). Falls back to curl when Node fetch fails
 * over HTTP/2 or gets rejected.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { PATHS } from '../paths.mjs';
import { isPdfBytes, extractHtmlDocumentText } from '../materials/html-resolve.mjs';
import { hasPdftotext, pdfToText } from '../materials/fetch-document.mjs';

const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 200;

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const BROWSER_HEADERS = {
  'User-Agent': BROWSER_USER_AGENT,
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'identity', // Node decodes for us; some servers misbehave with br
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastFetch = 0;

async function rateLimitedBrowserFetch(url, opts = {}) {
  const elapsed = Date.now() - lastFetch;
  if (elapsed < 600) await sleep(600 - elapsed);
  lastFetch = Date.now();
  const headers = { ...BROWSER_HEADERS, ...opts.headers };
  if (opts.referer) headers.Referer = opts.referer;
  return fetch(url, { headers, redirect: 'follow' });
}

function curlFetchBytes(url, opts = {}) {
  const args = [
    '-sSL',
    '--max-time', '120',
    '-A', BROWSER_USER_AGENT,
    '-H', `Accept: ${BROWSER_HEADERS.Accept}`,
    '-H', `Accept-Language: ${BROWSER_HEADERS['Accept-Language']}`,
  ];
  if (opts.referer) args.push('-e', opts.referer);
  args.push(url);
  return Buffer.from(execFileSync('curl', args, { maxBuffer: 96 * 1024 * 1024 }));
}

async function fetchUrlBuffer(url, opts = {}) {
  try {
    const res = await rateLimitedBrowserFetch(url, opts);
    if (res.status === 403 || res.status === 404 || res.status === 406) {
      // Retry with curl — some servers reject Node fetch's specific TLS/HTTP2 shape.
      const buf = curlFetchBytes(url, opts);
      if (buf.length > 0) return { buf, via: 'curl-fallback' };
      throw new Error(`HTTP ${res.status} for ${url}`);
    }
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} for ${url}`);
    }
    return { buf: Buffer.from(await res.arrayBuffer()), via: 'fetch' };
  } catch (err) {
    try {
      const buf = curlFetchBytes(url, opts);
      if (buf.length > 0) return { buf, via: 'curl-rescue' };
    } catch {
      /* fall through */
    }
    throw err;
  }
}

/**
 * Save a public-report URL into dir, extracting PDF text where possible.
 * @param {string} url
 * @param {string} dir
 * @param {{ force?: boolean, basename?: string, referer?: string }} [opts]
 */
async function fetchReportToDir(url, dir, opts = {}) {
  mkdirSync(dir, { recursive: true });
  const basename = opts.basename ?? 'report';
  const textPath = join(dir, `${basename}.txt`);
  const metaPath = join(dir, `${basename}-meta.json`);

  if (!opts.force && existsSync(textPath) && readFileSync(textPath, 'utf8').length > 5000) {
    const meta = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, 'utf8')) : {};
    return { ...meta, cached: true, text: readFileSync(textPath, 'utf8'), textPath };
  }

  const result = {
    sourceUrl: url,
    scrapedAt: new Date().toISOString(),
    sourceType: null,
    textLength: 0,
    via: null,
    error: null,
  };

  try {
    const { buf, via } = await fetchUrlBuffer(url, { referer: opts.referer });
    result.via = via;

    if (isPdfBytes(buf)) {
      if (!hasPdftotext()) {
        result.error = 'pdftotext not installed (brew install poppler)';
        writeFileSync(metaPath, JSON.stringify(result, null, 2));
        return result;
      }
      const pdfPath = join(dir, `${basename}.pdf`);
      writeFileSync(pdfPath, buf);
      const text = pdfToText(pdfPath, textPath);
      result.sourceType = 'pdf';
      result.textLength = text.length;
      writeFileSync(metaPath, JSON.stringify(result, null, 2));
      return { ...result, text, textPath };
    }

    const html = buf.toString('utf8');
    writeFileSync(join(dir, `${basename}.html`), html);
    const text = extractHtmlDocumentText(html);
    writeFileSync(textPath, text);
    result.sourceType = 'html';
    result.textLength = text.length;
    writeFileSync(metaPath, JSON.stringify(result, null, 2));
    return { ...result, text, textPath };
  } catch (err) {
    result.error = err.message;
    writeFileSync(metaPath, JSON.stringify(result, null, 2));
    return result;
  }
}

function chunkText(text, meta) {
  const chunks = [];
  let offset = 0;
  let index = 0;
  while (offset < text.length) {
    const end = Math.min(offset + CHUNK_SIZE, text.length);
    let sliceEnd = end;
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('. ', end);
      if (lastPeriod > offset + CHUNK_SIZE * 0.6) sliceEnd = lastPeriod + 1;
    }
    const slice = text.slice(offset, sliceEnd).trim();
    if (slice.length > 80) {
      const id = createHash('sha256')
        .update(`${meta.reportId}-${index}-${slice.slice(0, 64)}`)
        .digest('hex')
        .slice(0, 16);
      chunks.push({
        id,
        index,
        text: slice,
        charStart: offset,
        charEnd: sliceEnd,
        ...meta,
      });
      index++;
    }
    offset = sliceEnd - CHUNK_OVERLAP;
    if (offset <= 0 || sliceEnd >= text.length) break;
  }
  return chunks;
}

/**
 * @param {Array<{id:string,agency:string,title:string,year:number,url:string,note?:string,referer?:string}>} reports
 * @param {{ force?: boolean }} [opts]
 */
export async function fetchPublicReports(reports, { force = false } = {}) {
  const results = [];
  for (const report of reports) {
    if (!report.url || report.skipFetch) {
      console.log(`  · ${report.id}: skipped (no direct URL${report.note ? ' — ' + report.note : ''})`);
      results.push({ ...report, skipped: true, chunks: [] });
      continue;
    }

    const dir = join(PATHS.rawPublicSpace, report.id);
    console.log(`  · ${report.id}: fetching ${report.agency} — ${report.title}`);
    try {
      const doc = await fetchReportToDir(report.url, dir, {
        force,
        basename: 'report',
        referer: report.referer,
      });
      if (doc.error) {
        console.log(`    ✗ ${doc.error}`);
        results.push({ ...report, error: doc.error, chunks: [] });
        continue;
      }

      const textPath = doc.textPath ?? join(dir, 'report.txt');
      const text = doc.text ?? (existsSync(textPath) ? readFileSync(textPath, 'utf8') : '');
      const meta = {
        source: 'public-report',
        reportId: report.id,
        agency: report.agency,
        title: report.title,
        year: report.year,
      };
      const chunks = chunkText(text, meta);
      const tag = doc.cached ? 'cached' : (doc.sourceType ?? '?');
      const viaLabel = doc.via ? ` (${doc.via})` : '';
      console.log(`    ✓ ${tag}${viaLabel} · ${text.length.toLocaleString()} chars · ${chunks.length} chunks`);
      results.push({ ...report, sourceType: doc.sourceType, textLength: text.length, via: doc.via ?? null, chunks });
    } catch (err) {
      console.log(`    ✗ ${err.message}`);
      results.push({ ...report, error: err.message, chunks: [] });
    }
  }
  return results;
}
