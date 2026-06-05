/**
 * Word cloud for the space-economy corpus.
 *
 * Tokenizes every chunk shard, drops a tight stopword + SEC-boilerplate
 * blocklist, keeps multi-character terms, and ships the top-N terms with
 * per-shard counts so the UI can filter.
 *
 * Output: static/<topic>/wordcloud/terms.json
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { topicStaticDir } from '../paths.mjs';

const STOPWORDS = new Set([
  // English function words
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'day',
  'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'its',
  'let', 'put', 'say', 'she', 'too', 'use', 'with', 'this', 'that', 'have', 'from', 'they', 'will', 'been',
  'were', 'said', 'each', 'which', 'their', 'what', 'about', 'when', 'where', 'than', 'into', 'these', 'those',
  'such', 'some', 'also', 'them', 'than', 'because', 'while', 'after', 'before', 'between', 'against', 'during',
  'under', 'over', 'through', 'above', 'below', 'should', 'would', 'could', 'must', 'shall', 'might',
  'being', 'other', 'more', 'most', 'only', 'very', 'much', 'many', 'same', 'just', 'like', 'then', 'than',
  'when', 'made', 'make', 'making', 'including', 'include', 'included',
  // SEC / 10-K boilerplate
  'company', 'companies', 'fiscal', 'year', 'years', 'period', 'three', 'months', 'december', 'january', 'february',
  'march', 'april', 'june', 'july', 'august', 'september', 'october', 'november', 'quarter', 'quarterly',
  'report', 'reported', 'reporting', 'filed', 'filing', 'filings', 'amended', 'amendment',
  'incorporated', 'corporation', 'inc', 'corp', 'ltd', 'llc', 'gmbh', 'inc.', 'corp.', 'ltd.',
  'common', 'stock', 'shares', 'share', 'class', 'par', 'value', 'value-added',
  'million', 'billion', 'thousand', 'percent', 'amount', 'amounts', 'increase', 'decrease', 'increased', 'decreased',
  'rate', 'rates', 'date', 'dates', 'time', 'times',
  'item', 'items', 'note', 'notes', 'table', 'tables', 'section', 'sections', 'general', 'foregoing',
  'forward-looking', 'statements', 'statement', 'expected', 'expect', 'expects', 'expecting',
  'believe', 'believes', 'believed', 'believing', 'anticipate', 'anticipated', 'anticipates',
  'continue', 'continued', 'continues', 'continuing', 'subject', 'subjected', 'subjects',
  'business', 'operations', 'operating', 'operations', 'results', 'result', 'resulted', 'resulting',
  'total', 'overall', 'related', 'relating', 'relates', 'relate', 'including', 'includes', 'included',
  'further', 'addition', 'additional', 'additionally', 'currently', 'current', 'certain', 'certainly',
  'within', 'without', 'whereas', 'however', 'therefore', 'thus', 'hereof', 'herein', 'thereof', 'therein',
  'whether', 'either', 'neither', 'sub', 'pursuant', 'respect', 'respective', 'respectively',
  'expense', 'expenses', 'cost', 'costs', 'revenue', 'revenues', 'income', 'loss', 'losses', 'profit', 'profits',
  'cash', 'flow', 'flows', 'assets', 'liabilities', 'equity', 'capital',
  'including', 'excluding', 'noted', 'discussed', 'described', 'set', 'forth', 'see', 'page',
  'high', 'low', 'higher', 'lower', 'low', 'small', 'large', 'long', 'short', 'long-term', 'short-term',
  'end', 'ended', 'beginning', 'began', 'began', 'first', 'second', 'third', 'fourth', 'fifth',
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  // Single letters
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
]);

function isCandidate(token) {
  if (!token) return false;
  if (token.length < 4) return false;
  if (token.length > 40) return false;
  if (/^\d/.test(token)) return false;
  if (/^[_\-.]/.test(token)) return false;
  const lc = token.toLowerCase();
  if (STOPWORDS.has(lc)) return false;
  // Strip trailing punctuation
  return /^[A-Za-z][A-Za-z0-9\-]+$/.test(token);
}

function* tokens(text) {
  if (!text) return;
  // Preserve hyphenation; split on whitespace and common punctuation.
  const parts = text.split(/[\s.,;:!?()\[\]{}"'`’“”—–]+/);
  for (const p of parts) {
    if (isCandidate(p)) yield p;
  }
}

/**
 * @param {string} topicId
 */
export function extractWordCloudForTopic(topicId) {
  const shardsDir = join(topicStaticDir(topicId), 'rag', 'shards');
  if (!existsSync(shardsDir)) return { error: 'No shards' };

  /** @type {Map<string, { count: number, byShard: Map<string, number>, sampleCasing: string }>} */
  const counts = new Map();
  let totalChunks = 0;
  let totalTokens = 0;

  for (const file of readdirSync(shardsDir).filter((f) => f.endsWith('.json'))) {
    const shardPath = join(shardsDir, file);
    let payload;
    try {
      payload = JSON.parse(readFileSync(shardPath, 'utf8'));
    } catch {
      continue;
    }
    const shardKey = payload.shard ?? payload.ticker ?? file.replace(/\.json$/, '');
    for (const entry of payload.entries ?? []) {
      totalChunks++;
      const seenInChunk = new Set();
      for (const tok of tokens(entry.text ?? '')) {
        const key = tok.toLowerCase();
        totalTokens++;
        if (seenInChunk.has(key)) continue;     // count once per chunk (document frequency)
        seenInChunk.add(key);
        const bucket = counts.get(key) ?? { count: 0, byShard: new Map(), sampleCasing: tok };
        bucket.count++;
        bucket.byShard.set(shardKey, (bucket.byShard.get(shardKey) ?? 0) + 1);
        // Prefer a casing that looks like a proper noun (start cap) over all-lower.
        if (/^[A-Z]/.test(tok) && /^[a-z]/.test(bucket.sampleCasing)) bucket.sampleCasing = tok;
        counts.set(key, bucket);
      }
    }
  }

  const entries = [...counts.entries()]
    .map(([key, v]) => ({
      term: v.sampleCasing,
      key,
      count: v.count,
      byShard: [...v.byShard.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([shard, count]) => ({ shard, count })),
    }))
    .filter((e) => e.count >= 8)
    .sort((a, b) => b.count - a.count)
    .slice(0, 250);

  return {
    generatedAt: new Date().toISOString(),
    topicId,
    chunkCount: totalChunks,
    tokenCount: totalTokens,
    termCount: entries.length,
    terms: entries,
  };
}

export function writeWordCloud({ topicId }) {
  const result = extractWordCloudForTopic(topicId);
  if (result.error) return result;
  const outDir = join(topicStaticDir(topicId), 'wordcloud');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'terms.json'), JSON.stringify(result, null, 2));
  return result;
}
