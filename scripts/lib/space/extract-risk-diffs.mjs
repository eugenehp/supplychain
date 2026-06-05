/**
 * Year-over-year diff of Item 1A. Risk Factors per ticker.
 *
 * Pipeline per ticker:
 *   1. Pull submissions.json (already cached) → find current and prior 10-K/20-F.
 *   2. Download the prior filing HTML if we don't have it yet.
 *   3. Extract Item 1A from both — current section already lives in
 *      static/space-economy/sec/<TICKER>/sections.json + filing.txt.
 *   4. Split into bullets/paragraphs, fuzzy-match across the two sets.
 *   5. Emit { added: [...], removed: [...] } per ticker.
 *
 * Output: static/<topic>/risk-diffs/<TICKER>.json + index.json
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { companyRawDir, topicStaticDir, topicStaticSecDir } from '../paths.mjs';
import { fetchFilingDocument, padCik } from '../edgar-client.mjs';
import { htmlToText, extractSections } from '../filing-processor.mjs';

const MIN_SENT_LEN = 60;
const MAX_SENT_LEN = 600;
const SHINGLE_K = 5;
const SIM_THRESHOLD = 0.45;

function loadSubmissions(ticker) {
  const path = join(companyRawDir(ticker), 'submissions.json');
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}

/**
 * Return [current, prior] 10-K/20-F entries from a submissions.json recent list.
 */
function findCurrentAndPrior(submissions, forms = ['10-K', '20-F', '40-F']) {
  const r = submissions?.filings?.recent;
  if (!r) return [null, null];
  const matches = [];
  for (let i = 0; i < r.form.length; i++) {
    if (!forms.includes(r.form[i])) continue;
    matches.push({
      form: r.form[i],
      filingDate: r.filingDate[i],
      accessionNumber: r.accessionNumber[i],
      primaryDocument: r.primaryDocument[i],
      reportDate: r.reportDate[i],
    });
  }
  matches.sort((a, b) => b.filingDate.localeCompare(a.filingDate));
  return [matches[0] ?? null, matches[1] ?? null];
}

async function loadPriorFilingHtml(cik, prior, ticker) {
  // Cache prior filings alongside the current one.
  const cacheDir = join(companyRawDir(ticker), 'prior');
  mkdirSync(cacheDir, { recursive: true });
  const cachePath = join(cacheDir, `${prior.accessionNumber}.html`);
  if (existsSync(cachePath) && readFileSync(cachePath, 'utf8').length > 10000) {
    return readFileSync(cachePath, 'utf8');
  }
  const { html } = await fetchFilingDocument(cik, prior);
  writeFileSync(cachePath, html);
  return html;
}

function findRiskFactorsText(text, sections) {
  // Prefer the structured section if it includes char offsets.
  if (Array.isArray(sections)) {
    for (const s of sections) {
      if (typeof s.charStart !== 'number' || typeof s.charEnd !== 'number') continue;
      if (/risk\s*factors?/i.test(s.id ?? '') || /risk\s*factors?/i.test(s.header ?? '') || /item\s*1a/i.test(s.header ?? '')) {
        return text.slice(s.charStart, s.charEnd);
      }
    }
  }

  // Regex scan — distinguish TOC entry (short bounded section) from body Item 1A.
  const headerRe = /(?:Item|ITEM)\s*1A[\.\s\-–—]+Risk\s*Factors/gi;
  const stopRe = /(?:Item|ITEM)\s*1B[\.\s\-–—]+Unresolved|(?:Item|ITEM)\s*2[\.\s\-–—]+(?:Properties|Description)/i;

  const candidates = [];
  let m;
  while ((m = headerRe.exec(text)) !== null) {
    const tail = text.slice(m.index);
    const stop = tail.search(stopRe);
    const length = stop > 0 ? stop : tail.length;
    candidates.push({ start: m.index, stop: stop > 0 ? m.index + stop : null, length });
    if (candidates.length >= 6) break;
  }
  if (!candidates.length) return null;

  // A TOC entry is bounded by another Item entry within a few hundred chars.
  // The body Risk Factors is multi-thousand chars between Item 1A and Item 1B.
  const body = candidates.find((c) => c.length >= 2000) ?? candidates[candidates.length - 1];
  const sliceEnd = body.stop ?? Math.min(text.length, body.start + 250_000);
  return text.slice(body.start, sliceEnd);
}

function splitIntoSentences(text) {
  if (!text) return [];
  const normalized = text.replace(/\s+/g, ' ').trim();
  // Split on sentence ends; also break long bullets at semicolons.
  const raw = normalized
    .split(/(?<=[.!?])\s+(?=[A-Z(])|•\s+|;\s+(?=[A-Z(])/)
    .map((s) => s.trim())
    .filter((s) => s.length >= MIN_SENT_LEN && s.length <= MAX_SENT_LEN);
  // Dedup identical sentences within the same section.
  return [...new Set(raw)];
}

function shingles(s, k = SHINGLE_K) {
  const tokens = s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  if (tokens.length < k) return new Set([tokens.join(' ')]);
  const sh = new Set();
  for (let i = 0; i <= tokens.length - k; i++) sh.add(tokens.slice(i, i + k).join(' '));
  return sh;
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return inter / union;
}

function diffSentences(currentSents, priorSents) {
  const currentShingles = currentSents.map((s) => ({ s, shingles: shingles(s) }));
  const priorShingles = priorSents.map((s) => ({ s, shingles: shingles(s) }));

  const matchedCurrent = new Set();
  const matchedPrior = new Set();

  for (let i = 0; i < currentShingles.length; i++) {
    let bestJ = -1;
    let bestSim = 0;
    for (let j = 0; j < priorShingles.length; j++) {
      if (matchedPrior.has(j)) continue;
      const sim = jaccard(currentShingles[i].shingles, priorShingles[j].shingles);
      if (sim > bestSim) {
        bestSim = sim;
        bestJ = j;
      }
    }
    if (bestSim >= SIM_THRESHOLD) {
      matchedCurrent.add(i);
      matchedPrior.add(bestJ);
    }
  }

  const added = [];
  for (let i = 0; i < currentShingles.length; i++) {
    if (!matchedCurrent.has(i)) added.push(currentShingles[i].s);
  }
  const removed = [];
  for (let j = 0; j < priorShingles.length; j++) {
    if (!matchedPrior.has(j)) removed.push(priorShingles[j].s);
  }
  return { added, removed };
}

/**
 * @param {{ ticker: string, topicId: string }} params
 */
async function diffForTicker({ ticker, topicId }) {
  const submissions = loadSubmissions(ticker);
  if (!submissions) return { ticker, error: 'Missing submissions.json' };

  const meta = JSON.parse(readFileSync(join(companyRawDir(ticker), 'metadata.json'), 'utf8'));
  if (!meta.cik) return { ticker, error: 'Missing CIK' };

  const [current, prior] = findCurrentAndPrior(submissions);
  if (!current || !prior) {
    return { ticker, error: 'No prior 10-K/20-F in recent submissions' };
  }
  if (current.accessionNumber === prior.accessionNumber) {
    return { ticker, error: 'Same accession number for current and prior' };
  }

  // Current — use already-extracted filing.txt + sections.json.
  const secDir = topicStaticSecDir(topicId, ticker);
  const currentText = existsSync(join(secDir, 'filing.txt')) ? readFileSync(join(secDir, 'filing.txt'), 'utf8') : '';
  const currentSections = existsSync(join(secDir, 'sections.json')) ? JSON.parse(readFileSync(join(secDir, 'sections.json'), 'utf8')) : [];
  const currentRisk = findRiskFactorsText(currentText, currentSections);
  if (!currentRisk) return { ticker, error: 'Could not locate Item 1A in current filing' };

  // Prior — fetch HTML, convert.
  const priorHtml = await loadPriorFilingHtml(meta.cik, prior, ticker);
  const priorText = htmlToText(priorHtml);
  const priorSections = extractSections(priorText);
  const priorRisk = findRiskFactorsText(priorText, priorSections);
  if (!priorRisk) return { ticker, error: 'Could not locate Item 1A in prior filing' };

  const currentSents = splitIntoSentences(currentRisk);
  const priorSents = splitIntoSentences(priorRisk);
  const { added, removed } = diffSentences(currentSents, priorSents);

  return {
    ticker,
    cik: padCik(meta.cik),
    current: {
      form: current.form,
      filingDate: current.filingDate,
      reportDate: current.reportDate,
      accessionNumber: current.accessionNumber,
      sentCount: currentSents.length,
    },
    prior: {
      form: prior.form,
      filingDate: prior.filingDate,
      reportDate: prior.reportDate,
      accessionNumber: prior.accessionNumber,
      sentCount: priorSents.length,
    },
    addedCount: added.length,
    removedCount: removed.length,
    added: added.slice(0, 25),
    removed: removed.slice(0, 25),
  };
}

/**
 * @param {{ tickers: string[], topicId: string, force?: boolean }} params
 */
export async function extractRiskDiffsForTopic({ tickers, topicId }) {
  const outDir = join(topicStaticDir(topicId), 'risk-diffs');
  mkdirSync(outDir, { recursive: true });
  const results = [];
  for (const ticker of tickers) {
    try {
      const result = await diffForTicker({ ticker, topicId });
      if (!result.error) {
        writeFileSync(join(outDir, `${ticker}.json`), JSON.stringify(result, null, 2));
      }
      results.push(result);
    } catch (err) {
      results.push({ ticker, error: err.message });
    }
  }
  const index = {
    generatedAt: new Date().toISOString(),
    topicId,
    tickers: results.map((r) => ({
      ticker: r.ticker,
      addedCount: r.addedCount ?? 0,
      removedCount: r.removedCount ?? 0,
      currentDate: r.current?.filingDate ?? null,
      priorDate: r.prior?.filingDate ?? null,
      error: r.error ?? null,
    })),
  };
  writeFileSync(join(outDir, 'index.json'), JSON.stringify(index, null, 2));
  return { results, index };
}
