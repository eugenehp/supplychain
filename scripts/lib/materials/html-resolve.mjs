import { htmlToText } from '../filing-processor.mjs';

const PDF_PATH_RE = /\.pdf(?:[?#]|$)/i;
const ANNUAL_HINT_RE =
  /\b(?:annual\s+report|annual\s+financial|report\s+for\s+the\s+year|aif|annual\s+information|md\s*&?\s*a|financial\s+statements|investor\s+cent(?:er|re)|integrated\s+report)\b/i;
const SKIP_LINK_RE =
  /\b(?:privacy|cookie|contact|careers|login|signup|twitter|facebook|linkedin|instagram|youtube)\b/i;

/** @param {Buffer | Uint8Array} buf */
export function isPdfBytes(buf) {
  return buf.length >= 4 && buf.subarray(0, 4).toString() === '%PDF';
}

/**
 * Prefer main/article content regions before stripping tags.
 * @param {string} html
 */
export function extractHtmlDocumentText(html) {
  const regions = [
    /<main[\s>][\s\S]*?<\/main>/i,
    /<article[\s>][\s\S]*?<\/article>/i,
    /<div[^>]+class="[^"]*(?:entry-content|post-content|page-content|annual-report|report-body|elementor-widget-theme-post-content)[^"]*"[^>]*>[\s\S]*?<\/div>/i,
    /<section[^>]+class="[^"]*(?:annual|report|content)[^"]*"[^>]*>[\s\S]*?<\/section>/i,
  ];
  for (const re of regions) {
    const m = html.match(re);
    if (m && m[0].length > 400) {
      const text = htmlToText(m[0]);
      if (text.length > 300) return text;
    }
  }
  return htmlToText(html);
}

/** Detect IRM/hosting placeholder pages returned instead of PDFs. */
export function isBlockedPlaceholderText(text) {
  return /how did you arrive here|website hasn't been set up|incorrect URL/i.test(String(text ?? ''));
}

/** @param {{ textLength?: number, parsed?: { text?: string } } | null | undefined} result @param {number} [minChars] */
export function isUsableExtract(result, minChars = 500) {
  if (!result?.textLength || result.textLength < minChars) return false;
  if (isBlockedPlaceholderText(result.parsed?.text)) return false;
  return true;
}

/**
 * Resolve relative URLs against a base.
 * @param {string} href
 * @param {string} baseUrl
 */
export function resolveUrl(href, baseUrl) {
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return null;
  }
}

/**
 * Score and extract PDF / report HTML links from a page.
 * @param {string} html
 * @param {string} baseUrl
 * @param {{ max?: number }} [opts]
 * @returns {{ type: 'pdf' | 'html', url: string, label: string, score: number }[]}
 */
export function discoverDocumentLinks(html, baseUrl, { max = 10 } = {}) {
  /** @type {Map<string, { type: 'pdf' | 'html', url: string, label: string, score: number }>} */
  const found = new Map();

  const add = (href, anchorText = '') => {
    const url = resolveUrl(href, baseUrl);
    if (!url || url.startsWith('mailto:') || url.startsWith('javascript:')) return;

    const lower = `${url} ${anchorText}`.toLowerCase();
    if (SKIP_LINK_RE.test(lower)) return;

    const isPdf = PDF_PATH_RE.test(url);
    const hasAnnualHint = ANNUAL_HINT_RE.test(lower);
    if (!isPdf && !hasAnnualHint) return;

    let score = 0;
    if (isPdf) score += 40;
    if (hasAnnualHint) score += 30;
    if (/\b20(?:2[3-9]|3[0-9])\b/.test(lower)) score += 15;
    if (/\bfy\s*20/.test(lower)) score += 10;
    if (/annual\s+report/i.test(lower)) score += 20;
    if (/appendix\s+4e|half.year|quarterly|agm|notice of meeting/i.test(lower)) score -= 25;

    const type = isPdf ? 'pdf' : 'html';
    const prev = found.get(url);
    if (!prev || score > prev.score) {
      found.set(url, {
        type,
        url,
        label: anchorText.trim().slice(0, 120) || url.split('/').pop() || url,
        score,
      });
    }
  };

  for (const m of html.matchAll(/href=["']([^"']+)["']/gi)) add(m[1]);

  for (const m of html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const text = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    add(m[1], text);
  }

  for (const m of html.matchAll(/(?:src|data)=["']([^"']+\.pdf[^"']*)["']/gi)) add(m[1]);

  return [...found.values()]
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max);
}

/**
 * Expand an HTML index page into follow-up PDF/HTML sources (same host preferred).
 * @param {string} html
 * @param {string} pageUrl
 */
export function expandHtmlSources(html, pageUrl) {
  let host = '';
  try {
    host = new URL(pageUrl).host;
  } catch {
    return [];
  }

  return discoverDocumentLinks(html, pageUrl, { max: 12 })
    .sort((a, b) => {
      const ah = a.url.includes(host) ? 1 : 0;
      const bh = b.url.includes(host) ? 1 : 0;
      return bh - ah || b.score - a.score;
    })
    .map(({ type, url, label }) => ({ type, url, label, referer: pageUrl }));
}
