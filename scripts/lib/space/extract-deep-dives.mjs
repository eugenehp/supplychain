/**
 * Build static/<topic>/research/deep-dives.json from the declarative
 * DEEP_DIVES schema. Reuses the passage/section helpers shape from
 * extract-research-answers but with per-section ticker filtering.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { topicStaticSecDir } from '../paths.mjs';
import { DEEP_DIVES, SECTION_BOOST } from './deep-dives.mjs';

const MIN_PASSAGE_LEN = 60;
const MAX_HITS_PER_PATTERN = 30;

function isQualityExcerpt(text) {
  if (!text || text.length < MIN_PASSAGE_LEN) return false;
  if (/xbrli:|iso4217:|http:\/\/fasb/i.test(text)) return false;
  const letters = (text.match(/[a-zA-Z]/g)?.length ?? 0);
  if (letters < text.length * 0.55) return false;
  return true;
}

function excerptAround(text, index, radius) {
  const start = Math.max(0, index - Math.floor(radius * 0.4));
  const end = Math.min(text.length, index + Math.floor(radius * 0.6));
  let excerpt = text.slice(start, end).replace(/\s+/g, ' ').trim();
  if (start > 0) excerpt = '…' + excerpt;
  if (end < text.length) excerpt = excerpt + '…';
  return { excerpt, charStart: start, charEnd: end };
}

function findContainingSection(sections, offset) {
  if (!Array.isArray(sections)) return null;
  for (const s of sections) {
    if (offset >= s.charStart && offset <= s.charEnd) return s;
  }
  return null;
}

function withGlobal(re) {
  return new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
}

function scanForHits(text, patterns) {
  const hits = [];
  const seenBuckets = new Set();
  for (const p of patterns) {
    const re = withGlobal(p);
    let m;
    let count = 0;
    while ((m = re.exec(text)) !== null && count < MAX_HITS_PER_PATTERN) {
      const bucket = Math.floor(m.index / 220);
      if (seenBuckets.has(bucket)) {
        count++;
        continue;
      }
      seenBuckets.add(bucket);
      hits.push({ offset: m.index, match: m[0], pattern: p.source });
      count++;
    }
  }
  return hits.sort((a, b) => a.offset - b.offset);
}

function countPatternHits(passage, patterns) {
  let total = 0;
  for (const p of patterns) {
    const re = withGlobal(p);
    const matches = passage.match(re);
    if (matches) total += matches.length;
  }
  return total;
}

function buildCard(hit, text, sections, meta, section) {
  const radius = section.contextChars ?? 380;
  const { excerpt, charStart, charEnd } = excerptAround(text, hit.offset, radius);
  if (!isQualityExcerpt(excerpt)) return null;
  const sec = findContainingSection(sections, hit.offset);
  const boost = (sec && SECTION_BOOST[sec.id]) ?? 1.0;
  const score = countPatternHits(excerpt, section.patterns) * boost;
  return {
    ticker: meta.ticker,
    form: meta.filing?.form ?? null,
    filingDate: meta.filing?.filingDate ?? null,
    filingUrl: meta.filingUrl ?? null,
    sectionId: sec?.id ?? null,
    sectionHeader: sec?.header ?? null,
    charStart,
    charEnd,
    charOffset: hit.offset,
    excerpt,
    matchedText: hit.match.slice(0, 120),
    score,
  };
}

function loadTickerArtifacts(topicId, ticker) {
  const dir = topicStaticSecDir(topicId, ticker);
  const textPath = join(dir, 'filing.txt');
  const sectionsPath = join(dir, 'sections.json');
  const metaPath = join(dir, 'metadata.json');
  if (!existsSync(textPath) || !existsSync(metaPath)) return null;
  return {
    text: readFileSync(textPath, 'utf8'),
    sections: existsSync(sectionsPath) ? JSON.parse(readFileSync(sectionsPath, 'utf8')) : [],
    meta: { ...JSON.parse(readFileSync(metaPath, 'utf8')), ticker },
  };
}

/**
 * @param {{ tickers: string[], topicId: string }} params
 */
export function extractDeepDivesForTopic({ tickers, topicId }) {
  const artifacts = new Map();
  for (const t of tickers) {
    const a = loadTickerArtifacts(topicId, t);
    if (a) artifacts.set(t, a);
  }

  const deepDives = DEEP_DIVES.map((dive) => {
    const effectiveTickers = Array.isArray(dive.tickerFilter) && dive.tickerFilter.length
      ? dive.tickerFilter
      : [...artifacts.keys()].filter((t) => !(dive.ignoreTickers ?? []).includes(t));

    const sections = dive.sections.map((section) => {
      const allCards = [];
      for (const ticker of effectiveTickers) {
        const art = artifacts.get(ticker);
        if (!art) continue;
        const hits = scanForHits(art.text, section.patterns);
        const cards = hits
          .map((h) => buildCard(h, art.text, art.sections, art.meta, section))
          .filter(Boolean)
          .sort((a, b) => b.score - a.score)
          .slice(0, section.maxPerTicker ?? 3);
        allCards.push(...cards);
      }

      allCards.sort((a, b) => {
        if (a.ticker !== b.ticker) return a.ticker.localeCompare(b.ticker);
        return b.score - a.score;
      });

      const limited = section.maxTotal ? allCards.slice(0, section.maxTotal) : allCards;
      const disclosing = new Set(limited.map((c) => c.ticker));

      return {
        id: section.id,
        title: section.title,
        hint: section.hint,
        cardCount: limited.length,
        tickersDisclosing: disclosing.size,
        tickerSet: [...disclosing].sort(),
        cards: limited,
      };
    });

    return {
      id: dive.id,
      title: dive.title,
      subtitle: dive.subtitle,
      anchorTicker: dive.anchorTicker ?? null,
      tickerFilter: dive.tickerFilter ?? null,
      tickerScope: effectiveTickers,
      sections,
      totalCards: sections.reduce((n, s) => n + s.cardCount, 0),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    topicId,
    deepDives,
  };
}
