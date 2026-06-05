/**
 * UMAP 2D projection of the per-topic chunk embeddings.
 *
 * Loads all quantized vectors from rag/shards/*.json, dequantizes to Float32,
 * runs umap-js to (x, y), stratified-samples ~MAX_POINTS chunks per shard so
 * the static scatter stays under ~1.5 MB, and ships {x, y, source, ticker,
 * sectionHeader, charOffset, excerpt} so the UI can render and cite back.
 *
 * Output: static/<topic>/umap/scatter.json
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { UMAP } from 'umap-js';
import { topicStaticDir } from '../paths.mjs';

const MAX_POINTS_PER_SHARD = 220;     // 14 SEC + 16 report shards * 220 ≈ 6,600 cap
const TOTAL_HARD_CAP = 6000;
const SAMPLE_TEXT_CHARS = 240;

function dequantize(q) {
  const arr = q instanceof Int8Array ? q : Int8Array.from(q);
  const out = new Float32Array(arr.length);
  for (let i = 0; i < arr.length; i++) out[i] = arr[i] / 127;
  return out;
}

function sampleEntries(entries, cap) {
  if (entries.length <= cap) return entries;
  // Even-spacing reservoir — deterministic, preserves position diversity.
  const out = [];
  const step = entries.length / cap;
  for (let i = 0; i < cap; i++) {
    out.push(entries[Math.floor(i * step)]);
  }
  return out;
}

function shortExcerpt(text) {
  if (!text) return '';
  const collapsed = String(text).replace(/\s+/g, ' ').trim();
  return collapsed.length > SAMPLE_TEXT_CHARS
    ? collapsed.slice(0, SAMPLE_TEXT_CHARS - 1) + '…'
    : collapsed;
}

function colorGroupFor(entry, shardKey) {
  if (entry.source === 'public-report') return 'report';
  if (entry.source === 'sec') return 'sec';
  if (typeof shardKey === 'string' && shardKey.startsWith('report__')) return 'report';
  return 'other';
}

export async function extractUmapForTopic(topicId, { progress } = {}) {
  const shardsDir = join(topicStaticDir(topicId), 'rag', 'shards');
  if (!existsSync(shardsDir)) return { error: `No shards at ${shardsDir}` };

  /** @type {Array<{ entry: object, shard: string }>} */
  const all = [];
  const files = readdirSync(shardsDir).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    let payload;
    try {
      payload = JSON.parse(readFileSync(join(shardsDir, file), 'utf8'));
    } catch {
      continue;
    }
    const shardKey = payload.shard ?? payload.ticker ?? file.replace(/\.json$/, '');
    const withVectors = (payload.entries ?? []).filter((e) => Array.isArray(e.q));
    const sampled = sampleEntries(withVectors, MAX_POINTS_PER_SHARD);
    for (const entry of sampled) all.push({ entry, shard: shardKey });
  }

  if (!all.length) return { error: 'No quantized vectors found — re-run with embeddings' };

  // Hard cap with another round of even sampling.
  const capped = all.length > TOTAL_HARD_CAP ? sampleEntries(all, TOTAL_HARD_CAP) : all;
  const vectors = capped.map((p) => dequantize(p.entry.q));

  progress?.(`UMAP: fitting ${vectors.length} vectors (${vectors[0].length}d → 2d)…`);
  const umap = new UMAP({
    nComponents: 2,
    nNeighbors: 15,
    minDist: 0.1,
    spread: 1,
    random: Math.random,
  });
  const coords = umap.fit(vectors);

  // Normalise coords to a fixed plotting box [-1, 1] in each axis.
  const xs = coords.map((c) => c[0]);
  const ys = coords.map((c) => c[1]);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;

  const points = capped.map((p, i) => {
    const x = ((coords[i][0] - xMin) / xRange) * 2 - 1;
    const y = ((coords[i][1] - yMin) / yRange) * 2 - 1;
    return {
      x: Number(x.toFixed(4)),
      y: Number(y.toFixed(4)),
      group: colorGroupFor(p.entry, p.shard),
      shard: p.shard,
      ticker: p.entry.ticker ?? null,
      reportId: p.entry.reportId ?? null,
      agency: p.entry.agency ?? null,
      sectionHeader: p.entry.sectionHeader ?? null,
      sectionId: p.entry.sectionId ?? null,
      charOffset: p.entry.charStart ?? p.entry.charOffset ?? null,
      form: p.entry.form ?? null,
      filingDate: p.entry.filingDate ?? null,
      excerpt: shortExcerpt(p.entry.text),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    topicId,
    model: 'Xenova/all-MiniLM-L6-v2',
    dim: vectors[0].length,
    pointCount: points.length,
    totalInCorpus: all.length,
    groups: [
      { id: 'sec', label: 'SEC 10-K / 20-F' },
      { id: 'report', label: 'Public reports' },
    ],
    points,
  };
}

export async function writeUmap({ topicId }) {
  const result = await extractUmapForTopic(topicId, {
    progress: (msg) => console.log(`    ${msg}`),
  });
  if (result.error) return result;
  const outDir = join(topicStaticDir(topicId), 'umap');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'scatter.json'), JSON.stringify(result));
  return result;
}
