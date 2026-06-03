import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { companyRawDir } from '../paths.mjs';
import { htmlToText } from '../filing-processor.mjs';
import { loadInternationalFiling } from './international/fetch-filing.mjs';
import { loadPublicReport } from './public-reports/fetch-report.mjs';

function cleanFilingText(text) {
  const markers = [
    /UNITED STATES\s+SECURITIES AND EXCHANGE COMMISSION/i,
    /Item\s+1\.\s*Business/i,
    /ITEM\s+1[\.\s\-–—]+BUSINESS/i,
    /FORM\s+10-K/i,
  ];
  for (const m of markers) {
    const idx = text.search(m);
    if (idx >= 0 && idx < 80000) return text.slice(idx).trim();
  }
  return text.trim();
}

/** @param {object} row */
export function loadSourceTextForRow(row) {
  if (!row?.id) return null;

  if (row.sourceRegime === 'US-SEC') {
    const htmlPath = join(companyRawDir(row.ticker ?? row.id), 'filing.html');
    if (!existsSync(htmlPath)) return null;
    return cleanFilingText(htmlToText(readFileSync(htmlPath, 'utf8')));
  }

  if (['PUBLIC', 'EU'].includes(row.sourceRegime)) {
    const loaded = loadPublicReport(row.id);
    return loaded?.text ?? null;
  }

  const intl = loadInternationalFiling(row.id);
  return intl?.text ?? null;
}

/** @param {object[]} filingRows */
export function buildSourceTextCache(filingRows) {
  /** @type {Map<string, string>} */
  const cache = new Map();
  for (const row of filingRows) {
    const text = loadSourceTextForRow(row);
    if (text && text.length > 500) cache.set(row.id, text);
  }
  return cache;
}
