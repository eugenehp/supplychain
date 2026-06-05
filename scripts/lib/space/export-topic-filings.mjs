/**
 * Per-topic SEC filing exporter — writes filing.txt, metadata, sections,
 * evidence into static/<topicId>/sec/<TICKER>/. Mirrors the global
 * export-static-filings.mjs but keeps the bundle self-contained per topic.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { companyRawDir, companyProcessedDir, topicStaticSecDir, topicStaticDir } from '../paths.mjs';
import { htmlToText } from '../filing-processor.mjs';
import { extractDisplaySections } from '../sec-sections.mjs';
import { buildFilingDisplay, enrichEvidenceRanges } from '../filing-display.mjs';
import { SEC_VENDOR_PATTERNS } from '../sec-grounding.mjs';

const SUPPLY_KEYWORDS =
  /supplier|vendor|subcontract|propulsion|launch|satellite|payload|avionics|optics|antenna|constellation|depend on|sole source|single source|component|raw material/i;

function isQualitySnippet(text) {
  if (!text || text.length < 40) return false;
  if (/xbrli:|iso4217:|http:\/\/fasb/i.test(text)) return false;
  if ((text.match(/[a-zA-Z]/g)?.length ?? 0) < text.length * 0.5) return false;
  return true;
}

function cleanFilingText(text) {
  const markers = [
    /UNITED STATES\s+SECURITIES AND EXCHANGE COMMISSION/i,
    /Item\s+1\.\s*Business/i,
    /ITEM\s+1[\.\s\-–—]+BUSINESS/i,
    /FORM\s+10-K/i,
    /FORM\s+20-F/i,
  ];
  for (const m of markers) {
    const idx = text.search(m);
    if (idx >= 0 && idx < 80000) return text.slice(idx).trim();
  }
  return text.trim();
}

function findVendorsInText(text) {
  const vendors = [];
  for (const { name, re } of SEC_VENDOR_PATTERNS) {
    re.lastIndex = 0;
    if (re.test(text)) vendors.push(name);
  }
  return vendors;
}

function excerptAround(text, index, radius = 320) {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  let excerpt = text.slice(start, end).replace(/\s+/g, ' ').trim();
  if (start > 0) excerpt = '…' + excerpt;
  if (end < text.length) excerpt = excerpt + '…';
  return excerpt;
}

function buildEvidenceFromText(text, ticker, meta) {
  const entries = [];
  const seen = new Set();
  let kwHits = 0;
  const kwRe = new RegExp(SUPPLY_KEYWORDS.source, 'gi');
  let m;
  while ((m = kwRe.exec(text)) !== null && kwHits < 60) {
    const start = Math.max(0, m.index - 220);
    const end = Math.min(text.length, m.index + 420);
    const passage = text.slice(start, end).replace(/\s+/g, ' ').trim();
    if (!isQualitySnippet(passage)) continue;
    const key = passage.slice(0, 100);
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({
      id: `${ticker}-kw-${kwHits}`,
      ticker,
      vendor: findVendorsInText(passage).join(', ') || null,
      charOffset: m.index,
      excerpt: (start > 0 ? '…' : '') + passage + (end < text.length ? '…' : ''),
      form: meta.filing?.form,
      filingDate: meta.filing?.filingDate,
      type: 'keyword',
    });
    kwHits++;
  }
  return entries.sort((a, b) => a.charOffset - b.charOffset);
}

function buildEvidenceFromChunks(ticker, chunks) {
  const entries = [];
  for (const chunk of chunks) {
    if (!SUPPLY_KEYWORDS.test(chunk.text)) continue;
    const vendors = findVendorsInText(chunk.text);
    const excerpt = chunk.text.slice(0, 500).replace(/\s+/g, ' ').trim();
    if (!isQualitySnippet(excerpt)) continue;
    entries.push({
      id: chunk.id,
      ticker,
      vendor: vendors.join(', ') || null,
      charOffset: chunk.charStart ?? 0,
      excerpt,
      sectionId: chunk.sectionId,
      sectionHeader: chunk.sectionHeader,
      form: chunk.form,
      filingDate: chunk.filingDate,
      type: 'chunk',
    });
  }
  return entries;
}

function slimSections(sections) {
  return sections.map((s) => ({
    id: s.id,
    item: s.item,
    title: s.title,
    header: s.header,
    charStart: s.charStart,
    charEnd: s.charEnd,
    length: s.length,
    type: s.type ?? 'item',
  }));
}

export function exportTopicFiling(topicId, ticker) {
  const rawDir = companyRawDir(ticker);
  const procDir = companyProcessedDir(ticker);
  const outDir = topicStaticSecDir(topicId, ticker);
  mkdirSync(outDir, { recursive: true });

  const metaPath = join(rawDir, 'metadata.json');
  const htmlPath = join(rawDir, 'filing.html');
  if (!existsSync(metaPath) || !existsSync(htmlPath)) {
    return { ticker, error: 'Missing raw filing — re-run scrape stage' };
  }

  const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
  const html = readFileSync(htmlPath, 'utf8');
  const text = cleanFilingText(htmlToText(html));

  writeFileSync(join(outDir, 'filing.txt'), text, 'utf8');

  const filingMeta = {
    ticker,
    topicId,
    name: meta.name,
    cik: meta.cik,
    filing: meta.filing,
    filingUrl: meta.filingUrl,
    facts: meta.facts,
    textLength: text.length,
    exportedAt: new Date().toISOString(),
    localUrls: {
      text: `/${topicId}/sec/${ticker}/filing.txt`,
      metadata: `/${topicId}/sec/${ticker}/metadata.json`,
      sections: `/${topicId}/sec/${ticker}/sections.json`,
      evidence: `/${topicId}/sec/${ticker}/evidence.json`,
      display: `/${topicId}/sec/${ticker}/display.json`,
    },
  };
  writeFileSync(join(outDir, 'metadata.json'), JSON.stringify(filingMeta, null, 2));

  const sections = slimSections(extractDisplaySections(text, meta.filing?.form));
  writeFileSync(join(outDir, 'sections.json'), JSON.stringify(sections, null, 2));

  const display = buildFilingDisplay(sections, text);
  writeFileSync(join(outDir, 'display.json'), JSON.stringify(display));

  let chunks = [];
  const chunksPath = join(procDir, 'chunks.jsonl');
  if (existsSync(chunksPath)) {
    chunks = readFileSync(chunksPath, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  }

  const regexEvidence = buildEvidenceFromText(text, ticker, meta);
  const chunkEvidence = buildEvidenceFromChunks(ticker, chunks);

  const evidenceMap = new Map();
  for (const e of [...regexEvidence, ...chunkEvidence]) {
    const key = e.excerpt.slice(0, 120);
    if (!evidenceMap.has(key)) evidenceMap.set(key, e);
  }
  const evidence = enrichEvidenceRanges(text, [...evidenceMap.values()]);

  writeFileSync(
    join(outDir, 'evidence.json'),
    JSON.stringify({
      ticker,
      topicId,
      count: evidence.length,
      generatedAt: new Date().toISOString(),
      entries: evidence,
    }, null, 2),
  );

  return {
    ticker,
    topicId,
    name: meta.name,
    ...filingMeta,
    evidenceCount: evidence.length,
    sectionCount: sections.length,
    displayBlockCount: display.blockCount,
  };
}

export function writeTopicFilingsIndex(topicId, filings) {
  const dir = topicStaticDir(topicId);
  mkdirSync(join(dir, 'sec'), { recursive: true });
  const indexPath = join(dir, 'sec', 'index.json');
  writeFileSync(
    indexPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        topicId,
        filings: filings.filter((f) => !f.error),
        errors: filings.filter((f) => f.error),
      },
      null,
      2,
    ),
  );
  return indexPath;
}
