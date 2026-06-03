/**
 * Public companies with SEC filings that mine or process rare earth elements.
 */

/** @typedef {{
 *   ticker: string,
 *   name: string,
 *   countryCode: string,
 *   countryName: string,
 *   flag: string,
 *   role: 'miner' | 'processor' | 'developer',
 *   primaryElements: string[],
 *   flagshipSites: string[],
 * }} RareEarthMiner */

/** @type {RareEarthMiner[]} */
export const RARE_EARTH_MINERS = [
  {
    ticker: 'MP',
    name: 'MP Materials',
    countryCode: 'US',
    countryName: 'United States',
    flag: '🇺🇸',
    role: 'miner',
    primaryElements: ['Nd', 'Pr', 'Ce', 'La'],
    flagshipSites: ['Mountain Pass, California'],
  },
  {
    ticker: 'UUUU',
    name: 'Energy Fuels',
    countryCode: 'US',
    countryName: 'United States',
    flag: '🇺🇸',
    role: 'processor',
    primaryElements: ['Nd', 'Pr', 'Dy', 'Tb', 'La', 'Ce'],
    flagshipSites: ['White Mesa Mill, Utah'],
  },
  {
    ticker: 'USAR',
    name: 'USA Rare Earth',
    countryCode: 'US',
    countryName: 'United States',
    flag: '🇺🇸',
    role: 'developer',
    primaryElements: ['Nd', 'Pr', 'Dy', 'Tb', 'Sm'],
    flagshipSites: ['Round Top, Texas', 'Stillwater, Oklahoma'],
  },
  {
    ticker: 'REEMF',
    name: 'Rare Element Resources',
    countryCode: 'US',
    countryName: 'United States',
    flag: '🇺🇸',
    role: 'developer',
    primaryElements: ['Nd', 'Pr', 'Dy', 'Tb'],
    flagshipSites: ['Bear Lodge, Wyoming'],
  },
  {
    ticker: 'TMRC',
    name: 'Texas Mineral Resources',
    countryCode: 'US',
    countryName: 'United States',
    flag: '🇺🇸',
    role: 'developer',
    primaryElements: ['Nd', 'Pr', 'Dy', 'Tb', 'Y'],
    flagshipSites: ['Round Top, Texas'],
  },
  {
    ticker: 'AREC',
    name: 'American Resources',
    countryCode: 'US',
    countryName: 'United States',
    flag: '🇺🇸',
    role: 'developer',
    primaryElements: ['Nd', 'Pr', 'Dy', 'Tb'],
    flagshipSites: ['ReElement Technologies'],
  },
];

/** Tickers scraped and indexed for the rare-earth materials pipeline stage. */
export function rareEarthSecWatchlist() {
  return RARE_EARTH_MINERS.map((m) => m.ticker);
}

export const MINER_BY_TICKER = Object.fromEntries(RARE_EARTH_MINERS.map((m) => [m.ticker, m]));
