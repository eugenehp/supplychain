/**
 * Aggregate all per-ticker evidence entries and embed them with MiniLM.
 *
 * Output: static/<topicId>/sec/evidence-embeddings.json
 *
 * FilingEvidencePanel loads this at runtime so semantic ranking lights up
 * inside the per-filing evidence viewer (matches the accelerator path).
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { topicStaticDir, topicStaticSecDir } from '../paths.mjs';
import {
  embedTexts,
  evidenceEmbedText,
  quantizeVector,
  EMBEDDING_MODEL,
  EMBEDDING_DIM,
} from '../embeddings.mjs';

/**
 * @param {{ topicId: string, tickers: string[] }} params
 */
export async function buildTopicEvidenceEmbeddings({ topicId, tickers }) {
  const all = [];
  for (const ticker of tickers) {
    const evPath = join(topicStaticSecDir(topicId, ticker), 'evidence.json');
    if (!existsSync(evPath)) continue;
    try {
      const data = JSON.parse(readFileSync(evPath, 'utf8'));
      for (const entry of data.entries ?? []) all.push(entry);
    } catch {
      /* skip malformed */
    }
  }

  if (!all.length) {
    return { error: 'No evidence entries to embed' };
  }

  console.log(`  Embedding ${all.length} evidence excerpts (${EMBEDDING_MODEL})…`);
  const texts = all.map(evidenceEmbedText);
  const vectors = await embedTexts(texts, {
    onProgress: (done, total) => {
      if (done % 200 === 0 || done === total) process.stdout.write(`\r    ${done}/${total} evidence vectors`);
    },
  });
  console.log('');

  const payload = {
    generatedAt: new Date().toISOString(),
    topicId,
    model: EMBEDDING_MODEL,
    dim: EMBEDDING_DIM,
    docCount: all.length,
    entries: all.map((entry, i) => ({
      id: entry.id,
      q: [...quantizeVector(vectors[i])],
    })),
  };

  const outPath = join(topicStaticDir(topicId), 'sec', 'evidence-embeddings.json');
  mkdirSync(join(topicStaticDir(topicId), 'sec'), { recursive: true });
  writeFileSync(outPath, JSON.stringify(payload));

  return {
    count: all.length,
    path: outPath,
  };
}
