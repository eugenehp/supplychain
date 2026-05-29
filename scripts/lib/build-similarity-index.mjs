import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PATHS } from './paths.mjs';
import { TOPICS } from './topics/index.mjs';
import {
  buildTopicSignature,
  computeSimilarityReportFromDatasets,
} from '../../src/lib/topic-similarity-core.js';

const GROUP_LEGEND = [
  { key: 'product', label: 'Finished Product' },
  { key: 'foundry', label: 'Foundry / CoWoS' },
  { key: 'memory', label: 'HBM Memory' },
  { key: 'osat', label: 'Assembly / OSAT' },
  { key: 'eda', label: 'EDA & IP' },
  { key: 'equipment', label: 'Fab Equipment' },
  { key: 'materials', label: 'Materials & Substrates' },
  { key: 'subcomponent', label: 'Equipment Sub-components' },
  { key: 'raw', label: 'Tier 4 — Raw Materials' },
  { key: 'commodity', label: 'Tier 5 — Bulk / Extractive' },
];

/** @param {Record<string, object>} datasets */
export function buildSimilarityIndex(datasets = null) {
  /** @type {Map<string, object>} */
  const byId = new Map();

  if (datasets) {
    for (const [id, data] of Object.entries(datasets)) {
      if (data) byId.set(id, data);
    }
  } else {
    for (const meta of TOPICS) {
      if (!meta.id) continue;
      const path = join(PATHS.topics, meta.id, 'supply-chain.json');
      try {
        byId.set(meta.id, JSON.parse(readFileSync(path, 'utf8')));
      } catch {
        /* topic not built yet */
      }
    }
  }

  const topicMetas = TOPICS.map((t) => ({
    ...t,
    dataFile: t.status === 'active' || t.status === 'limited' ? `${t.id}/supply-chain.json` : null,
  }));

  /** @type {Record<string, object>} */
  const byTopic = {};

  for (const meta of topicMetas) {
    if (!meta.dataFile || !byId.has(meta.id)) continue;
    byTopic[meta.id] = computeSimilarityReportFromDatasets(
      meta.id,
      byId.get(meta.id),
      byId,
      topicMetas,
      GROUP_LEGEND,
    );
  }

  return {
    generatedAt: new Date().toISOString(),
    byTopic,
  };
}

export function writeSimilarityIndex(datasets = null) {
  const index = buildSimilarityIndex(datasets);
  mkdirSync(PATHS.topics, { recursive: true });
  mkdirSync(join(PATHS.staticRoot, 'topics'), { recursive: true });

  const json = JSON.stringify(index);
  writeFileSync(join(PATHS.topics, 'similarity-index.json'), json);
  writeFileSync(join(PATHS.staticRoot, 'topics', 'similarity-index.json'), json);

  console.log(`  Similarity index: ${Object.keys(index.byTopic).length} topics → static/topics/similarity-index.json`);
  return index;
}
