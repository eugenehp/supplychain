import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { rateLimitedFetch } from '../fetch-document.mjs';
import { internationalRawDir } from '../../paths.mjs';

const ASX_API = 'https://asx.api.markitdigital.com/asx-research/1.0';
const ASX_CDN = 'https://cdn-api.markitdigital.com/apiman-gateway/ASX/asx-research/1.0/file';

/** Headlines that look like annual reports (not AGM notices alone). */
const ANNUAL_HEADLINE_RE =
  /\bannual\s+report\b|\bannual\s+financial\s+report\b|\breport\s+for\s+the\s+year\s+ended\b/i;
const ANNUAL_SKIP_RE =
  /\bnotice\s+of\s+annual\b|\bannual\s+general\s+meeting\b|\bremuneration\s+report\s+only\b|\bcorporate\s+governance\s+statement\b|\bappendix\s+4e\b|\bdate\s+of\s+annual\s+report\b/i;

/** NI 43-101 / JORC resource and reserve updates. */
const TECHNICAL_HEADLINE_RE =
  /\bmineral\s+resource\b|\bore\s+reserve\b|\bni\s+43-101\b|\btechnical\s+report\b|\bresource\s+estimate\b|\bproject\s+update\b|\bjorc\b/i;
/** Feasibility / scoping studies (distinct from resource-only updates). */
const FEASIBILITY_HEADLINE_RE =
  /\bfeasibility\s+study\b|\bdefinitive\s+feasibility\b|\bpreliminary\s+feasibility\b|\bscoping\s+study\b|\bprefeasibility\b/i;
const TECHNICAL_SKIP_RE =
  /\bnotice\s+of\s+meeting\b|\bproxy\b|\bcleansing\s+notice\b|\bappendix\s+3b\b/i;

/**
 * @param {string} documentKey
 * @returns {string}
 */
export function asxPdfUrlFromDocumentKey(documentKey) {
  return `${ASX_CDN}/${documentKey}`;
}

/**
 * @param {string} asxCode
 * @param {{ marketSensitive?: boolean, count?: number }} [opts]
 */
export async function fetchAsxAnnouncements(asxCode, { marketSensitive = false, count = 50 } = {}) {
  const code = asxCode.toUpperCase();
  const url = `${ASX_API}/companies/${code}/announcements?count=${count}&market_sensitive=${marketSensitive}`;
  const res = await rateLimitedFetch(url);
  const json = await res.json();
  return {
    symbol: json.data?.symbol ?? code,
    displayName: json.data?.displayName,
    items: json.data?.items ?? [],
  };
}

function parseSizeKb(s) {
  if (!s) return 0;
  const m = String(s).match(/([\d.]+)\s*(KB|MB|GB)/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  const u = m[2].toUpperCase();
  if (u === 'MB') return n * 1024;
  if (u === 'GB') return n * 1024 * 1024;
  return n;
}

function sortAnnouncements(items) {
  return [...items].sort((a, b) => {
    const da = new Date(a.date ?? 0).getTime();
    const db = new Date(b.date ?? 0).getTime();
    if (db !== da) return db - da;
    return parseSizeKb(b.fileSize) - parseSizeKb(a.fileSize);
  });
}

/**
 * @param {Array<{ headline?: string, announcementType?: string, date?: string, fileSize?: string, documentKey?: string }>} items
 * @param {{ headlineRe: RegExp, skipRe: RegExp }} patterns
 */
export function pickAnnouncement(items, { headlineRe, skipRe }) {
  const candidates = items.filter((it) => {
    const text = `${it.headline ?? ''} ${it.announcementType ?? ''}`;
    if (!headlineRe.test(text)) return false;
    if (skipRe.test(text)) return false;
    if (!it.documentKey) return false;
    return true;
  });
  if (!candidates.length) return null;
  return sortAnnouncements(candidates)[0];
}

export function pickAnnualReportAnnouncement(items) {
  return pickAnnouncement(items, { headlineRe: ANNUAL_HEADLINE_RE, skipRe: ANNUAL_SKIP_RE });
}

export function pickTechnicalReportAnnouncement(items) {
  return pickAnnouncement(items, { headlineRe: TECHNICAL_HEADLINE_RE, skipRe: TECHNICAL_SKIP_RE });
}

export function pickFeasibilityAnnouncement(items) {
  return pickAnnouncement(items, { headlineRe: FEASIBILITY_HEADLINE_RE, skipRe: TECHNICAL_SKIP_RE });
}

function announcementToSource(pick, labelPrefix) {
  if (!pick) return null;
  return {
    type: 'pdf',
    url: asxPdfUrlFromDocumentKey(pick.documentKey),
    label: `${labelPrefix}: ${pick.headline}`,
    referer: 'https://www.asx.com.au/',
    crawlerMeta: {
      documentKey: pick.documentKey,
      announcementDate: pick.date,
      announcementType: pick.announcementType,
      fileSize: pick.fileSize,
    },
  };
}

/** @param {string} asxCode @param {'annual' | 'technical' | 'feasibility'} kind */
export async function discoverAsxSource(asxCode, kind = 'annual') {
  const code = asxCode.toUpperCase();
  const { items } = await fetchAsxAnnouncements(code, { marketSensitive: false, count: 80 });
  const pick =
    kind === 'feasibility'
      ? pickFeasibilityAnnouncement(items)
      : kind === 'technical'
        ? pickTechnicalReportAnnouncement(items)
        : pickAnnualReportAnnouncement(items);
  const label =
    kind === 'feasibility' ? 'ASX feasibility' : kind === 'technical' ? 'ASX technical' : 'ASX crawler';
  return announcementToSource(pick, label);
}

export async function discoverAsxAnnualReportSource(asxCode) {
  return discoverAsxSource(asxCode, 'annual');
}

/** Try Weblink investor index — PDF when listed, else HTML index for link discovery. */
export async function discoverWeblinkSources(asxCode) {
  const code = asxCode.toUpperCase();
  const indexUrl = `https://wcsecure.weblink.com.au/clients/${code.toLowerCase()}/headline.aspx`;
  try {
    const res = await rateLimitedFetch(indexUrl, { referer: 'https://wcsecure.weblink.com.au/' });
    const html = await res.text();
    const pdfLinks = [...html.matchAll(/href="(\/pdf\/[^"]+\.pdf)"/gi)].map((m) => m[1]);
    if (pdfLinks.length) {
      return pdfLinks.slice(0, 4).map((path, i) => ({
        type: 'pdf',
        url: `https://wcsecure.weblink.com.au${path}`,
        label: `Weblink PDF ${i + 1}: ${code}`,
        referer: indexUrl,
      }));
    }
    return [
      {
        type: 'html',
        url: indexUrl,
        label: `Weblink IR index: ${code}`,
        referer: 'https://wcsecure.weblink.com.au/',
      },
    ];
  } catch {
    return [];
  }
}

/** @deprecated use discoverWeblinkSources */
export async function discoverWeblinkAnnualPdf(asxCode) {
  const sources = await discoverWeblinkSources(asxCode);
  return sources.find((s) => s.type === 'pdf') ?? sources[0] ?? null;
}

/** Annual → feasibility → mineral resource → Weblink fallback. */
export async function discoverAsxFilingSources(asxCode) {
  const found = [];
  const seen = new Set();
  const add = (src) => {
    if (!src || seen.has(src.url)) return;
    seen.add(src.url);
    found.push(src);
  };

  add(await discoverAsxSource(asxCode, 'annual'));
  add(await discoverAsxSource(asxCode, 'feasibility'));
  add(await discoverAsxSource(asxCode, 'technical'));
  if (!found.length) {
    for (const src of await discoverWeblinkSources(asxCode)) add(src);
  }
  return found;
}

/**
 * @param {string} companyId
 * @param {import('./registry.mjs').InternationalMiner} company
 * @param {{ force?: boolean }} [opts]
 */
export async function crawlAndCacheAsxSource(companyId, company, { force = false } = {}) {
  const dir = internationalRawDir(companyId);
  const cachePath = join(dir, 'asx-crawl.json');
  if (!force && existsSync(cachePath)) {
    return JSON.parse(readFileSync(cachePath, 'utf8'));
  }

  const asxCode = company.asxCode ?? company.id;
  const result = {
    asxCode,
    crawledAt: new Date().toISOString(),
    discovered: null,
    discoveredAll: [],
    error: null,
  };

  try {
    const sources = await discoverAsxFilingSources(asxCode);
    result.discoveredAll = sources;
    result.discovered = sources[0] ?? null;
  } catch (err) {
    result.error = err.message;
  }

  mkdirSync(dir, { recursive: true });
  writeFileSync(cachePath, JSON.stringify(result, null, 2));
  return result;
}

/**
 * @param {import('./registry.mjs').InternationalMiner[]} companies
 */
export async function crawlAllAsxCompanies(companies, { force = false } = {}) {
  const asx = companies.filter((c) => c.listingRegime === 'ASX');
  const results = [];
  for (const company of asx) {
    console.log(`  [asx-crawl] ${company.id}`);
    results.push({ id: company.id, ...(await crawlAndCacheAsxSource(company.id, company, { force })) });
  }
  return results;
}
