import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { companyRawDir } from '../paths.mjs';
import { htmlToText } from '../filing-processor.mjs';
import { RARE_EARTH_ELEMENTS } from './rare-earth-elements.mjs';
import { RARE_EARTH_MINERS } from './rare-earth-miners.mjs';
import { buildGeoDistribution } from './build-geo-distribution.mjs';
import {
  extractRareEarthFromText,
  extractFieldsFromSnippets,
} from './extract-rare-earth-text.mjs';
import { loadInternationalFiling } from './international/fetch-filing.mjs';
import { INTERNATIONAL_MINERS, INTERNATIONAL_BY_ID } from './international/registry.mjs';
import { loadPublicReport } from './public-reports/fetch-report.mjs';
import { PUBLIC_REPORTS, PUBLIC_REPORT_BY_ID } from './public-reports/registry.mjs';
import { buildMiningSitesIndex } from './mining-sites.mjs';
import { reportExcerptsFromRow } from './build-materials-search.mjs';
import { loadUsgsMcsProduction, buildProductionGeography } from './structured/parse-usgs-mcs.mjs';
import { chainStageForSite, buildValueChainIndex } from './value-chain.mjs';
import { buildDownstreamIndex } from './downstream-oem.mjs';
import { buildSupplyTimeline } from './supply-timeline.mjs';
import { resolvePublicLinkUrl } from './source-link.mjs';

function cleanFilingText(text) {
  const markers = [
    /UNITED STATES\s+SECURITIES AND EXCHANGE COMMISSION/i,
    /Item\s+1\.\s*Business/i,
    /ITEM\s+1[\.\s\-–—]+BUSINESS/i,
    /FORM\s+10-K/i,
  ];
  for (const m of markers) {
    const idx = text.search(m);
    if (idx >= 0 && idx < 80000) return text.slice(idx).trim();
  }
  return text.trim();
}

/**
 * @param {string} ticker
 * @param {string[]} [extraTickers]
 */
export function extractRareEarthFromTicker(ticker, extraTickers = []) {
  const htmlPath = join(companyRawDir(ticker), 'filing.html');
  const metaPath = join(companyRawDir(ticker), 'metadata.json');
  if (!existsSync(htmlPath)) return null;

  const html = readFileSync(htmlPath, 'utf8');
  const meta = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, 'utf8')) : {};
  const text = cleanFilingText(htmlToText(html));
  const miner = RARE_EARTH_MINERS.find((m) => m.ticker === ticker);

  return extractRareEarthFromText(text, {
    id: ticker,
    ticker,
    companyName: meta.name ?? miner?.name ?? ticker,
    role: miner?.role ?? (extraTickers.includes(ticker) ? 'downstream' : 'other'),
    filing: meta.filing ?? null,
    filingUrl: meta.filingUrl ?? null,
    sourceRegime: 'US-SEC',
    secCounterpart: meta.filing?.form ?? '10-K',
    isRareEarthMiner: Boolean(miner),
  });
}

export function extractRareEarthFromInternational(id) {
  const loaded = loadInternationalFiling(id);
  if (!loaded || loaded.text.length < 3000) return null;

  const company = INTERNATIONAL_BY_ID[id];
  if (!company) return null;

  return extractRareEarthFromText(loaded.text, {
    id: company.id,
    ticker: company.localTicker,
    companyName: company.name,
    role: company.role,
    filing: loaded.meta?.parsed
      ? { form: company.homeFormLabel, filingDate: loaded.meta.scrapedAt?.slice(0, 10) }
      : null,
    filingUrl:
      loaded.meta?.publicUrl ??
      resolvePublicLinkUrl(loaded.meta?.sourceUrl, company.filingSources) ??
      null,
    sourceRegime: company.listingRegime,
    secCounterpart: company.secCounterpart,
    isRareEarthMiner: true,
  });
}

export function extractRareEarthFromPublicReport(id) {
  const loaded = loadPublicReport(id);
  if (!loaded || loaded.text.length < 2000) return null;

  const report = PUBLIC_REPORT_BY_ID[id];
  if (!report) return null;

  const sourceRegime = report.id.startsWith('EU-') ? 'EU' : 'PUBLIC';

  return extractRareEarthFromText(loaded.text, {
    id: report.id,
    ticker: report.id,
    companyName: report.title,
    role: 'reference',
    filing: { form: 'Government/Industry Report', filingDate: String(report.year) },
    filingUrl:
      loaded.meta?.publicUrl ??
      resolvePublicLinkUrl(loaded.meta?.sourceUrl, report.filingSources) ??
      null,
    sourceRegime,
    secCounterpart: sourceRegime === 'EU' ? 'N/A (EU regulation)' : 'N/A (non-issuer)',
    isRareEarthMiner: false,
  });
}

export function extractAllRareEarthFilings(
  secTickers,
  { includeInternational = true, includePublicReports = true } = {},
) {
  const results = [];
  for (const ticker of secTickers) {
    const row = extractRareEarthFromTicker(ticker);
    if (row) results.push(row);
  }
  if (includeInternational) {
    for (const company of INTERNATIONAL_MINERS) {
      const row = extractRareEarthFromInternational(company.id);
      if (row) results.push(row);
    }
  }
  if (includePublicReports) {
    for (const report of PUBLIC_REPORTS) {
      const row = extractRareEarthFromPublicReport(report.id);
      if (row) results.push(row);
    }
  }
  return results;
}

export function buildElementProfiles(filingRows) {
  return RARE_EARTH_ELEMENTS.map((element) => {
    const miners = [];
    const downstreamConsumers = [];
    const allSnippets = [];

    for (const row of filingRows) {
      const hit = row.elementHits[element.symbol];
      if (!hit) continue;
      if (row.role === 'downstream') {
        downstreamConsumers.push({
          ticker: row.ticker,
          company: row.companyName,
          mentionCount: hit.mentionCount,
          snippets: hit.snippetRefs?.length
            ? hit.snippetRefs.slice(0, 2)
            : (hit.snippets ?? []).slice(0, 2).map((text) => ({ text })),
          sourceId: row.id,
          filingUrl: row.filingUrl,
        });
        continue;
      }
      miners.push({
        ticker: row.ticker,
        company: row.companyName,
        role: row.role,
        sourceRegime: row.sourceRegime,
        sourceId: row.id,
        secCounterpart: row.secCounterpart,
        mentionCount: hit.mentionCount,
        snippets: hit.snippetRefs?.length
          ? hit.snippetRefs
          : (hit.snippets ?? []).map((text) => ({ text })),
        extracted: hit.extracted,
        filing: row.filing,
        filingUrl: row.filingUrl,
      });
      allSnippets.push(...(hit.snippets ?? []));
    }

    const aggregated = extractFieldsFromSnippets(allSnippets);

    return {
      ...element,
      categoryLabel:
        element.category === 'light'
          ? 'Light REE'
          : element.category === 'heavy'
            ? 'Heavy REE'
            : element.category === 'middle'
              ? 'Middle REE'
              : 'Scandium',
      mentionCount: miners.reduce((n, m) => n + m.mentionCount, 0),
      minerCount: miners.length,
      miners: miners.sort((a, b) => b.mentionCount - a.mentionCount),
      downstreamConsumers: downstreamConsumers.sort((a, b) => b.mentionCount - a.mentionCount),
      aggregated,
    };
  });
}

export function buildRareEarthIndex({
  filingRows,
  downstreamTickers = [],
  internationalMeta = [],
  publicReportsMeta = [],
  mrdsSites = [],
  strategicProjectSites = [],
  productionGeography = null,
  strategicProjects = null,
  tradeGeography = null,
  usgsHistorical = null,
  chinaPolicy = null,
  myanmarSupply = null,
  resourceEstimates = null,
}) {
  const elements = buildElementProfiles(filingRows);
  const geography = buildGeoDistribution(filingRows, elements);
  const miningSites = buildMiningSitesIndex(filingRows, { mrdsSites, strategicProjectSites });
  const minersIndexed = filingRows.filter((r) => r.isRareEarthMiner);
  const valueChain = buildValueChainIndex({
    sites: miningSites.sites,
    companies: [
      ...RARE_EARTH_MINERS.map((m) => ({ ...m, chainStage: m.chainStage ?? (m.role === 'miner' ? 'mine' : m.role === 'processor' ? 'separation' : 'mine') })),
      ...INTERNATIONAL_MINERS.map((m) => ({
        id: m.id,
        ticker: m.localTicker,
        name: m.name,
        role: m.role,
        chainStage: m.role === 'processor' ? 'separation' : m.role === 'developer' ? 'mine' : 'separation',
      })),
    ],
  });
  const downstream = buildDownstreamIndex(filingRows, elements);
  const supplyTimeline = buildSupplyTimeline({ chinaPolicy, usgsHistorical, myanmarSupply });

  for (const el of elements) {
    const geo = geography.byElement.find((g) => g.symbol === el.symbol);
    if (geo) el.countries = geo.countries;
  }

  return {
    version: 5,
    generatedAt: new Date().toISOString(),
    title: 'Rare Earth Elements',
    subtitle:
      'Extractive supply chain from SEC EDGAR, international filings (ASX/TSX/AIM/China/Japan/Korea), USGS MCS + Comtrade trade, EU CRMA strategic projects, and MRDS deposit data.',
    methodology: {
      sources:
        'U.S. SEC 10-K/20-F (miners + defense/auto/wind downstream); ASX/TSX/AIM/China/Japan/Korea annual reports; NRCan, Geoscience Australia, EU JRC, USGS MCS/MIS, DOE CMA, IEA GCMO, BGS UK, EU CRMA; UN Comtrade HS 280530/2846xx; MOFCOM quota curation; Myanmar heavy-REE context.',
      elements: '17 REE: 15 lanthanides (La–Lu) plus scandium (Sc) and yttrium (Y).',
      extraction:
        'Automated pattern extraction for geography, cost language, pipeline, suppliers, and impact from filing text.',
      miningSites:
        'Curated sites + EU CRMA strategic projects + USGS MRDS deposits; SEC mentions boost curated site visibility.',
      productionGeography:
        'Country production shares from USGS MCS 2025 CSV/world table — not SEC excerpt co-occurrence.',
      disclaimer:
        'SEC/international geography tabs show filing co-occurrence only. Use USGS production tab for mine output shares; EU strategic tab for CRMA-designated projects.',
    },
    publicReports: {
      reports: PUBLIC_REPORTS.map((r) => {
        const row = filingRows.find((f) => f.id === r.id);
        const excerptData = reportExcerptsFromRow(row);
        return {
          id: r.id,
          title: r.title,
          publisher: r.publisher,
          year: r.year,
          topics: r.topics,
          fetched: publicReportsMeta.find((x) => x.id === r.id) ?? null,
          ...excerptData,
          filingUrl: row?.filingUrl ?? null,
        };
      }),
    },
    international: {
      regimes: INTERNATIONAL_MINERS.map((m) => {
        const row = filingRows.find((f) => f.id === m.id);
        const excerptData = reportExcerptsFromRow(row);
        return {
          id: m.id,
          name: m.name,
          flag: m.flag,
          localTicker: m.localTicker,
          listingRegime: m.listingRegime,
          secCounterpart: m.secCounterpart,
          homeFormLabel: m.homeFormLabel,
          role: m.role,
          chainStage: m.role === 'processor' ? 'separation' : m.role === 'developer' ? 'mine' : 'separation',
          primaryElements: m.primaryElements,
          fetched: internationalMeta.find((r) => r.id === m.id) ?? null,
          ...excerptData,
          filingUrl: row?.filingUrl ?? null,
        };
      }),
    },
    miners: RARE_EARTH_MINERS,
    filings: filingRows,
    downstreamTickers,
    downstream,
    valueChain,
    supplyTimeline,
    elements,
    geography,
    productionGeography,
    strategicProjects,
    tradeGeography,
    usgsHistorical,
    chinaPolicy,
    myanmarSupply,
    resourceEstimates,
    miningSites,
    summary: {
      elementCount: elements.length,
      elementsWithSecMentions: elements.filter((e) => e.mentionCount > 0).length,
      minersIndexed: minersIndexed.length,
      internationalFilings: filingRows.filter(
        (r) =>
          r.sourceRegime &&
          !['US-SEC', 'PUBLIC', 'EU'].includes(r.sourceRegime),
      ).length,
      publicReportsIndexed: filingRows.filter((r) =>
        ['PUBLIC', 'EU'].includes(r.sourceRegime),
      ).length,
      totalMentions: elements.reduce((n, e) => n + e.mentionCount, 0),
      countriesIndexed: geography.summary.countriesIndexed,
      elementsWithGeo: geography.summary.elementsWithGeo,
      miningSiteCount: miningSites.summary.siteCount,
      curatedSiteCount: miningSites.summary.curatedCount,
      strategicProjectCount: miningSites.summary.strategicCount ?? 0,
      mrdsSiteCount: miningSites.summary.mrdsCount,
      strategicProjectCountries: strategicProjects?.summary?.countryCount ?? 0,
      productionCountries: productionGeography?.byCountry?.length ?? 0,
      tradeReporters: tradeGeography?.byReporter?.length ?? 0,
      tradeFlows: tradeGeography?.topFlows?.length ?? 0,
      asxResourceProjects: resourceEstimates?.summary?.projectCount ?? 0,
      chinaPolicyEvents: chinaPolicy?.events?.length ?? 0,
      publicReportCount: PUBLIC_REPORTS.length,
    },
  };
}
