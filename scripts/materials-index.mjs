#!/usr/bin/env node
/** Build rare-earth materials index only (international + USGS + SEC extract). */
import { buildAndWriteRareEarthIndex } from './lib/materials/build-rare-earth-index.mjs';

const args = process.argv.slice(2);
await buildAndWriteRareEarthIndex({
  fetchIntl: !args.includes('--skip-international'),
  forceIntl: args.includes('--force-international'),
  fetchReports: !args.includes('--skip-public-reports'),
  forceReports: args.includes('--force-reports'),
  useAsxCrawler: !args.includes('--skip-asx-crawler'),
  importMrds: !args.includes('--skip-mrds'),
  forceMrds: args.includes('--force-mrds'),
  forceCsv: args.includes('--force-csv'),
  forceComtrade: args.includes('--force-comtrade'),
});
