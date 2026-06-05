#!/usr/bin/env node
/**
 * Space economy research pipeline.
 *
 * Self-contained per-topic build — does NOT touch the global static/rag/ bundle.
 * Reads the watchlist + public-report sources from data/space-economy/index.json,
 * scrapes SEC EDGAR filings for those tickers, processes them through the same
 * chunker used elsewhere, fetches space-agency public reports (best-effort),
 * and emits everything under static/space-economy/{rag,sec,reports,index.json}.
 *
 * Usage:
 *   npm run rag:space-economy                          # full build
 *   node scripts/space-economy-index.mjs --skip-scrape # reuse cached raw
 *   node scripts/space-economy-index.mjs --skip-embed  # skip MiniLM vectors
 *   node scripts/space-economy-index.mjs --skip-reports
 *   node scripts/space-economy-index.mjs --force-reports
 */

import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PATHS, topicStaticDir } from './lib/paths.mjs';
import { scrapeCompanyRaw, loadRawCompany, saveProcessedCompany } from './lib/scrape-store.mjs';
import { loadTickerMap } from './lib/edgar-client.mjs';
import { processFiling } from './lib/filing-processor.mjs';
import { validateProcessedCompany } from './lib/validator.mjs';
import { exportTopicFiling, writeTopicFilingsIndex } from './lib/space/export-topic-filings.mjs';
import { exportTopicRag } from './lib/space/export-topic-rag.mjs';
import { fetchPublicReports } from './lib/space/fetch-public-reports.mjs';
import { extractAnswersForTopic } from './lib/space/extract-research-answers.mjs';
import { extractDeepDivesForTopic } from './lib/space/extract-deep-dives.mjs';
import { writeMetrics } from './lib/space/extract-metrics.mjs';
import { extractRiskDiffsForTopic } from './lib/space/extract-risk-diffs.mjs';
import { writeCrossTopic } from './lib/space/extract-cross-topic.mjs';
import { writeWordCloud } from './lib/space/extract-wordcloud.mjs';
import { writeUmap } from './lib/space/extract-umap.mjs';
import { extractSankeysForTopic } from './lib/space/extract-sankey.mjs';
import { buildTopicEvidenceEmbeddings } from './lib/space/build-evidence-embeddings.mjs';
import { writeGlossary } from './lib/space/extract-glossary.mjs';
import { writeInsiders } from './lib/space/extract-insiders.mjs';
import { writeVendorNetwork } from './lib/space/extract-vendor-network.mjs';
import { extractTimelineForTopic } from './lib/space/extract-8k-timeline.mjs';
import { writeTrends } from './lib/space/extract-trends.mjs';
import { extractContractsForTopic } from './lib/space/fetch-contracts.mjs';
import { fetchPricesForTopic } from './lib/space/fetch-prices.mjs';
import { fetchSbirForTopic } from './lib/space/fetch-sbir.mjs';
import { fetchLaunchesForTopic } from './lib/space/fetch-launches.mjs';
import { fetchPatentsForTopic } from './lib/space/fetch-patents.mjs';
import { writeConcentration } from './lib/space/extract-concentration.mjs';

const TOPIC_ID = 'space-economy';
const args = process.argv.slice(2);
const skipScrape = args.includes('--skip-scrape');
const skipEmbed = args.includes('--skip-embed');
const skipReports = args.includes('--skip-reports');
const forceReports = args.includes('--force-reports');
const skipAnswers = args.includes('--skip-answers');
const skipRiskDiffs = args.includes('--skip-risk-diffs');
const skipWordCloud = args.includes('--skip-wordcloud');
const skipUmap = args.includes('--skip-umap');
const skipSankey = args.includes('--skip-sankey');
const skipEvidenceEmbed = args.includes('--skip-evidence-embed');
const skipGlossary = args.includes('--skip-glossary');
const skipInsiders = args.includes('--skip-insiders');
const skipVendorNetwork = args.includes('--skip-vendor-network');
const skipTimeline = args.includes('--skip-timeline');
const skipTrends = args.includes('--skip-trends');
const skipContracts = args.includes('--skip-contracts');
const skipPrices = args.includes('--skip-prices');
const skipSbir = args.includes('--skip-sbir');
const skipLaunches = args.includes('--skip-launches');
const skipPatents = args.includes('--skip-patents');
const skipConcentration = args.includes('--skip-concentration');

function loadTopicIndex() {
  const path = join(PATHS.spaceEconomy, 'index.json');
  if (!existsSync(path)) {
    throw new Error(`Missing ${path} — seed the topic scope first.`);
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

function uniqueSecTickers(index) {
  const set = new Set();
  for (const w of index.watchlist ?? []) {
    if (w.filingType === '10-K' || w.filingType === '20-F') set.add(w.ticker.toUpperCase());
  }
  return [...set].sort();
}

async function stageScrape(tickers) {
  console.log('\n══ Stage 1: Scrape SEC raw filings ══');
  if (skipScrape) {
    console.log('  (skipped — using existing raw data)');
    const results = [];
    for (const t of tickers) {
      try {
        const { metadata } = loadRawCompany(t);
        results.push({ ticker: t, ...metadata });
      } catch (err) {
        results.push({ ticker: t, error: err.message });
      }
    }
    return results;
  }
  const tickerMap = await loadTickerMap();
  const results = [];
  for (const ticker of tickers) {
    console.log(`  [raw] ${ticker}`);
    results.push(await scrapeCompanyRaw(ticker, tickerMap));
  }
  return results;
}

function stageProcess(rawResults) {
  console.log('\n══ Stage 2: Process & extract each filing ══');
  const processed = [];
  for (const raw of rawResults) {
    if (raw.error && !raw.filing) {
      console.log(`  ✗ ${raw.ticker}: ${raw.error}`);
      continue;
    }
    try {
      const { html, facts, metadata } = loadRawCompany(raw.ticker);
      if (!html) {
        console.log(`  ✗ ${raw.ticker}: no filing.html (likely scrape error)`);
        continue;
      }
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
    } catch (err) {
      console.log(`  ✗ ${raw.ticker}: process error — ${err.message}`);
    }
  }
  return processed;
}

function stageExportFilings(tickers) {
  console.log(`\n══ Stage 3: Export filings → static/${TOPIC_ID}/sec/<TICKER>/ ══`);
  const filings = [];
  for (const ticker of tickers) {
    const result = exportTopicFiling(TOPIC_ID, ticker);
    filings.push(result);
    if (result.error) {
      console.log(`  ✗ ${ticker}: ${result.error}`);
    } else {
      console.log(`  ✓ ${ticker}: ${result.evidenceCount} evidence excerpts`);
    }
  }
  writeTopicFilingsIndex(TOPIC_ID, filings);
  return filings;
}

async function stagePublicReports(index) {
  console.log(`\n══ Stage 4: Fetch public reports (NASA, FAA, ESA, GAO) ══`);
  if (skipReports) {
    console.log('  (skipped — --skip-reports)');
    return [];
  }
  const results = await fetchPublicReports(index.publicReports ?? [], { force: forceReports });

  const reportsOut = join(topicStaticDir(TOPIC_ID), 'reports');
  mkdirSync(reportsOut, { recursive: true });
  const reportIndex = results.map((r) => ({
    id: r.id,
    agency: r.agency,
    title: r.title,
    year: r.year,
    url: r.url,
    sourceType: r.sourceType ?? null,
    textLength: r.textLength ?? 0,
    chunkCount: r.chunks?.length ?? 0,
    error: r.error ?? null,
    skipped: r.skipped ?? false,
  }));
  writeFileSync(
    join(reportsOut, 'index.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), topicId: TOPIC_ID, reports: reportIndex }, null, 2),
  );

  // Surface report text into the static bundle for evidence viewing.
  for (const r of results) {
    if (!r.chunks?.length) continue;
    const reportDir = join(reportsOut, r.id);
    mkdirSync(reportDir, { recursive: true });
    const srcText = join(PATHS.rawPublicSpace, r.id, 'report.txt');
    if (existsSync(srcText)) cpSync(srcText, join(reportDir, 'report.txt'));
    writeFileSync(
      join(reportDir, 'meta.json'),
      JSON.stringify({ ...reportIndex.find((x) => x.id === r.id) }, null, 2),
    );
  }

  return results;
}

async function stageExportRag(processed, publicReportResults) {
  console.log(`\n══ Stage 5: Build per-topic RAG → static/${TOPIC_ID}/rag/ ══`);
  const publicReportChunks = publicReportResults.flatMap((r) => r.chunks ?? []);
  const manifest = await exportTopicRag(TOPIC_ID, processed, { skipEmbed, publicReportChunks });
  return manifest;
}

function stageSankey(processed) {
  console.log(`\n══ Stage 6h: Per-ticker supply-chain Sankeys → static/${TOPIC_ID}/sankey/ ══`);
  if (skipSankey) {
    console.log('  (skipped — --skip-sankey)');
    return null;
  }
  const tickers = processed.map((p) => p.ticker);
  const results = extractSankeysForTopic({ topicId: TOPIC_ID, tickers });
  const ok = results.filter((r) => !r.error);
  console.log(`  ✓ ${ok.length}/${results.length} Sankeys built`);
  for (const r of results) {
    if (r.error) {
      console.log(`    · ${r.ticker}: ${r.error}`);
    } else {
      const subs = r.topSubsystems?.length ? ` · top: ${r.topSubsystems.join(', ')}` : '';
      console.log(`    · ${r.ticker}: ${r.nodeCount} nodes · ${r.linkCount} links · flow=${r.totalFlow}${subs}`);
    }
  }
  return results;
}

async function stageEvidenceEmbed(processed) {
  console.log(`\n══ Stage 3b: Evidence embeddings → static/${TOPIC_ID}/sec/evidence-embeddings.json ══`);
  if (skipEvidenceEmbed) {
    console.log('  (skipped — --skip-evidence-embed)');
    return null;
  }
  const tickers = processed.map((p) => p.ticker);
  const result = await buildTopicEvidenceEmbeddings({ topicId: TOPIC_ID, tickers });
  if (result.error) {
    console.log(`  ✗ ${result.error}`);
    return null;
  }
  console.log(`  ✓ ${result.count} evidence excerpts embedded`);
  return result;
}

function stageGlossary() {
  console.log(`\n══ Stage 6i: Glossary → static/${TOPIC_ID}/glossary/ ══`);
  if (skipGlossary) {
    console.log('  (skipped)');
    return null;
  }
  const result = writeGlossary({ topicId: TOPIC_ID });
  if (result.error) {
    console.log(`  ✗ ${result.error}`);
    return null;
  }
  const curated = result.entries.filter((e) => e.source === 'curated').length;
  const corpus = result.entries.filter((e) => e.source === 'corpus').length;
  console.log(`  ✓ ${result.termCount} terms · ${curated} curated · ${corpus} auto-discovered`);
  return result;
}

function stageInsiders(processed) {
  console.log(`\n══ Stage 6j: Insider transactions (Form 4) → static/${TOPIC_ID}/insiders/ ══`);
  if (skipInsiders) {
    console.log('  (skipped)');
    return null;
  }
  const tickers = processed.map((p) => p.ticker);
  const result = writeInsiders({ topicId: TOPIC_ID, tickers });
  const total = result.rows.reduce((n, r) => n + (r.total ?? 0), 0);
  const top = result.rows.slice(0, 5).map((r) => `${r.ticker}(${r.total})`).join(', ');
  console.log(`  ✓ ${result.tickerCount} filers · ${total} insider/ownership filings · top: ${top}`);
  return result;
}

function stageVendorNetwork(processed) {
  console.log(`\n══ Stage 6k: Vendor radial-tree → static/${TOPIC_ID}/vendor-network/ ══`);
  if (skipVendorNetwork) {
    console.log('  (skipped)');
    return null;
  }
  const tickers = processed.map((p) => p.ticker);
  const result = writeVendorNetwork({ topicId: TOPIC_ID, tickers });
  if (result.error) {
    console.log(`  ✗ ${result.error}`);
    return null;
  }
  console.log(
    `  ✓ ${result.summary.supplierCount} suppliers · ${result.summary.sharedSuppliers} shared across ≥2 filers · ${result.summary.filerLinkCount} filer-supplier edges`,
  );
  if (result.summary.topShared?.length) {
    for (const s of result.summary.topShared.slice(0, 4)) {
      console.log(`    · ${s.supplier} (${s.subsystem}): ${s.filers} filers, ${s.mentions} mentions`);
    }
  }
  return result;
}

function stageTrends(processed) {
  console.log(`\n══ Stage 6m: Multi-year XBRL trends → static/${TOPIC_ID}/trends/ ══`);
  if (skipTrends) { console.log('  (skipped)'); return null; }
  const tickers = processed.map((p) => p.ticker);
  const r = writeTrends({ topicId: TOPIC_ID, tickers, years: 5 });
  const okCount = r.companies.filter((c) => c.series?.revenue?.length).length;
  console.log(`  ✓ ${okCount}/${r.companies.length} filers with revenue series · last ${r.years}y`);
  return r;
}

function stageConcentration(processed) {
  console.log(`\n══ Stage 6n: Vendor concentration (HHI) → static/${TOPIC_ID}/concentration/ ══`);
  if (skipConcentration) { console.log('  (skipped)'); return null; }
  const tickers = processed.map((p) => p.ticker);
  const r = writeConcentration({ topicId: TOPIC_ID, tickers });
  const buckets = new Map();
  for (const c of r.companies) buckets.set(c.worstBucket, (buckets.get(c.worstBucket) ?? 0) + 1);
  console.log(`  ✓ ${r.companies.length} filers · worst-bucket: ${[...buckets.entries()].map(([k, v]) => `${k}(${v})`).join(', ')}`);
  return r;
}

async function stageContracts(processed) {
  console.log(`\n══ Stage 6o: Federal contracts (USAspending) → static/${TOPIC_ID}/contracts/ ══`);
  if (skipContracts) { console.log('  (skipped)'); return null; }
  const tickers = processed.map((p) => p.ticker);
  return await extractContractsForTopic({ topicId: TOPIC_ID, tickers, years: 5 });
}

async function stagePrices(processed) {
  console.log(`\n══ Stage 6p: Daily prices (Stooq) → static/${TOPIC_ID}/prices/ ══`);
  if (skipPrices) { console.log('  (skipped)'); return null; }
  const tickers = processed.map((p) => p.ticker);
  return await fetchPricesForTopic({ topicId: TOPIC_ID, tickers, years: 2 });
}

async function stageSbir(processed) {
  console.log(`\n══ Stage 6q: SBIR / STTR awards → static/${TOPIC_ID}/sbir/ ══`);
  if (skipSbir) { console.log('  (skipped)'); return null; }
  const tickers = processed.map((p) => p.ticker);
  return await fetchSbirForTopic({ topicId: TOPIC_ID, tickers });
}

async function stageLaunches() {
  console.log(`\n══ Stage 6r: Launch manifest (GCAT) → static/${TOPIC_ID}/launches/ ══`);
  if (skipLaunches) { console.log('  (skipped)'); return null; }
  return await fetchLaunchesForTopic({ topicId: TOPIC_ID, years: 3 });
}

async function stagePatents(processed) {
  console.log(`\n══ Stage 6s: USPTO patents → static/${TOPIC_ID}/patents/ ══`);
  if (skipPatents) { console.log('  (skipped)'); return null; }
  const tickers = processed.map((p) => p.ticker);
  return await fetchPatentsForTopic({ topicId: TOPIC_ID, tickers, years: 7 });
}

function stageTimeline(processed) {
  console.log(`\n══ Stage 6l: 8-K event timeline → static/${TOPIC_ID}/event-timeline/ ══`);
  if (skipTimeline) {
    console.log('  (skipped)');
    return null;
  }
  const tickers = processed.map((p) => p.ticker);
  const result = extractTimelineForTopic({ topicId: TOPIC_ID, tickers, windowDays: 365 });
  const total = result.tickers.reduce((n, r) => n + (r.total ?? 0), 0);
  console.log(`  ✓ ${result.tickers.length} filers · ${total} 8-K events over last 365d`);
  for (const r of result.tickers.slice(0, 5)) {
    const cat = r.byCategory?.slice(0, 2).map((c) => `${c.category}(${c.count})`).join(',') ?? '';
    console.log(`    · ${r.ticker}: ${r.total} events · ${cat}`);
  }
  return result;
}

function stageWordCloud() {
  console.log(`\n══ Stage 6f: Word cloud → static/${TOPIC_ID}/wordcloud/ ══`);
  if (skipWordCloud) {
    console.log('  (skipped — --skip-wordcloud)');
    return null;
  }
  const result = writeWordCloud({ topicId: TOPIC_ID });
  if (result.error) {
    console.log(`  ✗ ${result.error}`);
    return null;
  }
  console.log(`  ✓ ${result.termCount} terms · scanned ${result.tokenCount.toLocaleString()} tokens across ${result.chunkCount.toLocaleString()} chunks`);
  if (result.terms.length) {
    const sample = result.terms.slice(0, 8).map((t) => `${t.term}(${t.count})`).join(', ');
    console.log(`    Top: ${sample}`);
  }
  return result;
}

async function stageUmap() {
  console.log(`\n══ Stage 6g: UMAP 2D projection → static/${TOPIC_ID}/umap/ ══`);
  if (skipUmap) {
    console.log('  (skipped — --skip-umap)');
    return null;
  }
  const result = await writeUmap({ topicId: TOPIC_ID });
  if (result.error) {
    console.log(`  ✗ ${result.error}`);
    return null;
  }
  console.log(`  ✓ ${result.pointCount} points projected (of ${result.totalInCorpus} sampled chunks)`);
  return result;
}

function stageCrossTopic() {
  console.log(`\n══ Stage 6e: Cross-topic vendor join → static/${TOPIC_ID}/cross-topic/ ══`);
  if (skipAnswers) {
    console.log('  (skipped — --skip-answers)');
    return null;
  }
  const result = writeCrossTopic({ topicId: TOPIC_ID });
  if (result.error) return null;
  console.log(`  ✓ ${result.sharedCount} shared vendors (top-150 written)`);
  if (result.shared.length) {
    const top = result.shared.slice(0, 5);
    for (const v of top) {
      console.log(`    · ${v.label}: ${v.accelerator.mentions} accel · ${v.space.mentions} space`);
    }
  }
  return result;
}

async function stageRiskDiffs(processed) {
  console.log(`\n══ Stage 6d: Risk-factor year-over-year diff → static/${TOPIC_ID}/risk-diffs/ ══`);
  if (skipRiskDiffs) {
    console.log('  (skipped — --skip-risk-diffs)');
    return null;
  }
  const tickers = processed.map((p) => p.ticker);
  const { results } = await extractRiskDiffsForTopic({ tickers, topicId: TOPIC_ID });
  for (const r of results) {
    if (r.error) {
      console.log(`  ✗ ${r.ticker}: ${r.error}`);
    } else {
      console.log(`  ✓ ${r.ticker}: +${r.addedCount} added · -${r.removedCount} removed (${r.prior.filingDate} → ${r.current.filingDate})`);
    }
  }
  return results;
}

function stageMetrics(processed) {
  console.log(`\n══ Stage 6c: Cross-filer metrics table → static/${TOPIC_ID}/metrics/ ══`);
  if (skipAnswers) {
    console.log('  (skipped — --skip-answers)');
    return null;
  }
  const tickers = processed.map((p) => p.ticker);
  const result = writeMetrics({ topicId: TOPIC_ID, tickers });
  const covered = result.companies.filter((c) => c.revenue?.value).length;
  console.log(`  ✓ ${result.companies.length} companies · ${result.columns.length} metrics · ${covered} with XBRL revenue`);
  return result;
}

function stageDeepDives(processed) {
  console.log(`\n══ Stage 6b: Extract deep-dive case studies → static/${TOPIC_ID}/research/ ══`);
  if (skipAnswers) {
    console.log('  (skipped — --skip-answers)');
    return null;
  }
  const tickers = processed.map((p) => p.ticker);
  const result = extractDeepDivesForTopic({ tickers, topicId: TOPIC_ID });
  const outDir = join(topicStaticDir(TOPIC_ID), 'research');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'deep-dives.json'), JSON.stringify(result, null, 2));
  for (const dive of result.deepDives) {
    console.log(`  ✓ ${dive.id}: ${dive.totalCards} cards across ${dive.sections.length} sections`);
  }
  return result;
}

function stageResearchAnswers(processed) {
  console.log(`\n══ Stage 6: Extract research answers → static/${TOPIC_ID}/research/ ══`);
  if (skipAnswers) {
    console.log('  (skipped — --skip-answers)');
    return null;
  }
  const tickers = processed.map((p) => p.ticker);
  const result = extractAnswersForTopic({ tickers, topicId: TOPIC_ID });
  const outDir = join(topicStaticDir(TOPIC_ID), 'research');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'answers.json'), JSON.stringify(result, null, 2));
  const totalCards = result.questions.reduce((n, q) => n + q.answerCount, 0);
  console.log(`  ✓ ${result.questions.length} questions · ${totalCards} evidence cards across ${result.tickerCount} filers`);
  for (const q of result.questions) {
    const flag = q.answerCount === 0 ? '·' : '✓';
    console.log(`    ${flag} ${q.id}: ${q.answerCount} cards · ${q.tickersDisclosing}/${result.tickerCount} disclosing`);
  }
  return result;
}

function copyTopicIndex(index) {
  // Refresh static/space-economy/index.json from data/ so the UI sees latest scope.
  const dest = join(topicStaticDir(TOPIC_ID), 'index.json');
  mkdirSync(topicStaticDir(TOPIC_ID), { recursive: true });
  writeFileSync(dest, JSON.stringify(index, null, 2));

  // Mirror geography.json (curated) into static for the map view.
  const geoSrc = join(PATHS.spaceEconomy, 'geography.json');
  if (existsSync(geoSrc)) {
    cpSync(geoSrc, join(topicStaticDir(TOPIC_ID), 'geography.json'));
  }
}

async function main() {
  const index = loadTopicIndex();
  const tickers = uniqueSecTickers(index);
  console.log(`Space economy pipeline (topic: ${TOPIC_ID})`);
  console.log(`Watchlist: ${tickers.length} SEC filers — ${tickers.join(', ')}`);

  copyTopicIndex(index);

  const raw = await stageScrape(tickers);
  const processed = stageProcess(raw);
  stageExportFilings(tickers);
  const publicReports = await stagePublicReports(index);
  const ragManifest = await stageExportRag(processed, publicReports);
  const evidenceEmbed = await stageEvidenceEmbed(processed);
  const answers = stageResearchAnswers(processed);
  const metrics = stageMetrics(processed);
  const deepDives = stageDeepDives(processed);
  const riskDiffs = await stageRiskDiffs(processed);
  const crossTopic = stageCrossTopic();
  const sankeys = stageSankey(processed);
  const glossary = stageGlossary();
  const insiders = stageInsiders(processed);
  const vendorNetwork = stageVendorNetwork(processed);
  const timeline = stageTimeline(processed);
  const trends = stageTrends(processed);
  const concentration = stageConcentration(processed);
  const contracts = await stageContracts(processed);
  const prices = await stagePrices(processed);
  const sbir = await stageSbir(processed);
  const launches = await stageLaunches();
  const patents = await stagePatents(processed);
  const wordCloud = stageWordCloud();
  const umap = await stageUmap();

  console.log('\n══ Pipeline complete ══');
  console.log(`  Tickers processed: ${processed.length}/${tickers.length}`);
  console.log(`  Public reports indexed: ${publicReports.filter((r) => r.chunks?.length).length}/${publicReports.length}`);
  console.log(`  Total RAG chunks: ${ragManifest.chunkCount}`);
  if (answers) {
    const totalCards = answers.questions.reduce((n, q) => n + q.answerCount, 0);
    console.log(`  Research answers: ${answers.questions.length} questions · ${totalCards} evidence cards`);
  }
  if (deepDives) {
    const totalDiveCards = deepDives.deepDives.reduce((n, d) => n + d.totalCards, 0);
    console.log(`  Deep-dives: ${deepDives.deepDives.length} case studies · ${totalDiveCards} evidence cards`);
  }
  if (metrics) {
    console.log(`  Metrics table: ${metrics.companies.length} companies × ${metrics.columns.length} columns`);
  }
  if (riskDiffs) {
    const ok = riskDiffs.filter((r) => !r.error).length;
    const added = riskDiffs.reduce((n, r) => n + (r.addedCount ?? 0), 0);
    const removed = riskDiffs.reduce((n, r) => n + (r.removedCount ?? 0), 0);
    console.log(`  Risk diffs: ${ok}/${riskDiffs.length} filers · +${added} added · -${removed} removed`);
  }
  if (crossTopic) {
    console.log(`  Cross-topic: ${crossTopic.sharedCount} shared vendors`);
  }
  if (wordCloud) {
    console.log(`  Word cloud: ${wordCloud.termCount} terms`);
  }
  if (umap) {
    console.log(`  UMAP: ${umap.pointCount} 2D points`);
  }
  if (sankeys) {
    const ok = sankeys.filter((r) => !r.error).length;
    console.log(`  Sankeys: ${ok}/${sankeys.length} per-ticker supply-chain diagrams`);
  }
  if (evidenceEmbed) {
    console.log(`  Evidence embeddings: ${evidenceEmbed.count} vectors`);
  }
  if (glossary) {
    console.log(`  Glossary: ${glossary.termCount} terms`);
  }
  if (insiders) {
    const total = insiders.rows.reduce((n, r) => n + (r.total ?? 0), 0);
    console.log(`  Insiders: ${insiders.tickerCount} filers · ${total} filings`);
  }
  if (vendorNetwork) {
    console.log(`  Vendor network: ${vendorNetwork.summary.supplierCount} suppliers, ${vendorNetwork.summary.sharedSuppliers} shared`);
  }
  if (timeline) {
    const total = timeline.tickers.reduce((n, r) => n + (r.total ?? 0), 0);
    console.log(`  Event timeline: ${total} 8-K events`);
  }
  console.log(`  Output: static/${TOPIC_ID}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
