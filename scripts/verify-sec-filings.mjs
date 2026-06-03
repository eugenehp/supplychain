#!/usr/bin/env node
/**
 * Verify every ticker in the topic SEC watchlist has a scraped raw filing on disk.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { allSecWatchlistTickers } from './lib/topics/index.mjs';
import { additionalMaterialsScrapeTickers } from './lib/materials/build-rare-earth-index.mjs';

function allWatchlistTickers() {
  const set = new Set(allSecWatchlistTickers());
  for (const t of additionalMaterialsScrapeTickers()) set.add(t);
  return [...set].sort();
}
import { companyRawDir, companyProcessedDir } from './lib/paths.mjs';
import { validateRawCompany, validateProcessedCompany } from './lib/validator.mjs';
import { loadRawCompany } from './lib/scrape-store.mjs';

const tickers = allWatchlistTickers();
let failed = 0;

console.log(`Verifying ${tickers.length} SEC watchlist tickers…\n`);

for (const ticker of tickers) {
  const metaPath = join(companyRawDir(ticker), 'metadata.json');
  if (!existsSync(metaPath)) {
    console.log(`✗ ${ticker}: missing raw metadata (${metaPath})`);
    failed++;
    continue;
  }

  let raw;
  try {
    raw = loadRawCompany(ticker);
  } catch (err) {
    console.log(`✗ ${ticker}: load failed — ${err.message}`);
    failed++;
    continue;
  }

  const rawVal = validateRawCompany(raw.metadata ?? raw);
  const procPath = join(companyProcessedDir(ticker), 'manifest.json');
  let procVal = { valid: true };
  if (existsSync(procPath)) {
    try {
      const manifest = JSON.parse(readFileSync(procPath, 'utf8'));
      procVal = validateProcessedCompany({
        textLength: manifest.textLength,
        sectionCount: manifest.sectionCount,
        chunkCount: manifest.chunkCount,
        entities: { vendors: Array(manifest.vendorCount ?? 0).fill('') },
      });
    } catch {
      /* processed optional for verify */
    }
  }

  if (!rawVal.valid) {
    console.log(`✗ ${ticker}: raw validation failed — ${rawVal.errors?.join('; ') ?? 'unknown'}`);
    failed++;
    continue;
  }

  const filing = raw.metadata?.filing ?? raw.filing;
  console.log(
    `✓ ${ticker}: ${filing?.form ?? '?'} ${filing?.filingDate ?? ''}`.trim(),
  );
}

console.log(failed ? `\n${failed} ticker(s) failed verification.` : '\nAll SEC filings verified.');
process.exit(failed ? 1 : 0);
