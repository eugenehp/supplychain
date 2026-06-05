import { writeFileSync, mkdirSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PATHS } from './paths.mjs';
import {
  embedTexts,
  quantizeVector,
  EMBEDDING_MODEL,
  EMBEDDING_DIM,
} from './embeddings.mjs';
import { indexDocumentEmbeddings } from './rag-store.mjs';
import { exportRagGlossary } from './export-glossary.mjs';

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

export async function exportStaticRag(processed, { skipEmbed = false } = {}) {
  mkdirSync(PATHS.staticRag, { recursive: true });

  const chunks = [];
  for (const p of processed) {
    for (const c of p.chunks ?? []) {
      chunks.push({
        id: c.id,
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

  const vendors = collectVendors(processed);
  let entries = chunks;

  if (!skipEmbed && chunks.length) {
    console.log(`  Embedding ${chunks.length} filing chunks (${EMBEDDING_MODEL})…`);
    const vectors = await embedTexts(
      chunks.map((c) => c.text),
      {
        onProgress: (done, total) => {
          if (done % 200 === 0 || done === total) process.stdout.write(`\r    ${done}/${total} chunk vectors`);
        },
      },
    );
    console.log('');
    indexDocumentEmbeddings(chunks, vectors);
    console.log(`  SQLite document embeddings: ${vectors.length} vectors`);
    entries = chunks.map((chunk, i) => ({
      ...chunk,
      q: [...quantizeVector(vectors[i])],
    }));
  } else if (skipEmbed) {
    // Preserve previously-computed q vectors from existing shard files so that
    // --skip-embed doesn't silently wipe the corpus's semantic search readiness.
    const shardsDir = join(PATHS.staticRag, 'shards');
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
      console.log(`  --skip-embed: carried forward ${hydrated} of ${chunks.length} existing vectors`);
    }
  }

  const hasEmbeddings = entries.some((e) => Array.isArray(e.q));

  const chunksPayload = {
    generatedAt: new Date().toISOString(),
    model: hasEmbeddings ? EMBEDDING_MODEL : null,
    dim: EMBEDDING_DIM,
    count: entries.length,
    sharded: true,
    entries: [],
  };

  /** @type {Record<string, string>} */
  const shardUrls = {};
  /** @type {Record<string, object[]>} */
  const byTicker = {};
  for (const chunk of entries) {
    const ticker = chunk.ticker ?? 'UNKNOWN';
    (byTicker[ticker] ??= []).push(chunk);
  }

  const shardsDir = join(PATHS.staticRag, 'shards');
  mkdirSync(shardsDir, { recursive: true });
  for (const [ticker, tickerEntries] of Object.entries(byTicker)) {
    const shardPath = join(shardsDir, `${ticker}.json`);
    writeFileSync(
      shardPath,
      JSON.stringify({
        generatedAt: chunksPayload.generatedAt,
        ticker,
        count: tickerEntries.length,
        entries: tickerEntries,
      }),
    );
    shardUrls[ticker] = `/rag/shards/${ticker}.json`;
  }

  writeFileSync(join(PATHS.staticRag, 'chunks.json'), JSON.stringify(chunksPayload));
  writeFileSync(
    join(PATHS.staticRag, 'vendors.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), count: vendors.length, vendors }, null, 2),
  );

  const manifest = {
    generatedAt: new Date().toISOString(),
    chunkCount: chunks.length,
    vendorCount: vendors.length,
    tickers: [...new Set(chunks.map((c) => c.ticker))].sort(),
    embeddingModel: hasEmbeddings ? EMBEDDING_MODEL : null,
    embeddingsReady: hasEmbeddings,
    sharded: true,
    shardUrls,
    chunksUrl: '/rag/chunks.json',
    vendorsUrl: '/rag/vendors.json',
    glossaryUrl: '/rag/glossary.json',
  };
  writeFileSync(join(PATHS.staticRag, 'manifest.json'), JSON.stringify(manifest, null, 2));

  const glossary = exportRagGlossary();
  console.log(`  Glossary: ${glossary.termCount} abbreviations from RAG corpus → static/rag/glossary.json`);

  console.log(`  Browser RAG index: ${chunks.length} chunks (${Object.keys(shardUrls).length} shards), ${vendors.length} vendors → static/rag/`);
  return manifest;
}
