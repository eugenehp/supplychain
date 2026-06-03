import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { STATIC_MATERIALS_RARE_EARTH } from './build-rare-earth-index.mjs';

/**
 * Export plain-text sources for international + public reports (SEC uses /sec/ viewer).
 *
 * @param {Map<string, string>} textCache
 * @param {object[]} filingRows
 */
export function exportMaterialsSources(textCache, filingRows) {
  const outDir = join(STATIC_MATERIALS_RARE_EARTH, 'sources');
  mkdirSync(outDir, { recursive: true });

  /** @type {object[]} */
  const sources = [];

  for (const row of filingRows) {
    if (row.sourceRegime === 'US-SEC') continue;
    const text = textCache.get(row.id);
    if (!text || text.length < 500) continue;

    const payload = {
      id: row.id,
      title: row.companyName,
      sourceRegime: row.sourceRegime,
      filingUrl: row.filingUrl ?? null,
      textLength: text.length,
      text,
    };

    writeFileSync(join(outDir, `${row.id}.json`), JSON.stringify(payload));
    sources.push({
      id: row.id,
      title: row.companyName,
      sourceRegime: row.sourceRegime,
      filingUrl: row.filingUrl ?? null,
      textLength: text.length,
    });
  }

  writeFileSync(
    join(outDir, 'manifest.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), sources }, null, 2),
  );

  return sources;
}
