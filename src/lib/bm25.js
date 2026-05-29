/** Okapi BM25 lexical ranking for evidence search */

const STOP = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our',
  'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two',
  'who', 'way', 'use', 'her', 'she', 'that', 'this', 'with', 'from', 'have', 'been', 'will', 'also',
  'than', 'then', 'into', 'such', 'other', 'their', 'which', 'would', 'about', 'there', 'these',
  'when', 'what', 'some', 'them', 'they', 'were', 'each', 'more', 'most', 'over', 'under', 'after',
]);

/** Expand short acronyms to related terms for BM25 recall */
export const ACRONYM_SYNONYMS = {
  gan: ['gallium', 'nitride'],
  sic: ['silicon', 'carbide'],
  soi: ['insulator'],
  hbm: ['bandwidth', 'memory'],
  euv: ['extreme', 'ultraviolet', 'lithography'],
  dram: ['memory'],
  nand: ['flash'],
  mems: ['micro'],
  epi: ['epitaxial'],
};

function extractTechnicalTokens(text) {
  const tokens = [];
  for (const m of text.matchAll(/["'\u201c\u201d(]([A-Za-z0-9]{2,10})["'\u201d)]/g)) {
    tokens.push(m[1].toLowerCase());
  }
  for (const m of text.matchAll(/\b([A-Z][a-z0-9]*(?:[A-Z][a-z0-9]*)+)\b/g)) {
    tokens.push(m[1].toLowerCase());
  }
  for (const m of text.matchAll(/\b([A-Z]{2,8})\b/g)) {
    tokens.push(m[1].toLowerCase());
  }
  return tokens;
}

export function tokenize(text) {
  if (!text) return [];
  const tokens = extractTechnicalTokens(text);
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ');
  for (const w of normalized.split(/\s+/)) {
    const clean = w.replace(/-/g, '');
    if (clean.length >= 2 && !STOP.has(clean)) tokens.push(clean);
  }
  return [...new Set(tokens)];
}

export function expandQueryTerms(query) {
  const terms = [...new Set(tokenize(query))];
  const expanded = [...terms];
  for (const term of terms) {
    const synonyms = ACRONYM_SYNONYMS[term];
    if (synonyms) expanded.push(...synonyms);
  }
  return [...new Set(expanded)];
}

export class Bm25Index {
  constructor({ k1 = 1.2, b = 0.75 } = {}) {
    this.k1 = k1;
    this.b = b;
    /** @type {{ id: string, tf: Map<string, number>, length: number }[]} */
    this.docs = [];
    this.df = new Map();
    this.N = 0;
    this.avgdl = 1;
  }

  add(id, text) {
    const tokens = tokenize(text);
    const tf = new Map();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);

    this.docs.push({ id, tf, length: tokens.length });
    this.N += 1;
    for (const t of tf.keys()) this.df.set(t, (this.df.get(t) ?? 0) + 1);
  }

  finalize() {
    if (!this.N) {
      this.avgdl = 1;
      return;
    }
    this.avgdl = this.docs.reduce((s, d) => s + d.length, 0) / this.N;
  }

  scoreQuery(query) {
    const qTerms = expandQueryTerms(query);
    if (!qTerms.length || !this.N) return new Map();

    const scores = new Map();
    for (const doc of this.docs) {
      let score = 0;
      for (const term of qTerms) {
        const tf = doc.tf.get(term) ?? 0;
        if (!tf) continue;
        const df = this.df.get(term) ?? 0;
        const idf = Math.log(1 + (this.N - df + 0.5) / (df + 0.5));
        const denom = tf + this.k1 * (1 - this.b + this.b * (doc.length / this.avgdl));
        score += idf * ((tf * (this.k1 + 1)) / denom);
      }
      if (score > 0) scores.set(doc.id, score);
    }
    return scores;
  }
}

export function buildEvidenceBm25Index(entries) {
  const index = new Bm25Index();
  for (const entry of entries) {
    if (!entry?.id) continue;
    const text = [entry.excerpt, entry.vendor, entry.sectionHeader, entry.ticker].filter(Boolean).join(' ');
    index.add(entry.id, text);
  }
  index.finalize();
  return index;
}

export function rankEvidenceByBm25(index, query, entries, { minScore = 0.1, limit = 400 } = {}) {
  if (!query?.trim() || !index?.N) return null;

  const scores = index.scoreQuery(query);
  const ranked = entries
    .map((entry) => ({ entry, score: scores.get(entry.id) ?? 0 }))
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (!ranked.length) return [];
  const maxScore = ranked[0].score;
  return ranked.map((r) => ({ ...r, maxScore }));
}
