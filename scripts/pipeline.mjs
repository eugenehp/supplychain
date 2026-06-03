#!/usr/bin/env node
/**
 * Full data pipeline (run via `npm run rag`):
 * scrape → process → validate → RAG index → static export → topics → materials index
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { PATHS } from './lib/paths.mjs';
import { getBuildTopics, allSecWatchlistTickers } from './lib/topics/index.mjs';
import { additionalMaterialsScrapeTickers, buildAndWriteRareEarthIndex } from './lib/materials/build-rare-earth-index.mjs';
import { scrapeAllRaw, loadRawCompany, saveProcessedCompany } from './lib/scrape-store.mjs';
import { processFiling } from './lib/filing-processor.mjs';
import { validateRawCompany, validateProcessedCompany, validateGraph, validateSankey, buildPipelineReport } from './lib/validator.mjs';
import { clearRagIndex, indexChunks, getIndexStats, closeDb } from './lib/rag-store.mjs';
import { extractSecGroundedVendors, writeSecGroundedCatalog } from './lib/sec-grounding.mjs';
import { exportAllFilingsToStatic, ensureStaticAssets } from './lib/export-static-filings.mjs';
import { exportStaticRag } from './lib/export-static-rag.mjs';
import { resolveLogoUrls } from './lib/company-logos.mjs';
import { buildTopicPipeline, writeTopicOutputs, writeTopicsIndex } from './lib/build-sankey.mjs';
import { writeSimilarityIndex } from './lib/build-similarity-index.mjs';
import { buildGraphFromPipeline } from './lib/graph-builder.mjs';
import { TOPIC_MODULES } from './lib/topics/registry.mjs';
import { queryRag } from './lib/rag-query.mjs';

const args = process.argv.slice(2);
const skipScrape = args.includes('--skip-scrape');
const skipEmbed = args.includes('--skip-embed');
const queryArg = args.find((a) => a.startsWith('--query='))?.slice(8) ?? (args.includes('--query') ? args[args.indexOf('--query') + 1] : null);

function allWatchlistTickers() {
  const set = new Set(allSecWatchlistTickers());
  for (const t of additionalMaterialsScrapeTickers()) set.add(t);
  return [...set].sort();
}

async function stageScrape() {
  const tickers = allWatchlistTickers();
  console.log('\n══ Stage 1: Scrape SEC raw filings ══');
  if (skipScrape) {
    console.log('  (skipped — using existing raw data)');
    return tickers.map((t) => loadRawCompany(t).metadata);
  }
  return scrapeAllRaw(tickers);
}

async function stageProcess(rawResults) {
  console.log('\n══ Stage 2: Process & extract each filing ══');
  const processed = [];
  for (const raw of rawResults) {
    if (raw.error && !raw.filing) {
      console.log(`  ✗ ${raw.ticker}: ${raw.error}`);
      continue;
    }
    const { html, facts, metadata } = loadRawCompany(raw.ticker);
    const result = processFiling({ html, metadata: { ...metadata, ticker: raw.ticker }, facts });
    const validation = validateProcessedCompany({
      textLength: result.text.length,
      sectionCount: result.sections.length,
      chunkCount: result.chunks.length,
      entities: result.entities,
    });
    saveProcessedCompany(raw.ticker, result, validation);
    processed.push({ ticker: raw.ticker, ...result, validation });
    console.log(`  ✓ ${raw.ticker}: ${result.chunks.length} chunks, ${result.entities.vendors.length} vendors`);
  }
  return processed;
}

async function stageValidateRaw(rawResults) {
  console.log('\n══ Stage 3: Validate raw data ══');
  return rawResults.map((raw) => ({ ticker: raw.ticker, ...validateRawCompany(raw) }));
}

async function stageRagIndex(processed) {
  console.log('\n══ Stage 4: Build RAG index ══');
  clearRagIndex();
  let total = 0;
  for (const p of processed) {
    total += indexChunks(p.chunks, p.entities, p.ticker);
  }
  const stats = getIndexStats();
  console.log(`  Total: ${stats.documents} documents, ${stats.vendors} vendor records`);
  return stats;
}

async function stageTopics(processed, staticFilings) {
  console.log('\n══ Stage 5–6: Build graphs & Sankey per topic ══');
  const secData = staticFilings.map((f) => ({
    ticker: f.ticker,
    name: f.name,
    cik: f.cik,
    filing: f.filing,
    filingUrl: f.filingUrl,
    facts: f.facts,
    evidenceCount: f.evidenceCount,
    logoUrl: f.logoUrl ?? resolveLogoUrls(f.ticker).url,
    logoPrimaryUrl: f.logoPrimaryUrl ?? resolveLogoUrls(f.ticker).primary,
    logoFallbackUrl: f.logoFallbackUrl ?? resolveLogoUrls(f.ticker).fallback,
    localTextUrl: f.localUrls?.text,
    metadataUrl: f.localUrls?.metadata,
    sectionsUrl: f.localUrls?.sections,
    evidenceUrl: f.localUrls?.evidence,
    error: f.error,
  }));

  const datasets = {};
  const validations = [];

  for (const topicMeta of getBuildTopics()) {
    console.log(`\n  ── ${topicMeta.label} (${topicMeta.id}) ──`);
    const secGrounded = extractSecGroundedVendors(topicMeta.secWatchlist);
    writeSecGroundedCatalog(topicMeta.id, secGrounded);
    console.log(`    SEC vendors: ${secGrounded.length}`);

    const topicModule = TOPIC_MODULES[topicMeta.id];
    const { graph } = buildGraphFromPipeline(topicModule, processed, secGrounded);
    const graphVal = validateGraph(graph, topicModule.PRODUCT_NODE);
    console.log(`    Graph: ${graph.nodes.length} nodes, ${graph.links.length} links`);

    const dataset = buildTopicPipeline(topicMeta, secData, processed, secGrounded);
    const sankeyVal = validateSankey(dataset);
    const outPath = writeTopicOutputs(topicMeta.id, dataset);
    datasets[topicMeta.id] = dataset;

    console.log(`    Sankey: ${dataset.nodes.length} nodes, ${dataset.links.length} links → ${outPath}`);
    console.log(`    BOM: $${dataset.summary.totalBomPerChip}/chip`);
    validations.push({ topic: topicMeta.id, graph: graphVal, sankey: sankeyVal });
  }

  writeTopicsIndex(datasets);
  writeSimilarityIndex(datasets);
  return { datasets, validations };
}

async function main() {
  mkdirSync(PATHS.reports, { recursive: true });
  console.log('Supply Chain Research Pipeline');
  console.log('Topics:', getBuildTopics().map((t) => t.label).join(', '));

  if (queryArg) {
    console.log(JSON.stringify(queryRag(queryArg), null, 2));
    closeDb();
    return;
  }

  const rawResults = await stageScrape();
  const rawValidations = await stageValidateRaw(rawResults);
  for (const v of rawValidations) console.log(`  ${v.valid ? '✓' : '✗'} ${v.ticker}`);

  const processed = await stageProcess(rawResults);

  console.log('\n══ Stage 2b: Build RAG SQLite index ══');
  const ragStats = await stageRagIndex(processed);

  console.log('\n══ Stage 2c: Export SEC filings to static ══');
  ensureStaticAssets();
  const staticIndex = await exportAllFilingsToStatic(allWatchlistTickers(), { skipEmbed });
  for (const f of staticIndex.filings) {
    console.log(`  ✓ ${f.ticker}: ${f.evidenceCount} evidence excerpts → static/sec/${f.ticker}/`);
  }

  console.log('\n══ Stage 2d: Export browser RAG index + embeddings ══');
  const ragManifest = await exportStaticRag(processed, { skipEmbed });
  console.log(`  ✓ ${ragManifest.chunkCount} chunks ready for in-browser search`);

  const finalStats = getIndexStats();
  console.log(`  ✓ Embeddings: ${finalStats.evidenceEmbeddings} evidence, ${finalStats.documentEmbeddings} document vectors`);

  const { datasets, validations } = await stageTopics(processed, staticIndex.filings);

  console.log('\n══ Stage 7: Rare earth materials index ══');
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

  const report = buildPipelineReport([
    { stage: 'raw', valid: rawValidations.every((v) => v.valid), details: rawValidations },
    { stage: 'rag', valid: ragStats.documents > 0, details: { ...ragStats, ...finalStats } },
    { stage: 'topics', valid: validations.every((v) => v.graph.valid && v.sankey.valid), details: validations },
  ]);
  writeFileSync(join(PATHS.reports, 'pipeline-report.json'), JSON.stringify(report, null, 2));

  console.log('\n══ Pipeline complete ══');
  console.log(report.summary);
  closeDb();
  if (!report.valid) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  closeDb();
  process.exit(1);
});
