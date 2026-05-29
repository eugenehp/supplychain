#!/usr/bin/env node
/**
 * Predownload all company logos to static/logos/ from Wikidata / Wikimedia Commons.
 */
import { fetchAllCompanyLogos, readLogoManifest, allLogoSlugs } from './lib/company-logos.mjs';

const slugs = allLogoSlugs();
console.log(`Predownloading ${slugs.length} company logos…\n`);

const results = await fetchAllCompanyLogos();
const manifest = readLogoManifest();

let fetched = 0;
let fallback = 0;

for (const slug of slugs) {
  const ok = results[slug];
  const meta = manifest[slug];
  if (ok) {
    fetched++;
    console.log(`  ✓ ${slug}: ${meta?.source ?? 'fetched'} ${meta?.ext ?? ''} (${meta?.bytes ?? '?'} bytes)`);
  } else {
    fallback++;
    console.log(`  · ${slug}: SVG badge fallback only`);
  }
}

console.log(`\nDone — ${fetched} downloaded, ${fallback} fallback(s).`);
console.log(`Manifest: static/logos/manifest.json`);
