/** Client-side MiniSearch over materials filing excerpts (pipeline → static/materials/rare-earth). */

import MiniSearch from 'minisearch';

let corpus = /** @type {object | null} */ (null);
let mini = /** @type {MiniSearch | null} */ (null);
let inflight = /** @type {Promise<object | null> | null} */ (null);

export async function loadMaterialsSearchIndex() {
  if (corpus) return corpus;
  if (inflight) return inflight;

  inflight = fetch('/materials/rare-earth/search-index.json')
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      corpus = data;
      if (data?.chunks?.length) {
        mini = new MiniSearch({
          fields: ['text', 'symbol', 'company', 'ticker', 'sourceType'],
          storeFields: [
            'text',
            'symbol',
            'ticker',
            'company',
            'sourceType',
            'sourceRegime',
            'sourceId',
            'charStart',
            'charEnd',
            'filingUrl',
            'form',
            'filingDate',
          ],
          searchOptions: {
            boost: { symbol: 3, ticker: 2, company: 1.5 },
            fuzzy: 0.15,
            prefix: true,
          },
        });
        mini.addAll(data.chunks);
      }
      inflight = null;
      return data;
    })
    .catch(() => {
      inflight = null;
      return null;
    });

  return inflight;
}

/**
 * @param {string} query
 * @param {{
 *   symbol?: string | null,
 *   industry?: string | null,
 *   sourceType?: string | null,
 *   ticker?: string | null,
 *   limit?: number,
 *   elements?: object[],
 * }} [opts]
 */
export function searchMaterialsCorpus(query, opts = {}) {
  const { symbol, industry, sourceType, ticker, limit = 16, elements = [] } = opts;
  if (!query?.trim() || !mini || !corpus) return [];

  let industrySymbols = null;
  if (industry && elements.length) {
    industrySymbols = new Set(
      elements.filter((el) => el.industries?.includes(industry)).map((el) => el.symbol),
    );
  }

  const raw = mini.search(query.trim(), { combineWith: 'AND' });
  const filtered = raw.filter((hit) => {
    if (symbol && hit.symbol !== symbol) return false;
    if (industrySymbols && hit.symbol && !industrySymbols.has(hit.symbol)) return false;
    if (sourceType && hit.sourceType !== sourceType) return false;
    if (ticker && hit.ticker !== ticker) return false;
    return true;
  });

  return filtered.slice(0, limit).map((hit) => ({
    ...hit,
    id: hit.id,
    score: hit.score,
    _source: 'materials',
  }));
}

export function highlightMatch(text, query) {
  if (!text || !query?.trim()) return text;
  const terms = query
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 2);
  if (!terms.length) return text;
  const pattern = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  return text.replace(pattern, '<mark>$1</mark>');
}
