import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(__dirname, '../..');

export const PATHS = {
  rawSec: join(ROOT, 'data/raw/sec'),
  processedSec: join(ROOT, 'data/processed/sec'),
  processedGraph: join(ROOT, 'data/processed/graph'),
  topics: join(ROOT, 'data/topics'),
  ragDb: join(ROOT, 'data/rag/index.sqlite'),
  reports: join(ROOT, 'data/reports'),
  /** Vite/Svelte static assets (served at site root) */
  staticRoot: join(ROOT, 'static'),
  staticSec: join(ROOT, 'static/sec'),
  staticRag: join(ROOT, 'static/rag'),
  supplyChainJson: join(ROOT, 'data/supply-chain.json'),
  materialsRareEarth: join(ROOT, 'data/materials/rare-earth'),
  rawInternational: join(ROOT, 'data/raw/international'),
  rawPublicReports: join(ROOT, 'data/raw/public-reports'),
  materialsStructured: join(ROOT, 'data/materials/structured'),
  logos: join(ROOT, 'data/logos'),
  spaceEconomy: join(ROOT, 'data/space-economy'),
  rawPublicSpace: join(ROOT, 'data/raw/space-public'),
};

/** Per-research-topic static layout: static/<topicId>/{rag,sec,index.json} */
export function topicStaticDir(topicId) {
  return join(PATHS.staticRoot, topicId);
}

export function topicStaticRagDir(topicId) {
  return join(topicStaticDir(topicId), 'rag');
}

export function topicStaticSecDir(topicId, ticker) {
  return join(topicStaticDir(topicId), 'sec', ticker.toUpperCase());
}

export function topicStaticReportsDir(topicId) {
  return join(topicStaticDir(topicId), 'reports');
}

export function internationalRawDir(id) {
  return join(PATHS.rawInternational, String(id).toUpperCase());
}

export function staticSecDir(ticker) {
  return join(PATHS.staticSec, ticker.toUpperCase());
}

export function topicDir(topicId) {
  return join(PATHS.topics, topicId);
}

export function topicSupplyChainPath(topicId) {
  return join(topicDir(topicId), 'supply-chain.json');
}

export function companyRawDir(ticker) {
  return join(PATHS.rawSec, ticker.toUpperCase());
}

export function companyProcessedDir(ticker) {
  return join(PATHS.processedSec, ticker.toUpperCase());
}
