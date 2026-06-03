#!/usr/bin/env node
/** Run ASX announcement crawler only (writes per-company asx-crawl.json caches). */
import { INTERNATIONAL_MINERS } from './lib/materials/international/registry.mjs';
import { crawlAllAsxCompanies } from './lib/materials/international/asx-crawler.mjs';

const force = process.argv.includes('--force');
const results = await crawlAllAsxCompanies(INTERNATIONAL_MINERS, { force });
const found = results.filter((r) => r.discovered);
console.log(`\n${found.length}/${results.length} ASX companies with annual-report match in recent feed`);
for (const r of found) {
  console.log(`  ${r.id}: ${r.discovered.label}`);
}
