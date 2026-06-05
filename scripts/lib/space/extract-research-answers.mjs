/**
 * Scan per-ticker SEC filing.txt with the declarative research-question
 * patterns, build evidence cards, score, and return top-N per ticker per
 * question. Output drops into static/<topicId>/research/answers.json.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { topicStaticSecDir } from '../paths.mjs';
import { RESEARCH_QUESTIONS, CATEGORIES, DEFAULT_SECTION_BOOST } from './research-questions.mjs';

const DEFAULT_CONTEXT_CHARS = 380;
const DEFAULT_MAX_PER_TICKER = 3;
const MIN_PASSAGE_LEN = 60;
const MAX_HITS_PER_PATTERN = 20;

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

/**
 * @param {Array<{id:string, header:string, charStart:number, charEnd:number}>} sections
 * @param {number} offset
 */
function findContainingSection(sections, offset) {
  if (!Array.isArray(sections)) return null;
  for (const s of sections) {
    if (offset >= s.charStart && offset <= s.charEnd) return s;
  }
  return null;
}

/**
 * @param {string} text
 * @param {RegExp[]} patterns
 */
function scanForHits(text, patterns) {
  const hits = [];
  const seenOffsets = new Set();
  for (const rawPattern of patterns) {
    const re = new RegExp(rawPattern.source, rawPattern.flags.includes('g') ? rawPattern.flags : rawPattern.flags + 'g');
    let m;
    let count = 0;
    while ((m = re.exec(text)) !== null && count < MAX_HITS_PER_PATTERN) {
      // Dedup near-collisions so two overlapping patterns don't both fire.
      const bucket = Math.floor(m.index / 200);
      if (seenOffsets.has(bucket)) {
        count++;
        continue;
      }
      seenOffsets.add(bucket);
      hits.push({ offset: m.index, match: m[0], matched: m[1] ?? null, pattern: rawPattern.source });
      count++;
    }
  }
  return hits.sort((a, b) => a.offset - b.offset);
}

function countPatternHits(passage, patterns) {
  let total = 0;
  for (const p of patterns) {
    const re = new RegExp(p.source, p.flags.includes('g') ? p.flags : p.flags + 'g');
    const matches = passage.match(re);
    if (matches) total += matches.length;
  }
  return total;
}

/**
 * @param {{offset:number, match:string, matched:string|null, pattern:string}} hit
 * @param {string} text
 * @param {object[]} sections
 * @param {object} meta
 * @param {import('./research-questions.mjs').ResearchQuestion} q
 */
function buildEvidenceCard(hit, text, sections, meta, q) {
  const radius = q.contextChars ?? DEFAULT_CONTEXT_CHARS;
  const { excerpt, charStart, charEnd } = excerptAround(text, hit.offset, radius);
  if (!isQualityExcerpt(excerpt)) return null;

  const section = findContainingSection(sections, hit.offset);
  const boost = q.sectionBoost ?? DEFAULT_SECTION_BOOST;
  const sectionBoost = (section && boost[section.id]) ?? 1.0;
  const passageHits = countPatternHits(excerpt, q.patterns);
  const score = passageHits * sectionBoost;

  let numericValue = null;
  if (q.numericCapture) {
    const nm = excerpt.match(q.numericCapture);
    if (nm) {
      const raw = nm[1].replace(/,/g, '');
      const num = parseFloat(raw);
      if (!Number.isNaN(num)) {
        const scale = (nm[2] ?? '').toLowerCase();
        const multiplier = scale === 'billion' ? 1_000 : scale === 'million' ? 1 : 1;
        numericValue = { raw: nm[1], scale: scale || null, value: scale ? num * multiplier : num, unit: q.numericUnit ?? null };
      }
    }
  }

  return {
    ticker: meta.ticker,
    form: meta.filing?.form ?? null,
    filingDate: meta.filing?.filingDate ?? null,
    filingUrl: meta.filingUrl ?? null,
    sectionId: section?.id ?? null,
    sectionHeader: section?.header ?? null,
    charStart,
    charEnd,
    charOffset: hit.offset,
    excerpt,
    matchedPattern: hit.pattern,
    matchedText: hit.match.slice(0, 120),
    score,
    numericValue,
  };
}

/**
 * Build-time extractive summary for a question.
 * Deterministic — no LLM. Produces a coverage line, an attributed headline
 * quote drawn from the top-scoring evidence card, optional numeric range,
 * and ticker / theme stats.
 *
 * @param {object} question - question schema entry
 * @param {object[]} answers - already-scored evidence cards
 * @param {number} totalFilers
 */
function buildAnswerSummary(question, answers, totalFilers) {
  if (!answers.length) {
    return {
      coverage: `Not disclosed by any of the ${totalFilers} watchlist filers.`,
      headline: null,
      attribution: null,
      topTickers: [],
      themes: [],
      numeric: null,
    };
  }

  // Headline = highest-scoring card. Clean whitespace, strip leading "…", cap length.
  const ranked = [...answers].sort((a, b) => b.score - a.score);
  const topCard = ranked[0];
  const headline = cleanQuote(topCard.excerpt);

  // Per-ticker stats — count cards and pick best-scoring excerpt per ticker.
  /** @type {Map<string, { ticker: string, cardCount: number, topScore: number, topCharOffset: number | null, topSectionHeader: string | null }>} */
  const byTicker = new Map();
  for (const a of answers) {
    const bucket = byTicker.get(a.ticker) ?? {
      ticker: a.ticker,
      cardCount: 0,
      topScore: 0,
      topCharOffset: null,
      topSectionHeader: null,
    };
    bucket.cardCount += 1;
    if (a.score > bucket.topScore) {
      bucket.topScore = a.score;
      bucket.topCharOffset = a.charOffset ?? null;
      bucket.topSectionHeader = a.sectionHeader ?? null;
    }
    byTicker.set(a.ticker, bucket);
  }
  const topTickers = [...byTicker.values()]
    .sort((a, b) => b.topScore - a.topScore || b.cardCount - a.cardCount)
    .slice(0, 5);

  // Coverage line.
  const disclosing = byTicker.size;
  const tickerNames = topTickers.slice(0, 3).map((t) => t.ticker).join(', ');
  const coverage = `${disclosing} of ${totalFilers} filers disclose this${tickerNames ? ` — top: ${tickerNames}.` : '.'}`;

  // Theme keywords — dedup by lowercased matchedText, keep top 3 by frequency.
  const themeCounts = new Map();
  for (const a of answers) {
    if (!a.matchedText) continue;
    const key = String(a.matchedText).toLowerCase().slice(0, 60).trim();
    if (!key) continue;
    themeCounts.set(key, (themeCounts.get(key) ?? 0) + 1);
  }
  const themes = [...themeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([phrase, count]) => ({ phrase, count }));

  // Numeric range — only when question has a numericCapture and some answers parsed values.
  let numeric = null;
  if (question.numericCapture) {
    const values = answers.map((a) => a.numericValue?.value).filter((v) => Number.isFinite(v));
    if (values.length) {
      values.sort((a, b) => a - b);
      const median = values.length % 2
        ? values[Math.floor(values.length / 2)]
        : (values[values.length / 2 - 1] + values[values.length / 2]) / 2;
      numeric = {
        unit: question.numericUnit ?? null,
        min: values[0],
        max: values[values.length - 1],
        median,
        samples: values.length,
      };
    }
  }

  return {
    coverage,
    headline,
    attribution: {
      ticker: topCard.ticker,
      sectionHeader: topCard.sectionHeader,
      filingDate: topCard.filingDate,
      charOffset: topCard.charOffset ?? null,
    },
    topTickers,
    themes,
    numeric,
  };
}

function cleanQuote(excerpt) {
  if (!excerpt) return null;
  let q = String(excerpt).replace(/\s+/g, ' ').trim();
  q = q.replace(/^[…\s]+/, '').replace(/[…\s]+$/, '');
  // Trim at the first sentence boundary that lands between 80 and 280 chars.
  const minLen = 80;
  const maxLen = 280;
  if (q.length > maxLen) {
    const slice = q.slice(0, maxLen);
    const stop = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('; '), slice.lastIndexOf(': '));
    q = stop > minLen ? slice.slice(0, stop + 1) : slice + '…';
  }
  return q;
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
export function extractAnswersForTopic({ tickers, topicId }) {
  const artifacts = new Map();
  for (const ticker of tickers) {
    const art = loadTickerArtifacts(topicId, ticker);
    if (art) artifacts.set(ticker, art);
  }

  const questions = RESEARCH_QUESTIONS.map((q) => {
    const allAnswers = [];
    for (const ticker of tickers) {
      const art = artifacts.get(ticker);
      if (!art) continue;
      const hits = scanForHits(art.text, q.patterns);
      const cards = hits
        .map((h) => buildEvidenceCard(h, art.text, art.sections, art.meta, q))
        .filter(Boolean)
        .sort((a, b) => b.score - a.score)
        .slice(0, q.maxPerTicker ?? DEFAULT_MAX_PER_TICKER);
      allAnswers.push(...cards);
    }
    const tickersDisclosing = new Set(allAnswers.map((a) => a.ticker));
    const summary = buildAnswerSummary(q, allAnswers, artifacts.size);
    return {
      id: q.id,
      category: q.category,
      question: q.question,
      hint: q.hint,
      defaultQuery: q.defaultQuery,
      defaultMode: q.defaultMode ?? 'hybrid',
      numericUnit: q.numericUnit ?? null,
      answerCount: allAnswers.length,
      tickersDisclosing: tickersDisclosing.size,
      tickerSet: [...tickersDisclosing].sort(),
      summary,
      answers: allAnswers.sort((a, b) => {
        if (a.ticker !== b.ticker) return a.ticker.localeCompare(b.ticker);
        return b.score - a.score;
      }),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    topicId,
    questionCount: questions.length,
    tickerCount: artifacts.size,
    categories: CATEGORIES,
    questions,
  };
}
