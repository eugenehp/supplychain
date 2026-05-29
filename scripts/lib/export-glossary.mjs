import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PATHS } from './paths.mjs';
import {
  GLOSSARY_CATEGORIES,
  GLOSSARY_DEFINITIONS,
  lookupDefinition,
} from './glossary-definitions.mjs';

const NOISE = new Set([
  'THE', 'AND', 'OR', 'OF', 'TO', 'IN', 'IS', 'AT', 'BY', 'AS', 'AN', 'ON', 'SO', 'UP', 'WE',
  'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HAD', 'HER', 'WAS', 'ONE', 'OUR', 'OUT',
  'DAY', 'GET', 'HAS', 'HIM', 'HIS', 'HOW', 'ITS', 'MAY', 'NEW', 'NOW', 'OLD', 'SEE', 'TWO',
  'WHO', 'WAY', 'USE', 'SHE', 'THAT', 'THIS', 'WITH', 'FROM', 'HAVE', 'BEEN', 'WILL', 'ALSO',
  'THAN', 'THEN', 'INTO', 'SUCH', 'OTHER', 'THEIR', 'WHICH', 'WOULD', 'ABOUT', 'THERE', 'THESE',
  'WHEN', 'WHAT', 'SOME', 'THEM', 'THEY', 'WERE', 'EACH', 'MORE', 'MOST', 'OVER', 'UNDER', 'AFTER',
  'FORM', 'ITEM', 'PART', 'NOTE', 'NOTES', 'TRUE', 'FALSE', 'REPORT', 'FINANCIAL', 'FINANCIALS',
  'BUSINESS', 'CONSOLIDATED', 'STATEMENTS', 'CORPORATE', 'GOVERNANCE', 'SUSTAINABILITY', 'STRATEGIC',
  'CONTINUED', 'EXHIBITS', 'FACTORS', 'RISK', 'APPLIED', 'MATERIALS', 'SUMMARY', 'COMPANY', 'CASH',
  'INCOME', 'EQUITY', 'LOSS', 'LOSSES', 'EXPENSE', 'CHAIR', 'GERMANY', 'TAIWAN', 'PARK', 'FLOWS',
  'HTTP', 'HTTPS', 'WWW', 'COM', 'ORG', 'NET', 'USD', 'EUR', 'GBP', 'JPY', 'LLC', 'INC', 'CORP',
  'LTD', 'PLC', 'GMBH', 'LLP', 'USA', 'UK', 'UN', 'VS', 'ET', 'AL', 'ETC', 'III', 'IV', 'VI',
  'JAN', 'FEB', 'MAR', 'APR', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'FY', 'Q1', 'Q2',
  'Q3', 'Q4', 'YOY', 'MOM', 'ROE', 'ROI', 'EBIT', 'EBITDA', 'COGS', 'SG', 'A', 'R', 'D', 'ID',
  'US', 'CO', 'II', 'EX', 'CE', 'NA', 'SB', 'IV', 'TM', 'KG', 'PC', 'IF', 'ASC', 'OCI', 'ROU',
  'CPP', 'EXE', 'SAF', 'CAC', 'FSC', 'VIS', 'TJ', 'NT', 'USG', 'AND', 'TO', 'OF', 'STEM',
]);

const BAD_INLINE = /^(the|a|an|and|or|in|of|to|by|for|with|from|loss|income|expense|note|company|continued|item|section|our|your|their|this|that|these|those|million|millions|advised|issued|prepared|effective|besides|further|paid|filed|reports|statements|foreign|exchange|currency|translation|adjustments|unrealized|gains|shares|amount|capital|id|idia|corporation|subsidiaries|notes|consolidated|over|under|scope|category|due|factors|such|timing|product|sales|flexi|where|ability|flagship|due|factors|proportion|taxonomy|eligible|turnover|committee|nomination|technology|effective|august|december|million|millions|new|dollars|san|diego|berlin|effect|section|and|or|the|iii|ii|iv|over|under|due|to|by|for|with|from|on|in|at|as|an|a|we|our|your|their|his|her|its|is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|could|should|may|might|must|shall|can|need|dare|ought|used)$/i;

function loadCorpusTexts() {
  const texts = [];
  const chunksPath = join(PATHS.staticRag, 'chunks.json');
  if (existsSync(chunksPath)) {
    const chunks = JSON.parse(readFileSync(chunksPath, 'utf8'));
    for (const c of chunks.entries ?? []) texts.push(c.text ?? '');
  }

  const secDir = PATHS.staticSec;
  if (existsSync(secDir)) {
    for (const ticker of readdirSync(secDir)) {
      const evidencePath = join(secDir, ticker, 'evidence.json');
      const filingPath = join(secDir, ticker, 'filing.txt');
      try {
        if (existsSync(evidencePath)) {
          const data = JSON.parse(readFileSync(evidencePath, 'utf8'));
          for (const e of data.entries ?? []) {
            texts.push([e.excerpt, e.vendor, e.sectionHeader].filter(Boolean).join(' '));
          }
        }
        if (existsSync(filingPath)) texts.push(readFileSync(filingPath, 'utf8'));
      } catch {
        /* skip */
      }
    }
  }

  const vendorsPath = join(PATHS.staticRag, 'vendors.json');
  if (existsSync(vendorsPath)) {
    const vendors = JSON.parse(readFileSync(vendorsPath, 'utf8'));
    for (const v of vendors.vendors ?? []) {
      texts.push([v.name, ...(v.snippets ?? [])].join(' '));
    }
  }

  return texts;
}

function extractAcronyms(texts) {
  const full = texts.join('\n');
  const counts = new Map();

  const add = (raw, weight = 1) => {
    const abbr = raw.trim();
    if (!abbr || abbr.length < 2 || abbr.length > 14) return;
    const upper = abbr.toUpperCase();
    if (NOISE.has(upper)) return;
    if (/^\d+$/.test(abbr)) return;
    counts.set(abbr, (counts.get(abbr) ?? 0) + weight);
  };

  for (const m of full.matchAll(/\b([A-Z]{2,8})\b/g)) add(m[1]);
  for (const m of full.matchAll(/\b([A-Z][a-z0-9]*(?:[A-Z][a-zA-Z0-9]*)+)\b/g)) add(m[1]);
  for (const m of full.matchAll(/[\(\u201c"']([A-Z][A-Za-z0-9-]{1,12})[\)\u201d"']/g)) add(m[1], 2);

  return counts;
}

function extractInlineDefinitions(texts) {
  const full = texts.join('\n');
  /** @type {Map<string, { name: string, count: number }>} */
  const inline = new Map();

  const consider = (name, abbr) => {
    const cleanName = name.trim().replace(/\s+/g, ' ').slice(-90);
    if (cleanName.length < 4 || cleanName.length > 90) return;
    if (BAD_INLINE.test(cleanName.split(/\s+/)[0])) return;
    if (/\d{4}/.test(cleanName) && cleanName.length > 40) return;
    if (/^(Item|Part|Note|Table|Page|Section)\b/i.test(cleanName)) return;
    const key = abbr.trim();
    const prev = inline.get(key);
    if (!prev || cleanName.length > prev.name.length) {
      inline.set(key, { name: cleanName, count: (prev?.count ?? 0) + 1 });
    }
  };

  for (const m of full.matchAll(/([A-Za-z][A-Za-z0-9 ,\-\/&]{3,80}?)\s*[\(\u201c"']([A-Z][A-Za-z0-9-]{1,12})[\)\u201d"']/g)) {
    consider(m[1], m[2]);
  }
  for (const m of full.matchAll(/\b([A-Z]{2,8})\s*\(([A-Za-z][^)]{3,80})\)/g)) {
    consider(m[2], m[1]);
  }

  return inline;
}

function canonicalKey(abbr) {
  return abbr.toUpperCase().replace(/\s+/g, '');
}

function buildTermEntry(abbr, count, inlineDefs) {
  const curated = lookupDefinition(abbr);
  const inline = inlineDefs.get(abbr) ?? inlineDefs.get(canonicalKey(abbr));

  if (curated) {
    return {
      abbr,
      name: curated.name,
      definition: curated.definition,
      category: curated.category ?? 'general',
      count,
      source: 'curated',
    };
  }

  if (inline && !BAD_INLINE.test(inline.name.split(/\s+/)[0])) {
    return {
      abbr,
      name: inline.name,
      definition: `Defined in SEC filings as “${inline.name}”.`,
      category: 'general',
      count,
      source: 'filing',
    };
  }

  return null;
}

export function exportRagGlossary() {
  mkdirSync(PATHS.staticRag, { recursive: true });

  const texts = loadCorpusTexts();
  const acronymCounts = extractAcronyms(texts);
  const inlineDefs = extractInlineDefinitions(texts);

  /** @type {Map<string, ReturnType<typeof buildTermEntry> & object>} */
  const termsByKey = new Map();

  for (const [abbr, count] of acronymCounts) {
    const entry = buildTermEntry(abbr, count, inlineDefs);
    if (!entry) continue;
    const key = canonicalKey(abbr);
    const prev = termsByKey.get(key);
    if (!prev || entry.count > prev.count || entry.source === 'curated') {
      termsByKey.set(key, { ...entry, abbr: prev?.abbr ?? abbr });
    }
  }

  const terms = [...termsByKey.values()].sort((a, b) => b.count - a.count || a.abbr.localeCompare(b.abbr));

  /** @type {Map<string, typeof terms>} */
  const byCategory = new Map();
  for (const term of terms) {
    const title = GLOSSARY_CATEGORIES[term.category] ?? GLOSSARY_CATEGORIES.general;
    if (!byCategory.has(title)) byCategory.set(title, []);
    byCategory.get(title).push({
      abbr: term.abbr,
      name: term.name,
      definition: term.definition,
      count: term.count,
      source: term.source,
    });
  }

  const categoryOrder = Object.values(GLOSSARY_CATEGORIES);
  const groups = categoryOrder
    .map((title) => ({
      title,
      items: (byCategory.get(title) ?? []).sort((a, b) => b.count - a.count || a.abbr.localeCompare(b.abbr)),
    }))
    .filter((g) => g.items.length > 0);

  const payload = {
    generatedAt: new Date().toISOString(),
    corpusDocumentCount: texts.length,
    acronymInstances: [...acronymCounts.values()].reduce((s, n) => s + n, 0),
    uniqueAcronymsInCorpus: acronymCounts.size,
    termCount: terms.length,
    curatedCount: terms.filter((t) => t.source === 'curated').length,
    filingExtractedCount: terms.filter((t) => t.source === 'filing').length,
    groups,
  };

  const outPath = join(PATHS.staticRag, 'glossary.json');
  writeFileSync(outPath, JSON.stringify(payload, null, 2));

  return payload;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = exportRagGlossary();
  console.log(`Glossary: ${result.termCount} terms (${result.curatedCount} curated, ${result.filingExtractedCount} from filings)`);
  console.log(`  → static/rag/glossary.json`);
}
