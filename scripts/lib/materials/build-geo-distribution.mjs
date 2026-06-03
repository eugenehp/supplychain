import { RARE_EARTH_ELEMENTS } from './rare-earth-elements.mjs';
import { MINER_BY_TICKER } from './rare-earth-miners.mjs';
import { countCountriesInText, mergeCountryCounts, countryMeta } from './geo-resolve.mjs';

const REE_SYMBOLS = RARE_EARTH_ELEMENTS.map((e) => e.symbol);

/**
 * Co-occurrence: countries mentioned in the same SEC excerpt window as an element.
 * @param {object[]} filingRows
 */
export function collectElementCountryPairs(filingRows) {
  /** @type {Map<string, Map<string, number>>} */
  const pairCounts = new Map();
  /** @type {Map<string, Map<string, Set<string>>>} */
  const pairTickers = new Map();

  for (const sym of REE_SYMBOLS) {
    pairCounts.set(sym, new Map());
    pairTickers.set(sym, new Map());
  }

  for (const row of filingRows) {
    for (const [symbol, hit] of Object.entries(row.elementHits ?? {})) {
      if (!pairCounts.has(symbol)) continue;

      const texts = [];
      for (const snip of hit.snippets ?? []) texts.push(snip);
      if (hit.wideSnippets) texts.push(...hit.wideSnippets);

      const perMention = countCountriesInText(texts.join(' '));
      const miner = MINER_BY_TICKER[row.ticker];
      if (miner?.countryCode && perMention.size === 0 && (hit.mentionCount ?? 0) > 0) {
        perMention.set(miner.countryCode, 1);
      }

      const symMap = pairCounts.get(symbol);
      const tickMap = pairTickers.get(symbol);

      for (const [code, n] of perMention) {
        symMap.set(code, (symMap.get(code) ?? 0) + n);
        if (!tickMap.has(code)) tickMap.set(code, new Set());
        tickMap.get(code).add(row.ticker ?? row.id);
      }
    }
  }

  return { pairCounts, pairTickers };
}

/**
 * @param {object[]} filingRows
 * @param {object[]} elements — built element profiles
 */
export function buildGeoDistribution(filingRows, elements) {
  const { pairCounts, pairTickers } = collectElementCountryPairs(filingRows);

  /** @type {Map<string, number>} */
  const countryTotals = new Map();

  for (const sym of REE_SYMBOLS) {
    for (const [code, n] of pairCounts.get(sym) ?? []) {
      countryTotals.set(code, (countryTotals.get(code) ?? 0) + n);
    }
  }

  const byElement = elements
    .filter((e) => e.mentionCount > 0)
    .map((el) => {
      const symMap = pairCounts.get(el.symbol) ?? new Map();
      const tickMap = pairTickers.get(el.symbol) ?? new Map();
      const elTotal = [...symMap.values()].reduce((s, n) => s + n, 0) || 1;

      const countries = [...symMap.entries()]
        .map(([code, mentions]) => ({
          ...countryMeta(code),
          mentions,
          share: Math.round((mentions / elTotal) * 1000) / 10,
          tickers: [...(tickMap.get(code) ?? [])].sort(),
        }))
        .sort((a, b) => b.mentions - a.mentions);

      return {
        symbol: el.symbol,
        name: el.name,
        atomicNumber: el.atomicNumber,
        category: el.category,
        mentionCount: el.mentionCount,
        geoHits: elTotal,
        countries,
      };
    })
    .sort((a, b) => b.geoHits - a.geoHits);

  const byCountry = [...countryTotals.entries()]
    .map(([code, total]) => {
      const elementsForCountry = REE_SYMBOLS.map((sym) => {
        const mentions = pairCounts.get(sym)?.get(code) ?? 0;
        if (!mentions) return null;
        const el = elements.find((e) => e.symbol === sym);
        return {
          symbol: sym,
          name: el?.name ?? sym,
          atomicNumber: el?.atomicNumber,
          category: el?.category,
          mentions,
          share: Math.round((mentions / total) * 1000) / 10,
          tickers: [...(pairTickers.get(sym)?.get(code) ?? [])].sort(),
        };
      }).filter(Boolean);

      elementsForCountry.sort((a, b) => b.mentions - a.mentions);

      return {
        ...countryMeta(code),
        geoHits: total,
        elementCount: elementsForCountry.length,
        elements: elementsForCountry,
      };
    })
    .sort((a, b) => b.geoHits - a.geoHits);

  const countryCodes = byCountry.map((c) => c.code);
  const elementSymbols = byElement.map((e) => e.symbol);

  const matrix = elementSymbols.map((sym) =>
    countryCodes.map((code) => pairCounts.get(sym)?.get(code) ?? 0),
  );

  return {
    methodology:
      'Country shares are derived from co-occurrence of geography tokens in SEC excerpt windows where each element is named. Miner HQ is used only when no country appears in those excerpts.',
    byElement,
    byCountry,
    matrix: {
      elements: elementSymbols,
      countries: countryCodes,
      values: matrix,
    },
    summary: {
      countriesIndexed: byCountry.length,
      elementsWithGeo: byElement.filter((e) => e.countries.length > 0).length,
    },
  };
}
