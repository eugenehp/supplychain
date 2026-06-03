import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fetchUrlBytes, hasPdftotext, pdfToText } from './fetch-document.mjs';
import { parseInternationalFiling } from './international/parse-regime.mjs';
import { isPdfBytes, extractHtmlDocumentText, expandHtmlSources, isUsableExtract } from './html-resolve.mjs';
import { htmlToText } from '../filing-processor.mjs';

/**
 * @typedef {{
 *   type?: 'pdf' | 'html',
 *   url: string,
 *   label?: string,
 *   referer?: string,
 * }} DocumentSource
 */

/**
 * Fetch one URL and return extracted plain text (PDF, HTML, or PDF links discovered in HTML).
 * @param {DocumentSource} source
 * @param {{ regime: string, dir: string, textBasename?: string, minUsefulText?: number, depth?: number, maxHtmlDepth?: number, _best?: Record<string, unknown> | null }} opts
 */
export async function fetchSourceToText(source, opts) {
  const {
    regime,
    dir,
    textBasename = 'document',
    minUsefulText = 3000,
    depth = 0,
    maxHtmlDepth = 1,
  } = opts;

  const textPath = join(dir, `${textBasename}.txt`);
  const buf = await fetchUrlBytes(source.url, { referer: source.referer });

  if (isPdfBytes(buf)) {
    return parsePdfBuffer(buf, {
      regime,
      dir,
      textPath,
      textBasename,
      sourceUrl: source.url,
      sourceLabel: source.label,
    });
  }

  const html = buf.toString('utf8');
  writeFileSync(join(dir, `${textBasename}.html`), html);

  if (depth < maxHtmlDepth) {
    const derived = expandHtmlSources(html, source.url);
    for (const link of derived.filter((d) => d.type === 'pdf').slice(0, 4)) {
      try {
        const nested = await fetchSourceToText(
          { ...link, referer: source.url },
          { ...opts, depth: depth + 1, maxHtmlDepth },
        );
        if (isUsableExtract(nested, minUsefulText)) {
          return { ...nested, derivedFrom: source.url };
        }
        if (isUsableExtract(nested) && (!opts._best || nested.textLength > opts._best.textLength)) {
          opts._best = nested;
        }
      } catch {
        /* try next PDF link */
      }
    }
  }

  const rawText = extractHtmlDocumentText(html);
  const fullText = htmlToText(html);
  const bodyText = rawText.length >= fullText.length * 0.35 ? rawText : fullText;
  const parsed = parseInternationalFiling(bodyText, regime, 'text');
  writeFileSync(textPath, parsed.text);

  let best = {
    sourceUrl: source.url,
    sourceLabel: source.label ?? source.url,
    sourceType: 'html',
    textLength: parsed.text.length,
    parsed,
    error: null,
  };

  if (depth < maxHtmlDepth && parsed.text.length < minUsefulText) {
    const derived = expandHtmlSources(html, source.url);
    for (const link of derived.filter((d) => d.type === 'html' && d.url !== source.url).slice(0, 3)) {
      try {
        const nested = await fetchSourceToText(
          { ...link, referer: source.url },
          { ...opts, depth: depth + 1, maxHtmlDepth },
        );
        if (isUsableExtract(nested) && nested.textLength > best.textLength) best = nested;
        if (best.textLength >= minUsefulText) break;
      } catch {
        /* try next HTML page */
      }
    }
  }

  if (isUsableExtract(opts._best) && opts._best.textLength > best.textLength) return opts._best;
  return best;
}

/**
 * @param {Buffer} buf
 * @param {{ regime: string, dir: string, textPath: string, textBasename: string, sourceUrl: string, sourceLabel?: string }} ctx
 */
function parsePdfBuffer(buf, ctx) {
  if (!hasPdftotext()) {
    const asText = buf.toString('utf8');
    if (asText.includes('<html') || asText.includes('<!DOCTYPE')) {
      const rawText = extractHtmlDocumentText(asText);
      if (isBlockedPlaceholderText(rawText)) {
        return {
          sourceUrl: ctx.sourceUrl,
          sourceLabel: ctx.sourceLabel ?? ctx.sourceUrl,
          sourceType: 'html',
          textLength: 0,
          parsed: null,
          error: 'PDF URL returned hosting placeholder HTML',
        };
      }
      const parsed = parseInternationalFiling(rawText, ctx.regime, 'text');
      writeFileSync(ctx.textPath, parsed.text);
      return {
        sourceUrl: ctx.sourceUrl,
        sourceLabel: ctx.sourceLabel ?? ctx.sourceUrl,
        sourceType: 'html',
        textLength: parsed.text.length,
        parsed,
        error: null,
        note: 'PDF URL returned HTML; parsed as HTML (pdftotext unavailable)',
      };
    }
    return {
      sourceUrl: ctx.sourceUrl,
      sourceLabel: ctx.sourceLabel ?? ctx.sourceUrl,
      sourceType: 'pdf',
      textLength: 0,
      parsed: null,
      error: 'pdftotext not installed (brew install poppler)',
    };
  }

  const pdfPath = join(ctx.dir, `${ctx.textBasename}.pdf`);
  writeFileSync(pdfPath, buf);
  try {
    const rawText = pdfToText(pdfPath, ctx.textPath);
    const parsed = parseInternationalFiling(rawText, ctx.regime, 'pdf-text');
    writeFileSync(ctx.textPath, parsed.text);
    return {
      sourceUrl: ctx.sourceUrl,
      sourceLabel: ctx.sourceLabel ?? ctx.sourceUrl,
      sourceType: 'pdf',
      textLength: parsed.text.length,
      parsed,
      error: null,
    };
  } catch (err) {
    const asText = buf.toString('utf8');
    if (asText.includes('<html') || asText.includes('<!DOCTYPE')) {
      const rawText = extractHtmlDocumentText(asText);
      if (isBlockedPlaceholderText(rawText)) {
        return {
          sourceUrl: ctx.sourceUrl,
          sourceLabel: ctx.sourceLabel ?? ctx.sourceUrl,
          sourceType: 'html',
          textLength: 0,
          parsed: null,
          error: 'PDF URL returned hosting placeholder HTML',
        };
      }
      const parsed = parseInternationalFiling(rawText, ctx.regime, 'text');
      writeFileSync(ctx.textPath, parsed.text);
      return {
        sourceUrl: ctx.sourceUrl,
        sourceLabel: ctx.sourceLabel ?? ctx.sourceUrl,
        sourceType: 'html',
        textLength: parsed.text.length,
        parsed,
        error: null,
        note: 'PDF parse failed; body was HTML',
      };
    }
    return {
      sourceUrl: ctx.sourceUrl,
      sourceLabel: ctx.sourceLabel ?? ctx.sourceUrl,
      sourceType: 'pdf',
      textLength: 0,
      parsed: null,
      error: err.message,
    };
  }
}

/**
 * Try sources in order; keep the longest useful extract.
 * @param {DocumentSource[]} sources
 * @param {{ regime: string, dir: string, textBasename?: string, minUsefulText?: number, maxHtmlDepth?: number }} opts
 */
export async function fetchBestSourceText(sources, opts) {
  const minUsefulText = opts.minUsefulText ?? 3000;
  /** @type {Record<string, unknown> | null} */
  let best = null;

  for (const source of sources) {
    const attempt = {
      sourceUrl: source.url,
      sourceLabel: source.label ?? source.url,
      sourceType: source.type ?? null,
      textLength: 0,
      parsed: null,
      error: null,
    };
    try {
      const result = await fetchSourceToText(source, { ...opts, _best: null });
      Object.assign(attempt, result);
      if (!best || attempt.textLength > best.textLength) best = attempt;
      if (attempt.textLength >= minUsefulText) break;
    } catch (err) {
      attempt.error = err.message;
      if (!best) best = attempt;
    }
  }

  return (
    best ?? {
      sourceUrl: null,
      sourceLabel: null,
      sourceType: null,
      textLength: 0,
      parsed: null,
      error: 'No sources attempted',
    }
  );
}
