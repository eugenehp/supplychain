import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { PATHS, internationalRawDir } from '../../paths.mjs';
import { discoverAsxFilingSources } from './asx-crawler.mjs';
import { fetchBestSourceText } from '../parse-source.mjs';
import { resolvePublicLinkUrl } from '../source-link.mjs';

const MIN_USEFUL_TEXT = 3000;

/**
 * @param {import('./registry.mjs').InternationalMiner} company
 * @param {{ useAsxCrawler?: boolean }} [opts]
 */
export async function resolveFilingSources(company, { useAsxCrawler = true } = {}) {
  const manual = [...(company.filingSources ?? [])];
  /** @type {typeof manual} */
  const discovered = [];

  if (company.listingRegime === 'CN-SSE' || company.listingRegime === 'CN-SZSE') {
    try {
      const { discoverCninfoFilingSources } = await import('./cninfo-crawler.mjs');
      discovered.push(...(await discoverCninfoFilingSources(company)));
    } catch {
      /* fall back to manual registry URLs */
    }
  }

  const tryAsxCrawler =
    useAsxCrawler && company.listingRegime === 'ASX' && company.asxCrawler !== false;

  if (tryAsxCrawler) {
    try {
      discovered.push(...(await discoverAsxFilingSources(company.asxCode ?? company.id)));
    } catch {
      /* fall back to manual registry URLs */
    }
  }

  if (!discovered.length) return manual;

  const urls = new Set(manual.map((s) => s.url));
  const extra = discovered.filter((s) => !urls.has(s.url));
  // Registry/IR URLs first — ASX Markit CDN links expire and must not win over stable sources.
  return [...manual, ...extra];
}

/**
 * @param {import('./registry.mjs').InternationalMiner} company
 * @param {{ force?: boolean, useAsxCrawler?: boolean }} [opts]
 */
export async function fetchInternationalFiling(company, { force = false, useAsxCrawler = true } = {}) {
  const dir = internationalRawDir(company.id);
  mkdirSync(dir, { recursive: true });

  const metaPath = join(dir, 'metadata.json');
  const textPath = join(dir, 'filing.txt');

  if (!force && existsSync(textPath) && readFileSync(textPath, 'utf8').length > MIN_USEFUL_TEXT) {
    const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
    return { ...meta, cached: true };
  }

  const base = {
    id: company.id,
    name: company.name,
    localTicker: company.localTicker,
    listingRegime: company.listingRegime,
    countryCode: company.countryCode,
    scrapedAt: new Date().toISOString(),
    secCounterpart: company.secCounterpart,
    homeFormLabel: company.homeFormLabel,
    sourceUrl: null,
    sourceType: null,
    error: null,
    textLength: 0,
  };

  const sources = await resolveFilingSources(company, { useAsxCrawler });
  const best = await fetchBestSourceText(sources, {
    regime: company.listingRegime,
    dir,
    textBasename: 'filing',
    minUsefulText: MIN_USEFUL_TEXT,
    maxHtmlDepth: 2,
  });

  const final = {
    ...base,
    ...best,
    publicUrl: resolvePublicLinkUrl(best.sourceUrl, sources),
  };
  writeFileSync(metaPath, JSON.stringify(final, null, 2));
  return final;
}

export function loadInternationalFiling(id) {
  const dir = internationalRawDir(id);
  const textPath = join(dir, 'filing.txt');
  const metaPath = join(dir, 'metadata.json');
  if (!existsSync(textPath)) return null;
  const text = readFileSync(textPath, 'utf8');
  const meta = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, 'utf8')) : {};
  return { text, meta, dir };
}

export async function fetchAllInternational({ force = false, useAsxCrawler = true } = {}) {
  const { INTERNATIONAL_MINERS } = await import('./registry.mjs');
  const { crawlAllAsxCompanies } = await import('./asx-crawler.mjs');

  if (useAsxCrawler) {
    console.log('  ASX announcement crawler (Markit API)…');
    const crawl = await crawlAllAsxCompanies(INTERNATIONAL_MINERS, { force });
    const found = crawl.filter((c) => c.discovered).length;
    const multi = crawl.filter((c) => (c.discoveredAll?.length ?? 0) > 1).length;
    console.log(
      `    ${found}/${crawl.length} ASX with crawler match (${multi} with 2+ source types incl. feasibility/resource)`,
    );
  }

  const results = [];
  for (const company of INTERNATIONAL_MINERS) {
    console.log(`  [intl] ${company.id} (${company.listingRegime})`);
    results.push(await fetchInternationalFiling(company, { force, useAsxCrawler }));
  }
  writeFileSync(
    join(PATHS.rawInternational, 'manifest.json'),
    JSON.stringify(
      { scrapedAt: new Date().toISOString(), useAsxCrawler, companies: results },
      null,
      2,
    ),
  );
  return results;
}
