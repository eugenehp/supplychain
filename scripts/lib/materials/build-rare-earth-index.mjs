import { writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PATHS } from '../paths.mjs';
import { rareEarthSecWatchlist } from './rare-earth-miners.mjs';
import { extractAllRareEarthFilings, buildRareEarthIndex } from './extract-rare-earth-sec.mjs';
import { buildMaterialsSearchIndex, enrichFilingRowsWithExcerptRefs } from './build-materials-search.mjs';
import { buildSourceTextCache } from './load-source-text.mjs';
import { exportMaterialsSources } from './export-materials-sources.mjs';
import { fetchAllInternational } from './international/fetch-filing.mjs';
import { fetchAllPublicReports } from './public-reports/fetch-report.mjs';
import { importMrdsReeSites, loadMrdsSitesCache } from './structured/import-mrds.mjs';
import { buildStructuredGeography } from './structured/build-structured-geography.mjs';
import { strategicProjectsToMapSites } from './structured/load-eu-strategic-projects.mjs';
import { MINING_SITES } from './mining-sites.mjs';
import { allSecWatchlistTickers } from '../topics/index.mjs';
import { buildAsxResourceIndex } from './structured/parse-ni43-resources.mjs';

export const MATERIALS_RARE_EARTH_DIR = join(PATHS.topics, '..', 'materials', 'rare-earth');
export const STATIC_MATERIALS_RARE_EARTH = join(PATHS.staticRoot, 'materials', 'rare-earth');

/** Miner tickers + semiconductor, auto, defense, and wind filers citing RE supply risk. */
export function allRareEarthIndexTickers() {
  const miners = new Set(rareEarthSecWatchlist());
  const downstream = [
    'NVDA', 'INTC', 'MU', 'AMD', 'TSM', 'ASML', 'AAPL', 'GM', 'F', 'TSLA',
    'LMT', 'RTX', 'NOC', 'GD', 'GEV', 'ENPH', 'RIVN', 'STLA', 'EMR', 'ROK', 'HON', 'PH',
  ];
  for (const t of downstream) miners.add(t);
  return [...miners].sort();
}

export async function buildAndWriteRareEarthIndex({
  fetchIntl = true,
  forceIntl = false,
  fetchReports = true,
  forceReports = false,
  useAsxCrawler = true,
  importMrds = true,
  forceMrds = false,
  forceCsv = false,
  forceComtrade = false,
} = {}) {
  const tickers = allRareEarthIndexTickers();
  const minerTickers = rareEarthSecWatchlist();
  let internationalMeta = [];
  if (fetchIntl) {
    console.log('  Fetching international annual reports…');
    internationalMeta = await fetchAllInternational({ force: forceIntl, useAsxCrawler });
    const ok = internationalMeta.filter((r) => r.textLength > 3000).length;
    console.log(`    ${ok}/${internationalMeta.length} international filings with extractable text`);
  }
  let publicReportsMeta = [];
  if (fetchReports) {
    console.log('  Fetching public commodity reports (USGS, etc.)…');
    publicReportsMeta = await fetchAllPublicReports({ force: forceReports });
    const ok = publicReportsMeta.filter((r) => r.textLength > 2000).length;
    console.log(`    ${ok}/${publicReportsMeta.length} public reports with extractable text`);
  }
  let mrdsPayload = { sites: [] };
  if (importMrds) {
    console.log('  Importing USGS MRDS rare-earth deposits…');
    try {
      mrdsPayload = await importMrdsReeSites({ force: forceMrds, curatedSites: MINING_SITES });
      console.log(`    ${mrdsPayload.siteCount} MRDS deposits (${mrdsPayload.totalRows} rows in source)`);
    } catch (err) {
      console.log(`    MRDS import skipped: ${err.message}`);
      mrdsPayload = loadMrdsSitesCache();
    }
  }

  const {
    productionGeography,
    strategicProjects,
    tradeGeography,
    usgsHistorical,
    chinaPolicy,
    myanmarSupply,
  } = await buildStructuredGeography({ forceCsv, forceComtrade });

  const filingRows = extractAllRareEarthFilings(tickers);
  const downstreamTickers = tickers.filter((t) => !minerTickers.includes(t));

  const textCache = buildSourceTextCache(filingRows);
  enrichFilingRowsWithExcerptRefs(filingRows, textCache);
  const resourceEstimates = buildAsxResourceIndex(filingRows, textCache);

  const index = buildRareEarthIndex({
    filingRows,
    downstreamTickers,
    internationalMeta,
    publicReportsMeta,
    mrdsSites: mrdsPayload.sites ?? [],
    strategicProjectSites: strategicProjectsToMapSites(strategicProjects),
    productionGeography,
    strategicProjects,
    tradeGeography,
    usgsHistorical,
    chinaPolicy,
    myanmarSupply,
    resourceEstimates,
  });

  mkdirSync(MATERIALS_RARE_EARTH_DIR, { recursive: true });
  const dataPath = join(MATERIALS_RARE_EARTH_DIR, 'index.json');
  writeFileSync(dataPath, JSON.stringify(index, null, 2));

  mkdirSync(STATIC_MATERIALS_RARE_EARTH, { recursive: true });
  const staticPath = join(STATIC_MATERIALS_RARE_EARTH, 'index.json');
  writeFileSync(staticPath, JSON.stringify(index, null, 2));

  const searchIndex = buildMaterialsSearchIndex(filingRows, index.elements);
  const searchPath = join(STATIC_MATERIALS_RARE_EARTH, 'search-index.json');
  writeFileSync(searchPath, JSON.stringify(searchIndex));
  const dataSearchPath = join(MATERIALS_RARE_EARTH_DIR, 'search-index.json');
  writeFileSync(dataSearchPath, JSON.stringify(searchIndex));

  const exportedSources = exportMaterialsSources(textCache, filingRows);
  console.log(`    Materials search: ${searchIndex.chunkCount} chunks; ${exportedSources.length} source texts exported`);

  console.log(`  ✓ Rare earth index: ${index.summary.elementsWithSecMentions}/${index.summary.elementCount} elements with SEC mentions`);
  console.log(`    ${index.summary.minersIndexed} miners, ${index.summary.totalMentions} total element mentions`);
  console.log(`    Geography: ${index.summary.countriesIndexed} countries, ${index.summary.elementsWithGeo} elements with geo distribution`);
  console.log(
    `    Mining sites: ${index.summary.miningSiteCount} (${index.summary.curatedSiteCount} curated + ${index.summary.strategicProjectCount ?? 0} EU strategic + ${index.summary.mrdsSiteCount} MRDS); ${index.summary.internationalFilings} intl + ${index.summary.publicReportsIndexed ?? 0} public reports`,
  );
  console.log(
    `    USGS production: ${index.summary.productionCountries} countries, ${index.productionGeography?.worldTotalMt?.toLocaleString() ?? '?'} t REO (2024 est.)`,
  );
  console.log(
    `    Trade flows: ${index.summary.tradeReporters ?? 0} reporters; ASX resources: ${index.summary.asxResourceProjects ?? 0} projects`,
  );
  console.log(`    → ${dataPath}`);

  return index;
}

/** Tickers to add to pipeline scrape (miners not already in accelerator watchlist). */
export function additionalMaterialsScrapeTickers() {
  const existing = new Set(allSecWatchlistTickers());
  return rareEarthSecWatchlist().filter((t) => !existing.has(t));
}
