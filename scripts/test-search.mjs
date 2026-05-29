#!/usr/bin/env node
/** End-to-end search smoke test for acronym queries like GaN */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { buildEvidenceBm25Index, rankEvidenceByBm25, tokenize, Bm25Index } from '../src/lib/bm25.js';

function loadEvidence() {
  const entries = [];
  for (const ticker of readdirSync('static/sec')) {
    try {
      const data = JSON.parse(readFileSync(join('static/sec', ticker, 'evidence.json'), 'utf8'));
      entries.push(...(data.entries ?? []));
    } catch {
      /* skip */
    }
  }
  return entries;
}

function loadChunks() {
  const data = JSON.parse(readFileSync('static/rag/chunks.json', 'utf8'));
  return { chunks: data.entries ?? [], data };
}

function assert(name, condition, detail = '') {
  if (!condition) {
    console.error(`FAIL ${name}${detail ? `: ${detail}` : ''}`);
    process.exitCode = 1;
    return false;
  }
  console.log(`ok ${name}`);
  return true;
}

const query = 'GaN';
console.log(`Search smoke test: "${query}"\n`);
console.log('tokenize:', tokenize(query));

const evidence = loadEvidence();
const evidenceIndex = buildEvidenceBm25Index(evidence);
const evidenceBm25 = rankEvidenceByBm25(evidenceIndex, query, evidence, { minScore: 0.1, limit: 10 });
assert('evidence BM25 returns KLAC hit', evidenceBm25?.some((r) => r.entry.ticker === 'KLAC'));

const evidenceExact = rankByExactMatch(query, evidence, {
  getText: (e) => [e.excerpt, e.vendor, e.sectionHeader].filter(Boolean).join(' '),
  limit: 10,
});
assert('evidence exact returns KLAC hit', evidenceExact?.some((r) => r.entry.ticker === 'KLAC'));
assert(
  'evidence exact avoids organization false positives',
  !evidenceExact?.some((r) => /organization structure/i.test(r.entry.excerpt ?? '') && r.entry.ticker !== 'KLAC'),
);

const { chunks, data: chunksData } = loadChunks();
const chunkIndex = new Bm25Index();
for (const chunk of chunks) chunkIndex.add(chunk.id, chunk.text);
chunkIndex.finalize();

const chunkBm25 = rankEvidenceByBm25(chunkIndex, query, chunks, { minScore: 0.1, limit: 10 });
assert('chunk BM25 returns KLAC hits', chunkBm25?.length >= 1 && chunkBm25.every((r) => r.entry.ticker === 'KLAC'));

const chunkExact = rankByExactMatch(query, chunks, { getText: (c) => c.text, limit: 10 });
assert('chunk exact returns only true GaN mentions', chunkExact?.every((r) => /\bGaN\b|gallium nitride/i.test(r.entry.text)));

const embeddingMap = loadEmbeddingIndex(chunksData).map;
const hybridBm25Only = await hybridSearch({
  query,
  items: chunks,
  bm25Index: chunkIndex,
  embeddingMap: null,
  mode: 'hybrid',
  bm25Min: 0.1,
  limit: 10,
});
assert('hybrid without embeddings falls back to BM25', hybridBm25Only.length >= 1);

const hybridEmbedFail = await hybridSearch({
  query,
  items: chunks,
  bm25Index: chunkIndex,
  embeddingMap,
  mode: 'hybrid',
  bm25Min: 0.1,
  semanticMin: 0.99,
  limit: 10,
});
assert(
  'hybrid with empty semantic still returns BM25 via fusion',
  hybridEmbedFail.length >= 1,
  `got ${hybridEmbedFail.length}`,
);

console.log('\nSummary:');
console.log(`  evidence BM25: ${evidenceBm25?.length ?? 0} hits`);
console.log(`  evidence exact: ${evidenceExact?.length ?? 0} hits`);
console.log(`  chunk BM25: ${chunkBm25?.length ?? 0} hits`);
console.log(`  chunk exact: ${chunkExact?.length ?? 0} hits`);

if (process.exitCode) {
  process.exit(process.exitCode);
}
