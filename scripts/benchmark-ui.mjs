#!/usr/bin/env node
/**
 * UI performance benchmark — run: npm run benchmark:ui
 * Measures filing parse, section layout, evidence index, and embedding load.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';

const ROOT = join(import.meta.dirname, '..');
const SEC = join(ROOT, 'static/sec');

function ms(start) {
  return `${(performance.now() - start).toFixed(1)}ms`;
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(0)}KB`;
}

async function main() {
  const { buildSectionDisplay } = await import(join(ROOT, 'src/lib/filing-format.js'));
  const { buildEvidenceBm25Index } = await import(join(ROOT, 'src/lib/bm25.js'));
  const { loadEmbeddingIndex } = await import(join(ROOT, 'src/lib/embeddings.js'));

  console.log('Supply chain UI benchmark\n');

  const tickers = readdirSync(SEC).filter(
    (d) => existsSync(join(SEC, d, 'filing.txt')) && !d.startsWith('.'),
  );

  let totalText = 0;
  let totalSectionMs = 0;

  for (const ticker of tickers.sort()) {
    const text = readFileSync(join(SEC, ticker, 'filing.txt'), 'utf8');
    const sections = JSON.parse(readFileSync(join(SEC, ticker, 'sections.json'), 'utf8'));
    totalText += text.length;

    const t0 = performance.now();
    for (const section of sections) buildSectionDisplay(section, text, null);
    const sectionMs = performance.now() - t0;
    totalSectionMs += sectionMs;

    console.log(
      `  ${ticker.padEnd(5)} filing ${kb(text.length).padStart(7)}  sections ${String(sections.length).padStart(2)}  buildSectionDisplay ${sectionMs.toFixed(1).padStart(6)}ms`,
    );
  }

  console.log(`\nFiling layout total: ${totalSectionMs.toFixed(1)}ms across ${tickers.length} tickers (${kb(totalText)} text)\n`);

  const tEvidence = performance.now();
  const merged = [];
  for (const ticker of tickers) {
    const path = join(SEC, ticker, 'evidence.json');
    if (!existsSync(path)) continue;
    const data = JSON.parse(readFileSync(path, 'utf8'));
    merged.push(...(data.entries ?? []));
  }
  console.log(`Evidence JSON parse (${merged.length} entries): ${ms(tEvidence)}`);

  const tBm25 = performance.now();
  buildEvidenceBm25Index(merged);
  console.log(`BM25 index build: ${ms(tBm25)}`);

  const embedPath = join(SEC, 'evidence-embeddings.json');
  if (existsSync(embedPath)) {
    const raw = readFileSync(embedPath, 'utf8');
    const tParse = performance.now();
    const data = JSON.parse(raw);
    console.log(`Embedding JSON parse (${kb(raw.length)}): ${ms(tParse)}`);

    const tLoad = performance.now();
    loadEmbeddingIndex(data);
    console.log(`Embedding index load: ${ms(tLoad)}`);
  }

  console.log('\nRecommendations:');
  console.log('  • Render one filing section at a time in FilingViewer (not all sections).');
  console.log('  • Lazy-load FilingViewer chunk; preload on idle/hover.');
  console.log('  • Defer evidence embeddings until hybrid/semantic search is used.');
  console.log('  • Paginate excerpt lists; parallel-fetch evidence JSON.');
  console.log('  • Mount below-fold panels only when scrolled into view.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
