import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { isPdfBytes, extractHtmlDocumentText } from './html-resolve.mjs';

export const USER_AGENT =
  'SupplyChainResearch/1.0 (materials-research; +https://github.com/eugenehp/supplychain)';

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastFetch = 0;

/** @param {string} url @param {{ referer?: string, method?: string, headers?: Record<string, string>, body?: string }} [opts] */
export async function rateLimitedFetch(url, opts = {}) {
  const elapsed = Date.now() - lastFetch;
  if (elapsed < 400) await sleep(400 - elapsed);
  lastFetch = Date.now();
  const headers = {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/pdf,application/json,*/*',
    ...opts.headers,
  };
  if (opts.referer) headers.Referer = opts.referer;
  const res = await fetch(url, {
    headers,
    redirect: 'follow',
    method: opts.method ?? 'GET',
    body: opts.body,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res;
}

/** curl fallback for hosts that break Node fetch over HTTP/2 (e.g. tdk.com). */
function curlFetchBytes(url, opts = {}) {
  const args = ['-sSL', '--max-time', '120', '-A', BROWSER_USER_AGENT];
  if (opts.referer) args.push('-e', opts.referer);
  args.push(url);
  return Buffer.from(execFileSync('curl', args, { maxBuffer: 64 * 1024 * 1024 }));
}

/** @param {string} url @param {{ referer?: string, method?: string, headers?: Record<string, string>, body?: string }} [opts] */
export async function fetchUrlBytes(url, opts = {}) {
  try {
    const res = await rateLimitedFetch(url, opts);
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    if ((opts.method ?? 'GET') !== 'GET') throw err;
    return curlFetchBytes(url, opts);
  }
}

export function hasPdftotext() {
  try {
    execFileSync('which', ['pdftotext'], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

export function pdfToText(pdfPath, txtPath) {
  execFileSync('pdftotext', ['-layout', pdfPath, txtPath], { stdio: 'pipe' });
  return readFileSync(txtPath, 'utf8');
}

/**
 * Fetch URL to dir; return { text, sourceType, sourceUrl, textLength, error? }.
 * @param {string} url
 * @param {string} dir
 * @param {{ type?: 'pdf' | 'html', force?: boolean, basename?: string }} [opts]
 */
export async function fetchDocumentToDir(url, dir, opts = {}) {
  mkdirSync(dir, { recursive: true });
  const basename = opts.basename ?? 'document';
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
    error: null,
  };

  try {
    const res = await rateLimitedFetch(url, { referer: opts.referer });
    const buf = Buffer.from(await res.arrayBuffer());

    if (isPdfBytes(buf)) {
      if (!hasPdftotext()) {
        result.error = 'pdftotext not installed (brew install poppler)';
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
