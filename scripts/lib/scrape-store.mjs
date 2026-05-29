import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { PATHS, companyRawDir, companyProcessedDir } from './paths.mjs';
import { loadTickerMap, getSubmissions, getCompanyFacts, findLatestFiling, fetchFilingDocument, extractLatestFact, REVENUE_TAGS } from './edgar-client.mjs';
import { SEC_WATCHLIST } from './h200-baseline.mjs';

const FACT_TAGS = [
  'Revenues',
  'RevenueFromContractWithCustomerExcludingAssessedTax',
  'ResearchAndDevelopmentExpense',
  'CostOfRevenue',
  'GrossProfit',
  'Assets',
];

export async function scrapeCompanyRaw(ticker, tickerMap) {
  const meta = tickerMap.byTicker[ticker.toUpperCase()];
  if (!meta) return { ticker, error: 'Ticker not found' };

  const dir = companyRawDir(ticker);
  mkdirSync(dir, { recursive: true });

  const result = { ticker, cik: meta.cik, name: meta.name, scrapedAt: new Date().toISOString() };

  try {
    const submissions = await getSubmissions(meta.cik);
    writeFileSync(join(dir, 'submissions.json'), JSON.stringify(submissions, null, 2));
    result.hasSubmissions = true;

    const companyFacts = await getCompanyFacts(meta.cik);
    writeFileSync(join(dir, 'companyfacts.json'), JSON.stringify(companyFacts, null, 2));
    result.hasCompanyFacts = true;

    result.facts = {};
    for (const tag of FACT_TAGS) {
      const fact = extractLatestFact(companyFacts, tag);
      if (fact) result.facts[tag] = { value: fact.val, end: fact.end, filed: fact.filed, form: fact.form };
    }
    for (const tag of REVENUE_TAGS) {
      if (result.facts[tag]) continue;
      const fact = extractLatestFact(companyFacts, tag);
      if (fact) result.facts[tag] = { value: fact.val, end: fact.end, filed: fact.filed, form: fact.form };
    }
    result.hasRevenue = REVENUE_TAGS.some((t) => result.facts[t]?.value > 0);
    result.revenue = REVENUE_TAGS.map((t) => result.facts[t]?.value).find(Boolean);

    result.filing = findLatestFiling(submissions);
    if (result.filing) {
      const doc = await fetchFilingDocument(meta.cik, result.filing);
      writeFileSync(join(dir, 'filing.html'), doc.html);
      writeFileSync(join(dir, 'filing.meta.json'), JSON.stringify({ url: doc.url, filing: result.filing }, null, 2));
      result.filingUrl = doc.url;
      result.htmlLength = doc.html.length;
    }

    writeFileSync(join(dir, 'metadata.json'), JSON.stringify(result, null, 2));
    return result;
  } catch (err) {
    result.error = err.message;
    writeFileSync(join(dir, 'metadata.json'), JSON.stringify(result, null, 2));
    return result;
  }
}

export async function scrapeAllRaw(tickers = SEC_WATCHLIST) {
  const tickerMap = await loadTickerMap();
  const results = [];
  for (const ticker of tickers) {
    console.log(`  [raw] ${ticker}`);
    results.push(await scrapeCompanyRaw(ticker, tickerMap));
  }
  writeFileSync(join(PATHS.rawSec, 'manifest.json'), JSON.stringify({ scrapedAt: new Date().toISOString(), companies: results }, null, 2));
  return results;
}

export function loadRawCompany(ticker) {
  const dir = companyRawDir(ticker);
  const metadata = JSON.parse(readFileSync(join(dir, 'metadata.json'), 'utf8'));
  const html = existsSync(join(dir, 'filing.html')) ? readFileSync(join(dir, 'filing.html'), 'utf8') : '';
  let facts = metadata.facts ?? {};
  if (existsSync(join(dir, 'companyfacts.json'))) {
    // facts already in metadata
  }
  return { metadata, html, facts, dir };
}

export function saveProcessedCompany(ticker, processed, validation) {
  const dir = companyProcessedDir(ticker);
  mkdirSync(dir, { recursive: true });

  writeFileSync(join(dir, 'text.json'), JSON.stringify({ length: processed.text.length, preview: processed.text.slice(0, 500) }));
  writeFileSync(join(dir, 'sections.json'), JSON.stringify(processed.sections));
  writeFileSync(join(dir, 'chunks.jsonl'), processed.chunks.map((c) => JSON.stringify(c)).join('\n'));
  writeFileSync(join(dir, 'entities.json'), JSON.stringify(processed.entities, null, 2));
  writeFileSync(join(dir, 'validation.json'), JSON.stringify(validation, null, 2));
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify({
    ticker,
    processedAt: new Date().toISOString(),
    textLength: processed.text.length,
    sectionCount: processed.sections.length,
    chunkCount: processed.chunks.length,
    vendorCount: processed.entities.vendors.length,
    valid: validation.valid,
  }, null, 2));

  return dir;
}

export function loadProcessedCompany(ticker) {
  const dir = companyProcessedDir(ticker);
  if (!existsSync(join(dir, 'manifest.json'))) return null;
  const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
  const entities = existsSync(join(dir, 'entities.json'))
    ? JSON.parse(readFileSync(join(dir, 'entities.json'), 'utf8'))
    : null;
  const chunks = existsSync(join(dir, 'chunks.jsonl'))
    ? readFileSync(join(dir, 'chunks.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))
    : [];
  return { ...manifest, entities, chunks, ticker, dir };
}
