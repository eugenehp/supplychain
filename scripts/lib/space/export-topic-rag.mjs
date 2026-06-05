/**
 * Per-topic RAG exporter — mirrors export-static-rag.mjs but writes a
 * self-contained bundle under static/<topicId>/rag/ so each research topic
 * ships its own chunks, vendors, and manifest. No cross-topic mixing.
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { topicStaticRagDir } from '../paths.mjs';
import {
  embedTexts,
  quantizeVector,
  EMBEDDING_MODEL,
  EMBEDDING_DIM,
} from '../embeddings.mjs';

function collectVendors(processed) {
  const map = new Map();
  for (const p of processed) {
    for (const v of p.entities?.vendors ?? []) {
      const key = `${v.name}|${p.ticker}`;
      map.set(key, {
        name: v.name,
        ticker: p.ticker,
        mentionCount: v.count ?? 0,
        snippets: (v.snippets ?? []).slice(0, 4),
      });
    }
  }
  return [...map.values()].sort((a, b) => b.mentionCount - a.mentionCount);
}

/**
 * @param {string} topicId
 * @param {Array<{ticker:string, chunks:object[], entities:object}>} processed
 * @param {{skipEmbed?: boolean, publicReportChunks?: object[]}} options
 */
export async function exportTopicRag(topicId, processed, { skipEmbed = false, publicReportChunks = [] } = {}) {
  const outDir = topicStaticRagDir(topicId);
  mkdirSync(outDir, { recursive: true });

  const chunks = [];
  for (const p of processed) {
    for (const c of p.chunks ?? []) {
      chunks.push({
        id: c.id,
        topicId,
        source: 'sec',
        ticker: c.ticker ?? p.ticker,
        form: c.form ?? null,
        filingDate: c.filingDate ?? null,
        sectionId: c.sectionId ?? null,
        sectionHeader: c.sectionHeader ?? null,
        charStart: c.charStart ?? 0,
        charEnd: c.charEnd ?? 0,
        text: c.text,
      });
    }
  }

  for (const c of publicReportChunks) {
    chunks.push({
      id: c.id,
      topicId,
      source: c.source ?? 'public-report',
      reportId: c.reportId,
      agency: c.agency,
      title: c.title,
      year: c.year,
      charStart: c.charStart ?? 0,
      charEnd: c.charEnd ?? 0,
      text: c.text,
    });
  }

  const vendors = collectVendors(processed);
  let entries = chunks;

  if (!skipEmbed && chunks.length) {
    console.log(`  [${topicId}] embedding ${chunks.length} chunks (${EMBEDDING_MODEL})…`);
    const vectors = await embedTexts(
      chunks.map((c) => c.text),
      {
        onProgress: (done, total) => {
          if (done % 200 === 0 || done === total) {
            process.stdout.write(`\r    ${done}/${total} chunk vectors`);
          }
        },
      },
    );
    console.log('');
    entries = chunks.map((chunk, i) => ({ ...chunk, q: [...quantizeVector(vectors[i])] }));
  } else if (skipEmbed) {
    // Preserve previously-computed q vectors from existing shard files so that
    // --skip-embed doesn't silently wipe the corpus's semantic search readiness.
    const shardsDir = join(outDir, 'shards');
    const carried = new Map();
    if (existsSync(shardsDir)) {
      for (const file of readdirSync(shardsDir).filter((f) => f.endsWith('.json'))) {
        try {
          const prev = JSON.parse(readFileSync(join(shardsDir, file), 'utf8'));
          for (const e of prev.entries ?? []) {
            if (e?.id && Array.isArray(e.q)) carried.set(e.id, e.q);
          }
        } catch { /* ignore malformed shard */ }
      }
    }
    if (carried.size) {
      let hydrated = 0;
      entries = chunks.map((chunk) => {
        const q = carried.get(chunk.id);
        if (q) { hydrated++; return { ...chunk, q }; }
        return chunk;
      });
      console.log(`  [${topicId}] --skip-embed: carried forward ${hydrated} of ${chunks.length} existing vectors`);
    }
  }

  /** @type {Record<string, string>} */
  const shardUrls = {};
  /** @type {Record<string, object[]>} */
  const byShard = {};
  for (const chunk of entries) {
    const shardKey = chunk.source === 'sec' ? chunk.ticker : `report__${chunk.reportId ?? 'misc'}`;
    (byShard[shardKey] ??= []).push(chunk);
  }

  const shardsDir = join(outDir, 'shards');
  mkdirSync(shardsDir, { recursive: true });
  const generatedAt = new Date().toISOString();
  for (const [shardKey, shardEntries] of Object.entries(byShard)) {
    const shardPath = join(shardsDir, `${shardKey}.json`);
    writeFileSync(
      shardPath,
      JSON.stringify({
        generatedAt,
        shard: shardKey,
        count: shardEntries.length,
        entries: shardEntries,
      }),
    );
    shardUrls[shardKey] = `/${topicId}/rag/shards/${shardKey}.json`;
  }

  const hasEmbeddings = entries.some((e) => Array.isArray(e.q));

  const chunksPayload = {
    generatedAt,
    topicId,
    model: hasEmbeddings ? EMBEDDING_MODEL : null,
    dim: EMBEDDING_DIM,
    count: entries.length,
    sharded: true,
    entries: [],
  };
  writeFileSync(join(outDir, 'chunks.json'), JSON.stringify(chunksPayload));

  writeFileSync(
    join(outDir, 'vendors.json'),
    JSON.stringify({ generatedAt, topicId, count: vendors.length, vendors }, null, 2),
  );

  const manifest = {
    generatedAt,
    topicId,
    chunkCount: chunks.length,
    vendorCount: vendors.length,
    tickers: [...new Set(processed.map((p) => p.ticker))].sort(),
    publicReports: [
      ...new Set(publicReportChunks.map((c) => c.reportId).filter(Boolean)),
    ],
    embeddingModel: hasEmbeddings ? EMBEDDING_MODEL : null,
    embeddingsReady: hasEmbeddings,
    sharded: true,
    shardUrls,
    chunksUrl: `/${topicId}/rag/chunks.json`,
    vendorsUrl: `/${topicId}/rag/vendors.json`,
  };
  writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(
    `  [${topicId}] RAG bundle: ${chunks.length} chunks across ${Object.keys(shardUrls).length} shards → static/${topicId}/rag/`,
  );
  return manifest;
}
