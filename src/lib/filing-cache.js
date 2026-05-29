/** In-memory cache for SEC filing bundles loaded from static assets. */

import { measureAsync } from './performance.js';

/** @typedef {{
 *   meta: object | null,
 *   text: string,
 *   sections: object[],
 *   evidence: object[],
 *   display: object | null
 * }} FilingBundle */

/** @type {Map<string, Promise<FilingBundle>>} */
const pending = new Map();

/** @type {Map<string, FilingBundle>} */
const cache = new Map();

function shellReady(shell) {
  return Boolean(shell?.display?.sectionBlocks || shell?.text);
}

/**
 * @param {string} ticker
 * @returns {Promise<FilingBundle>}
 */
export async function loadFilingBundle(ticker) {
  if (!ticker) throw new Error('Ticker required');
  const cached = cache.get(ticker);
  if (cached && shellReady(cached)) return cached;

  let request = pending.get(ticker);
  if (!request) {
    request = fetchFilingBundle(ticker).finally(() => pending.delete(ticker));
    pending.set(ticker, request);
  }
  return request;
}

/**
 * Load metadata, sections, evidence, and precomputed display first — filing text when required.
 * @param {string} ticker
 * @param {{ onText?: (text: string) => void, requireText?: boolean }} [opts]
 */
export async function loadFilingProgressive(ticker, opts = {}) {
  if (!ticker) throw new Error('Ticker required');

  const { requireText = false, onText } = opts;
  let shell = cache.get(ticker);
  if (!shell) {
    shell = await fetchFilingShell(ticker);
  }

  const mustLoadText = requireText || !shellReady(shell);
  if (mustLoadText && !shell.text) {
    shell.text = await measureAsync(`filing:text:${ticker}`, () => fetchFilingText(ticker));
    cache.set(ticker, shell);
    onText?.(shell.text);
  }

  return shell;
}

/** @param {string} ticker */
export function peekFilingBundle(ticker) {
  return cache.get(ticker) ?? null;
}

/** @param {string} ticker */
export function prefetchFiling(ticker) {
  if (!ticker || pending.has(ticker)) return;
  const cached = cache.get(ticker);
  if (cached && shellReady(cached)) return;
  void loadFilingProgressive(ticker);
}

/**
 * @param {string} ticker
 */
async function fetchFilingShell(ticker) {
  return measureAsync(`filing:shell:${ticker}`, async () => {
    const base = `/sec/${ticker}`;
    const [metaRes, sectionsRes, evidenceRes, displayRes] = await Promise.all([
      fetch(`${base}/metadata.json`),
      fetch(`${base}/sections.json`),
      fetch(`${base}/evidence.json`),
      fetch(`${base}/display.json`),
    ]);

    const shell = {
      meta: metaRes.ok ? await metaRes.json() : null,
      text: '',
      sections: sectionsRes.ok ? await sectionsRes.json() : [],
      evidence: evidenceRes.ok ? (await evidenceRes.json()).entries ?? [] : [],
      display: displayRes.ok ? await displayRes.json() : null,
    };
    cache.set(ticker, shell);
    return shell;
  });
}

/**
 * @param {string} ticker
 */
async function fetchFilingText(ticker) {
  const res = await fetch(`/sec/${ticker}/filing.txt`);
  if (!res.ok) throw new Error(`Could not load filing for ${ticker}`);
  return res.text();
}

/**
 * @param {string} ticker
 */
async function fetchFilingBundle(ticker) {
  const shell = await fetchFilingShell(ticker);
  if (shellReady(shell)) return shell;
  shell.text = await fetchFilingText(ticker);
  cache.set(ticker, shell);
  return shell;
}
