import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PATHS } from './paths.mjs';
import { resolveLogoFromManifest } from '../../src/lib/logo-resolver-core.js';

const USER_AGENT = 'SupplyChainResearch/1.0 (https://www.sec.gov; supply-chain-research)';

/** Known corporate domains — last-resort logo source */
export const COMPANY_DOMAINS = {
  NVDA: 'nvidia.com',
  TSM: 'tsmc.com',
  ASML: 'asml.com',
  AMAT: 'appliedmaterials.com',
  LRCX: 'lamresearch.com',
  KLAC: 'kla.com',
  SNPS: 'synopsys.com',
  CDNS: 'cadence.com',
  MU: 'micron.com',
  AMD: 'amd.com',
  AMKR: 'amkor.com',
  GFS: 'globalfoundries.com',
  INTC: 'intel.com',
  AMZN: 'amazon.com',
  MSFT: 'microsoft.com',
  GOOGL: 'abc.xyz',
  META: 'meta.com',
  BIDU: 'baidu.com',
  HW: 'huawei.com',
  SN: 'sambanova.ai',
  TT: 'tenstorrent.com',
  GQ: 'groq.com',
  CB: 'cerebras.ai',
  // Space economy watchlist
  RKLB: 'rocketlabusa.com',
  ASTS: 'ast-science.com',
  BA: 'boeing.com',
  LMT: 'lockheedmartin.com',
  NOC: 'northropgrumman.com',
  RTX: 'rtx.com',
  LHX: 'l3harris.com',
  IRDM: 'iridium.com',
  VSAT: 'viasat.com',
  GSAT: 'globalstar.com',
  PL: 'planet.com',
  BKSY: 'blacksky.com',
  SPIR: 'spire.com',
  MNTS: 'momentus.space',
  RDW: 'redwirespace.com',
};

/** English Wikipedia page titles for Wikidata logo lookup (P154). */
export const WIKIPEDIA_TITLES = {
  NVDA: 'Nvidia',
  AMD: 'Advanced Micro Devices',
  TSM: 'TSMC',
  ASML: 'ASML Holding',
  AMAT: 'Applied Materials',
  LRCX: 'Lam Research',
  KLAC: 'KLA Corporation',
  SNPS: 'Synopsys',
  CDNS: 'Cadence Design Systems',
  MU: 'Micron Technology',
  AMKR: 'Amkor Technology',
  GFS: 'GlobalFoundries',
  INTC: 'Intel',
  AMZN: 'Amazon (company)',
  MSFT: 'Microsoft',
  GOOGL: 'Alphabet Inc.',
  META: 'Meta Platforms',
  BIDU: 'Baidu',
  HW: 'Huawei',
  SN: 'SambaNova',
  TT: 'Tenstorrent',
  GQ: 'Groq',
  CB: 'Cerebras',
  // Space economy
  RKLB: 'Rocket Lab',
  ASTS: 'AST SpaceMobile',
  BA: 'Boeing',
  LMT: 'Lockheed Martin',
  NOC: 'Northrop Grumman',
  RTX: 'RTX Corporation',
  LHX: 'L3Harris',
  IRDM: 'Iridium Communications',
  VSAT: 'Viasat, Inc.',
  GSAT: 'Globalstar',
  PL: 'Planet Labs',
  BKSY: 'BlackSky Technology',
  SPIR: 'Spire Global',
  MNTS: 'Momentus Inc',
  RDW: 'Redwire',
};

const LOGOS = {
  NVDA: { label: 'NVDA', sub: 'NVIDIA', color: '#76B900', bg: '#111111', text: '#ffffff' },
  TSM: { label: 'TSM', sub: 'TSMC', color: '#E50012', bg: '#E50012', text: '#ffffff' },
  ASML: { label: 'ASML', sub: 'ASML', color: '#0085CA', bg: '#0085CA', text: '#ffffff' },
  AMAT: { label: 'AMAT', sub: 'Applied', color: '#00629B', bg: '#00629B', text: '#ffffff' },
  LRCX: { label: 'LRCX', sub: 'Lam', color: '#003087', bg: '#003087', text: '#ffffff' },
  KLAC: { label: 'KLAC', sub: 'KLA', color: '#006272', bg: '#006272', text: '#ffffff' },
  SNPS: { label: 'SNPS', sub: 'Synopsys', color: '#5C2D91', bg: '#5C2D91', text: '#ffffff' },
  CDNS: { label: 'CDNS', sub: 'Cadence', color: '#DA1F38', bg: '#DA1F38', text: '#ffffff' },
  MU: { label: 'MU', sub: 'Micron', color: '#0077C8', bg: '#0077C8', text: '#ffffff' },
  AMD: { label: 'AMD', sub: 'AMD', color: '#ED1C24', bg: '#000000', text: '#ffffff' },
  AMKR: { label: 'AMKR', sub: 'Amkor', color: '#003087', bg: '#003087', text: '#ffffff' },
  GFS: { label: 'GFS', sub: 'GF', color: '#E35205', bg: '#E35205', text: '#ffffff' },
  INTC: { label: 'INTC', sub: 'Intel', color: '#0071C5', bg: '#0071C5', text: '#ffffff' },
  AMZN: { label: 'AMZN', sub: 'Amazon', color: '#FF9900', bg: '#131921', text: '#FF9900' },
  MSFT: { label: 'MSFT', sub: 'Microsoft', color: '#0078D4', bg: '#0078D4', text: '#ffffff' },
  GOOGL: { label: 'GOOG', sub: 'Alphabet', color: '#4285F4', bg: '#4285F4', text: '#ffffff' },
  META: { label: 'META', sub: 'Meta', color: '#0081FB', bg: '#0081FB', text: '#ffffff' },
  BIDU: { label: 'BIDU', sub: 'Baidu', color: '#2932E1', bg: '#2932E1', text: '#ffffff' },
  HW: { label: 'HW', sub: 'Huawei', color: '#CF0A2C', bg: '#CF0A2C', text: '#ffffff' },
  SN: { label: 'SN', sub: 'SambaNova', color: '#6B2D5B', bg: '#6B2D5B', text: '#ffffff' },
  TT: { label: 'TT', sub: 'Tenstorrent', color: '#1E3A5F', bg: '#1E3A5F', text: '#ffffff' },
  GQ: { label: 'GQ', sub: 'Groq', color: '#F55036', bg: '#1A1A1A', text: '#F55036' },
  CB: { label: 'CB', sub: 'Cerebras', color: '#FF6B00', bg: '#1A1A1A', text: '#FF6B00' },
  // Space economy watchlist (SVG fallback colors)
  RKLB: { label: 'RKLB', sub: 'Rocket Lab', color: '#FFFFFF', bg: '#1A1A1A', text: '#FFFFFF' },
  ASTS: { label: 'ASTS', sub: 'AST', color: '#0066CC', bg: '#0066CC', text: '#FFFFFF' },
  BA:   { label: 'BA',   sub: 'Boeing', color: '#005EB8', bg: '#005EB8', text: '#FFFFFF' },
  LMT:  { label: 'LMT',  sub: 'Lockheed', color: '#0E2A47', bg: '#0E2A47', text: '#FFFFFF' },
  NOC:  { label: 'NOC',  sub: 'Northrop', color: '#005CB9', bg: '#005CB9', text: '#FFFFFF' },
  RTX:  { label: 'RTX',  sub: 'RTX', color: '#C8102E', bg: '#C8102E', text: '#FFFFFF' },
  LHX:  { label: 'LHX',  sub: 'L3Harris', color: '#003C7E', bg: '#003C7E', text: '#FFFFFF' },
  IRDM: { label: 'IRDM', sub: 'Iridium', color: '#5BC2E7', bg: '#0B2E4F', text: '#FFFFFF' },
  VSAT: { label: 'VSAT', sub: 'Viasat', color: '#005EB8', bg: '#005EB8', text: '#FFFFFF' },
  GSAT: { label: 'GSAT', sub: 'Globalstar', color: '#F26522', bg: '#F26522', text: '#FFFFFF' },
  PL:   { label: 'PL',   sub: 'Planet', color: '#0EBC8F', bg: '#0EBC8F', text: '#FFFFFF' },
  BKSY: { label: 'BKSY', sub: 'BlackSky', color: '#FFFFFF', bg: '#0F172A', text: '#FFFFFF' },
  SPIR: { label: 'SPIR', sub: 'Spire', color: '#001E62', bg: '#001E62', text: '#FFFFFF' },
  MNTS: { label: 'MNTS', sub: 'Momentus', color: '#FF5722', bg: '#FF5722', text: '#FFFFFF' },
  RDW:  { label: 'RDW',  sub: 'Redwire', color: '#E60000', bg: '#E60000', text: '#FFFFFF' },
};

/** Logo slugs for private / non-SEC anchor companies (topic id → slug). */
export const TOPIC_LOGO_BY_ID = {
  'huawei-ascend-910c': 'HW',
  'sambanova-sn40': 'SN',
  'tenstorrent-blackhole': 'TT',
  'groq-lpu': 'GQ',
  'cerebras-wse-3': 'CB',
};

export const TOPIC_LOGO_SLUGS = [...new Set(Object.values(TOPIC_LOGO_BY_ID))];

const WIKI_SUMMARY = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';
const COMMONS_FILE = 'https://commons.wikimedia.org/wiki/Special:FilePath/';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastFetch = 0;

async function rateLimitedFetch(url, options = {}) {
  const elapsed = Date.now() - lastFetch;
  if (elapsed < 120) await sleep(120 - elapsed);
  lastFetch = Date.now();
  return fetch(url, {
    ...options,
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json, image/*,*/*',
      ...options.headers,
    },
  });
}

function svg(ticker, cfg) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="${cfg.sub} logo">
  <rect width="64" height="64" rx="12" fill="${cfg.bg}" stroke="${cfg.color}" stroke-width="2"/>
  <text x="32" y="30" text-anchor="middle" font-family="system-ui,Segoe UI,sans-serif" font-size="14" font-weight="700" fill="${cfg.text}">${cfg.label}</text>
  <text x="32" y="46" text-anchor="middle" font-family="system-ui,Segoe UI,sans-serif" font-size="8" font-weight="600" fill="${cfg.subColor ?? cfg.text}" opacity="0.85">${cfg.sub}</text>
</svg>`;
}

export function logosDir() {
  return join(PATHS.staticRoot, 'logos');
}

function manifestPath() {
  return join(logosDir(), 'manifest.json');
}

function dataManifestPath() {
  return join(PATHS.logos, 'manifest.json');
}

export function readLogoManifest() {
  const dataPath = dataManifestPath();
  const staticPath = manifestPath();
  const path = existsSync(dataPath) ? dataPath : staticPath;
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return {};
  }
}

function writeLogoManifest(manifest) {
  mkdirSync(PATHS.logos, { recursive: true });
  mkdirSync(logosDir(), { recursive: true });
  const json = JSON.stringify(manifest, null, 2);
  writeFileSync(dataManifestPath(), json);
  writeFileSync(manifestPath(), json);
}

/** Write ticker SVG placeholders used when a real logo cannot be fetched */
export function writeCompanyLogoFallbacks(tickers = Object.keys(LOGOS)) {
  const dir = logosDir();
  mkdirSync(dir, { recursive: true });
  for (const ticker of tickers) {
    const cfg = LOGOS[ticker.toUpperCase()];
    if (!cfg) continue;
    writeFileSync(join(dir, `${ticker.toUpperCase()}.svg`), svg(ticker, cfg), 'utf8');
  }
}

function commonsUrl(filename) {
  return `${COMMONS_FILE}${encodeURIComponent(filename.replace(/ /g, '_'))}`;
}

async function fetchJson(url) {
  const res = await rateLimitedFetch(url);
  if (!res.ok) return null;
  return res.json();
}

async function wikipediaSummary(pageTitle) {
  const encoded = encodeURIComponent(pageTitle.replace(/ /g, '_'));
  return fetchJson(`${WIKI_SUMMARY}${encoded}`);
}

async function wikidataQidFromTitle(pageTitle) {
  const summary = await wikipediaSummary(pageTitle);
  return summary?.wikibase_item ?? null;
}

async function wikidataQidFromSearch(label) {
  const params = new URLSearchParams({
    action: 'wbsearchentities',
    search: label,
    language: 'en',
    type: 'item',
    format: 'json',
    origin: '*',
    limit: '1',
  });
  const data = await fetchJson(`${WIKIDATA_API}?${params}`);
  return data?.search?.[0]?.id ?? null;
}

async function wikidataLogoFilename(qid) {
  if (!qid) return null;
  const params = new URLSearchParams({
    action: 'wbgetentities',
    ids: qid,
    props: 'claims',
    format: 'json',
    origin: '*',
  });
  const data = await fetchJson(`${WIKIDATA_API}?${params}`);
  const claims = data?.entities?.[qid]?.claims?.P154;
  const filename = claims?.[0]?.mainsnak?.datavalue?.value;
  return typeof filename === 'string' ? filename : null;
}

/** Resolve Wikidata P154 logo on Wikimedia Commons. */
export async function resolveWikimediaLogoUrl(ticker) {
  const upper = ticker.toUpperCase();
  const title = WIKIPEDIA_TITLES[upper];
  if (!title) return null;

  let qid = await wikidataQidFromTitle(title);
  if (!qid) qid = await wikidataQidFromSearch(title);

  const filename = await wikidataLogoFilename(qid);
  return filename ? commonsUrl(filename) : null;
}

function legacyLogoUrls(ticker) {
  const upper = ticker.toUpperCase();
  const domain = COMPANY_DOMAINS[upper];
  return [
    `https://storage.googleapis.com/iex/api/logos/${upper}.png`,
    `https://financialmodelingprep.com/image-stock/${upper}.png`,
    domain ? `https://logo.clearbit.com/${domain}` : null,
  ].filter(Boolean);
}

async function downloadLogo(url, dir, baseName) {
  const res = await rateLimitedFetch(url, { redirect: 'follow' });
  if (!res.ok) return null;

  const finalUrl = res.url ?? url;
  const type = (res.headers.get('content-type') ?? '').toLowerCase();
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 128) return null;

  const isSvg =
    type.includes('svg') ||
    finalUrl.toLowerCase().includes('.svg') ||
    (buf[0] === 0x3c && buf.slice(0, 200).toString('utf8').includes('<svg'));

  if (!type.startsWith('image/') && !isSvg) return null;

  const ext = isSvg ? 'svg' : 'png';
  const dest = join(dir, `${baseName}.${ext}`);
  writeFileSync(dest, buf);
  return { ext, url: finalUrl, bytes: buf.length };
}

/** Build ordered public logo source URLs for a ticker. */
export async function logoSourceUrls(ticker) {
  const upper = ticker.toUpperCase();
  const urls = [];

  const wikimedia = await resolveWikimediaLogoUrl(upper);
  if (wikimedia) urls.push({ kind: 'wikidata', url: wikimedia });

  for (const url of legacyLogoUrls(upper)) {
    urls.push({ kind: 'legacy', url });
  }

  return urls;
}

/** Every slug that should have a cached logo file. */
export function allLogoSlugs(extraTickers = []) {
  return [...new Set([...Object.keys(LOGOS), ...TOPIC_LOGO_SLUGS, ...extraTickers.map((t) => t.toUpperCase())])].sort();
}

/** Fetch real company logos and cache under static/logos/{TICKER}.{svg|png} */
export async function fetchCompanyLogos(tickers = []) {
  const allSlugs = allLogoSlugs(tickers);
  writeCompanyLogoFallbacks(allSlugs);

  const dir = logosDir();
  mkdirSync(dir, { recursive: true });
  const manifest = readLogoManifest();
  const results = {};

  for (const ticker of allSlugs) {
    const upper = ticker.toUpperCase();
    let fetched = false;

    const sources = await logoSourceUrls(upper);
    for (const source of sources) {
      try {
        const saved = await downloadLogo(source.url, dir, upper);
        if (saved) {
          manifest[upper] = {
            source: source.kind,
            ext: saved.ext,
            url: saved.url,
            bytes: saved.bytes,
            fetchedAt: new Date().toISOString(),
          };
          fetched = true;
          break;
        }
      } catch {
        /* try next source */
      }
    }

    results[upper] = fetched;
  }

  writeLogoManifest(manifest);
  return results;
}

/** Download logos for every known slug (SEC watchlist + topic anchors). */
export async function fetchAllCompanyLogos() {
  const { allSecWatchlistTickers } = await import('./topics/index.mjs');
  return fetchCompanyLogos(allSecWatchlistTickers());
}

export function resolveLogoUrls(ticker) {
  const r = resolveLogoFromManifest(readLogoManifest(), ticker);
  if (!r) return { primary: null, fallback: null, url: null, source: null };
  return {
    primary: r.primaryUrl,
    fallback: r.fallbackUrl,
    url: r.url,
    source: r.source,
  };
}

/** @deprecated use writeCompanyLogoFallbacks */
export function writeCompanyLogos(tickers) {
  writeCompanyLogoFallbacks(tickers);
}
