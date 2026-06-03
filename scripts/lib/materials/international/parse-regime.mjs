import { htmlToText } from '../../filing-processor.mjs';
import { REGIME_SEC_COUNTERPARTS } from './registry.mjs';

/** Per-jurisdiction markers to trim boilerplate before element extraction. */
const REGIME_START_MARKERS = {
  'US-SEC': [
    /UNITED STATES\s+SECURITIES AND EXCHANGE COMMISSION/i,
    /Item\s+1\.\s*Business/i,
    /FORM\s+10-K/i,
    /FORM\s+20-F/i,
    /FORM\s+40-F/i,
  ],
  ASX: [
    /Directors['']?\s+report/i,
    /Annual\s+report/i,
    /Operating\s+and\s+financial\s+review/i,
    /Corporations\s+Act\s+2001/i,
    /Lynas\s+Rare\s+Earths/i,
    /rare\s+earth/i,
  ],
  TSX: [/Annual\s+information\s+form/i, /Management['']?s\s+discussion\s+and\s+analysis/i, /NI\s+43-101/i],
  AIM: [/Strategic\s+report/i, /Directors['']?\s+report/i, /Annual\s+report/i],
  HKEX: [/Annual\s+report/i, /Management\s+discussion/i],
  EU: [
    /critical\s+raw\s+materials/i,
    /secure.*sustainable\s+supply/i,
    /CHAPTER\s+I/i,
    /Article\s+1/i,
  ],
  'CN-SSE': [/annual\s+report/i, /management\s+discussion/i, /稀土|rare\s+earth/i],
  'CN-SZSE': [/annual\s+report/i, /management\s+discussion/i, /稀土|rare\s+earth/i],
  OTHER: [/annual\s+report/i, /business\s+overview/i, /investor\s+cent(?:er|re)/i, /rare\s+earth/i],
};

/**
 * @param {string} raw — HTML or plain text
 * @param {string} regime
 * @param {'html' | 'text' | 'pdf-text'} inputType
 */
export function parseInternationalFiling(raw, regime, inputType = 'text') {
  let text = inputType === 'html' ? htmlToText(raw) : raw;
  text = cleanRegimeText(text, regime);
  const counterpart = REGIME_SEC_COUNTERPARTS[regime] ?? REGIME_SEC_COUNTERPARTS.OTHER;

  return {
    text,
    textLength: text.length,
    regime,
    secCounterpart: counterpart.form,
    secCounterpartNote: counterpart.note,
    parsedAt: new Date().toISOString(),
  };
}

/** @param {string} text @param {string} regime */
export function cleanRegimeText(text, regime) {
  const markers = REGIME_START_MARKERS[regime] ?? REGIME_START_MARKERS.OTHER;
  for (const m of markers) {
    const idx = text.search(m);
    if (idx >= 0 && idx < 120000) return text.slice(idx).trim();
  }
  return text.trim();
}
