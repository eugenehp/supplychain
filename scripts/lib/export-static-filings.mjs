import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PATHS, companyRawDir, companyProcessedDir, staticSecDir } from './paths.mjs';
import { htmlToText } from './filing-processor.mjs';
import { SEC_VENDOR_PATTERNS } from './sec-grounding.mjs';
import { extractDisplaySections } from './sec-sections.mjs';
import { writeCompanyLogos, fetchCompanyLogos, resolveLogoUrls, readLogoManifest } from './company-logos.mjs';
import { indexEvidenceEntries, indexEvidenceEmbeddings } from './rag-store.mjs';
import { buildFilingDisplay, enrichEvidenceRanges } from './filing-display.mjs';
import {
  embedTexts,
  evidenceEmbedText,
  quantizeVector,
  EMBEDDING_MODEL,
  EMBEDDING_DIM,
} from './embeddings.mjs';

const SUPPLY_KEYWORDS = /supplier|vendor|subcontract|foundry|CoWoS|HBM|TSMC|Hynix|Micron|Samsung|ASML|packag|assembly|single source|sole source|depend on|purchase from|optics|lithography|memory/i;

function isQualitySnippet(text) {
  if (!text || text.length < 40) return false;
  if (/xbrli:|iso4217:|http:\/\/fasb|asml:employee|utr:Rate/i.test(text)) return false;
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

  for (const { name, re } of SEC_VENDOR_PATTERNS) {
    re.lastIndex = 0;
    let m;
    let hits = 0;
    while ((m = re.exec(text)) !== null && hits < 8) {
      const excerpt = excerptAround(text, m.index);
      if (!isQualitySnippet(excerpt)) continue;
      const key = excerpt.slice(0, 80);
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push({
        id: `${ticker}-${name}-${hits}`,
        ticker,
        vendor: name,
        charOffset: m.index,
        excerpt,
        form: meta.filing?.form,
        filingDate: meta.filing?.filingDate,
      });
      hits++;
    }
  }

  // Keyword passages not caught by vendor regex
  let kwMatch;
  const kwRe = new RegExp(SUPPLY_KEYWORDS.source, 'gi');
  let kwHits = 0;
  while ((kwMatch = kwRe.exec(text)) !== null && kwHits < 40) {
    const start = Math.max(0, kwMatch.index - 200);
    const end = Math.min(text.length, kwMatch.index + 400);
    const passage = text.slice(start, end).replace(/\s+/g, ' ').trim();
    if (!isQualitySnippet(passage)) continue;
    const key = passage.slice(0, 100);
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({
      id: `${ticker}-kw-${kwHits}`,
      ticker,
      vendor: findVendorsInText(passage).join(', ') || null,
      charOffset: kwMatch.index,
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
    if (!vendors.length && !SUPPLY_KEYWORDS.test(chunk.text)) continue;
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

export function exportFilingToStatic(ticker) {
  const rawDir = companyRawDir(ticker);
  const procDir = companyProcessedDir(ticker);
  const outDir = staticSecDir(ticker);
  mkdirSync(outDir, { recursive: true });

  const metaPath = join(rawDir, 'metadata.json');
  const htmlPath = join(rawDir, 'filing.html');
  if (!existsSync(metaPath) || !existsSync(htmlPath)) {
    return { ticker, error: 'Missing raw filing' };
  }

  const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
  const html = readFileSync(htmlPath, 'utf8');
  const text = cleanFilingText(htmlToText(html));

  writeFileSync(join(outDir, 'filing.txt'), text, 'utf8');

  const logos = resolveLogoUrls(ticker);
  const filingMeta = {
    ticker,
    name: meta.name,
    cik: meta.cik,
    filing: meta.filing,
    filingUrl: meta.filingUrl,
    facts: meta.facts,
    textLength: text.length,
    exportedAt: new Date().toISOString(),
    logoUrl: logos.url,
    logoPrimaryUrl: logos.primary,
    logoFallbackUrl: logos.fallback,
    localUrls: {
      text: `/sec/${ticker}/filing.txt`,
      metadata: `/sec/${ticker}/metadata.json`,
      sections: `/sec/${ticker}/sections.json`,
      evidence: `/sec/${ticker}/evidence.json`,
      display: `/sec/${ticker}/display.json`,
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
      count: evidence.length,
      generatedAt: new Date().toISOString(),
      entries: evidence,
    }, null, 2),
  );

  return {
    ticker,
    name: meta.name,
    ...filingMeta,
    evidenceCount: evidence.length,
    sectionCount: sections.length,
    displayBlockCount: display.blockCount,
  };
}

export async function exportAllFilingsToStatic(tickers, { skipEmbed = false } = {}) {
  mkdirSync(join(PATHS.staticSec, '..'), { recursive: true });
  mkdirSync(PATHS.staticSec, { recursive: true });

  console.log('  Fetching company logos (Wikidata / Wikimedia Commons)…');
  const logoResults = await fetchCompanyLogos(tickers);
  const manifest = readLogoManifest();
  for (const [ticker, ok] of Object.entries(logoResults)) {
    const meta = manifest[ticker];
    const detail = ok
      ? `${meta?.source ?? 'fetched'} ${meta?.ext ?? ''}`.trim()
      : 'SVG fallback only';
    console.log(`    ${ok ? '✓' : '·'} ${ticker}: ${detail}`);
  }

  const filings = [];
  const allEvidence = [];
  for (const ticker of tickers) {
    const result = exportFilingToStatic(ticker);
    filings.push(result);
    if (!result.error) {
      const evPath = join(staticSecDir(ticker), 'evidence.json');
      if (existsSync(evPath)) {
        const ev = JSON.parse(readFileSync(evPath, 'utf8'));
        allEvidence.push(...(ev.entries ?? []));
      }
    }
  }

  indexEvidenceEntries(allEvidence);
  console.log(`  Evidence BM25 index: ${allEvidence.length} excerpts → SQLite FTS5`);

  if (!skipEmbed && allEvidence.length) {
    console.log('  Embedding evidence excerpts (MiniLM-L6-v2)…');
    const texts = allEvidence.map(evidenceEmbedText);
    const vectors = await embedTexts(texts, {
      onProgress: (done, total) => {
        if (done % 100 === 0 || done === total) process.stdout.write(`\r    ${done}/${total} embedded`);
      },
    });
    console.log('');

    const embeddingIndex = {
      generatedAt: new Date().toISOString(),
      model: EMBEDDING_MODEL,
      dim: EMBEDDING_DIM,
      docCount: allEvidence.length,
      entries: allEvidence.map((entry, i) => ({
        id: entry.id,
        q: [...quantizeVector(vectors[i])],
      })),
    };
    writeFileSync(join(PATHS.staticSec, 'evidence-embeddings.json'), JSON.stringify(embeddingIndex));
    indexEvidenceEmbeddings(allEvidence, vectors);
    console.log(`  Neural embeddings: ${allEvidence.length} vectors → /sec/evidence-embeddings.json`);
  } else if (skipEmbed) {
    console.log('  (skipped neural embeddings — use without --skip-embed to rebuild)');
  }

  const index = {
    generatedAt: new Date().toISOString(),
    filings: filings.filter((f) => !f.error),
    evidenceCount: allEvidence.length,
    embeddingModel: skipEmbed ? null : EMBEDDING_MODEL,
    embeddingsUrl: skipEmbed ? null : '/sec/evidence-embeddings.json',
  };
  writeFileSync(join(PATHS.staticSec, 'index.json'), JSON.stringify(index, null, 2));
  return index;
}

/** Copy favicon etc — static root is PATHS.staticRoot */
export function ensureStaticAssets() {
  mkdirSync(PATHS.staticRoot, { recursive: true });
  const legacyPublic = join(PATHS.staticRoot, '..', 'public');
  for (const file of ['favicon.svg', 'favicon.ico', 'favicon-16.png', 'favicon-32.png', 'apple-touch-icon.png', 'icons.svg']) {
    const src = join(legacyPublic, file);
    const dest = join(PATHS.staticRoot, file);
    if (existsSync(src) && !existsSync(dest)) copyFileSync(src, dest);
  }
}
