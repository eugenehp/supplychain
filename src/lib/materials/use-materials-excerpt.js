import { getContext } from 'svelte';
import { MATERIALS_EXCERPT_KEY } from './materials-excerpt-context.js';
import { effectiveSourceUrl } from './materials-source-link.js';

/** @returns {(payload: import('./materials-excerpt-context.js').MaterialsExcerptPayload) => void} */
export function useMaterialsExcerpt() {
  const open = getContext(MATERIALS_EXCERPT_KEY);
  if (!open && import.meta.env.DEV) {
    console.warn('useMaterialsExcerpt: no MaterialsExcerptHost ancestor — excerpt popups disabled');
  }
  return open;
}

/** @param {string | { text: string, charStart?: number | null, charEnd?: number | null }} snippet */
export function excerptText(snippet) {
  return typeof snippet === 'string' ? snippet : snippet?.text ?? '';
}

/**
 * @param {object} miner
 * @param {string | { text: string, charStart?: number | null, charEnd?: number | null }} snippet
 * @param {string} [symbol]
 */
export function payloadFromMinerSnippet(miner, snippet, symbol) {
  const text = excerptText(snippet);
  const ref = typeof snippet === 'string' ? { text } : snippet;
  return {
    text,
    charStart: ref.charStart ?? null,
    charEnd: ref.charEnd ?? null,
    symbol,
    sourceId: miner.sourceId ?? miner.ticker,
    ticker: miner.ticker,
    sourceRegime: miner.sourceRegime,
    title: miner.company,
    subtitle: miner.filing
      ? `${miner.filing.form ?? 'Filing'} · ${miner.filing.filingDate ?? ''}`
      : miner.role,
    filingUrl: miner.filingUrl ?? null,
  };
}

/**
 * @param {object} report
 * @param {{ text: string, charStart?: number | null, charEnd?: number | null, symbol?: string | null, sourceId?: string }} excerpt
 */
export function payloadFromReportExcerpt(report, excerpt) {
  return {
    text: excerpt.text,
    charStart: excerpt.charStart ?? null,
    charEnd: excerpt.charEnd ?? null,
    symbol: excerpt.symbol ?? undefined,
    sourceId: excerpt.sourceId ?? report.id,
    ticker: report.id,
    sourceRegime: report.id?.startsWith('EU-') ? 'EU' : 'PUBLIC',
    title: report.title,
    subtitle: `${report.publisher} · ${report.year}`,
    filingUrl: effectiveSourceUrl(report),
  };
}

/**
 * @param {object} chunk
 */
export function payloadFromSearchChunk(chunk) {
  return {
    text: chunk.text,
    charStart: chunk.charStart ?? null,
    charEnd: chunk.charEnd ?? null,
    symbol: chunk.symbol ?? undefined,
    sourceId: chunk.sourceId ?? null,
    ticker: chunk.ticker ?? null,
    sourceRegime: chunk.sourceRegime ?? (chunk.sourceType === 'sec' ? 'US-SEC' : null),
    title: chunk.company ?? chunk.ticker ?? 'Materials excerpt',
    subtitle: [chunk.form, chunk.filingDate].filter(Boolean).join(' · ') || chunk.sourceType,
    filingUrl: chunk.filingUrl ?? null,
  };
}
