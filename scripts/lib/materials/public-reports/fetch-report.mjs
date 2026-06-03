import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { PATHS } from '../../paths.mjs';
import { PUBLIC_REPORTS } from './registry.mjs';
import { fetchBestSourceText } from '../parse-source.mjs';
import { resolvePublicLinkUrl } from '../source-link.mjs';

const MIN_USEFUL_TEXT = 2000;

function publicReportDir(id) {
  return join(PATHS.rawPublicReports, String(id));
}

/**
 * @param {import('./registry.mjs').PublicReport} report
 * @param {{ force?: boolean }} [opts]
 */
export async function fetchPublicReport(report, { force = false } = {}) {
  const dir = publicReportDir(report.id);
  mkdirSync(dir, { recursive: true });
  const textPath = join(dir, 'report.txt');
  const metaPath = join(dir, 'metadata.json');

  if (!force && existsSync(textPath) && readFileSync(textPath, 'utf8').length > MIN_USEFUL_TEXT) {
    const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
    return { ...meta, cached: true };
  }

  const base = {
    id: report.id,
    title: report.title,
    publisher: report.publisher,
    year: report.year,
    topics: report.topics,
    scrapedAt: new Date().toISOString(),
    sourceUrl: null,
    sourceType: null,
    textLength: 0,
    error: null,
  };

  const regime = report.id.startsWith('EU-') ? 'EU' : 'OTHER';
  const best = await fetchBestSourceText(report.filingSources ?? [], {
    regime,
    dir,
    textBasename: 'report',
    minUsefulText: MIN_USEFUL_TEXT,
    maxHtmlDepth: 1,
  });

  const sources = report.filingSources ?? [];
  const final = {
    ...base,
    ...best,
    publicUrl: resolvePublicLinkUrl(best.sourceUrl, sources),
  };
  writeFileSync(metaPath, JSON.stringify(final, null, 2));
  return final;
}

export function loadPublicReport(id) {
  const dir = publicReportDir(id);
  const textPath = join(dir, 'report.txt');
  const metaPath = join(dir, 'metadata.json');
  if (!existsSync(textPath)) return null;
  return {
    text: readFileSync(textPath, 'utf8'),
    meta: existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, 'utf8')) : {},
    dir,
  };
}

export async function fetchAllPublicReports({ force = false } = {}) {
  const results = [];
  for (const report of PUBLIC_REPORTS) {
    console.log(`  [report] ${report.id}`);
    results.push(await fetchPublicReport(report, { force }));
  }
  mkdirSync(PATHS.rawPublicReports, { recursive: true });
  writeFileSync(
    join(PATHS.rawPublicReports, 'manifest.json'),
    JSON.stringify({ scrapedAt: new Date().toISOString(), reports: results }, null, 2),
  );
  return results;
}
