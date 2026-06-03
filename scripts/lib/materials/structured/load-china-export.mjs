import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PATHS } from '../../paths.mjs';

export function loadChinaExportControls() {
  const path = join(PATHS.materialsStructured, 'china-export-controls.json');
  if (!existsSync(path)) return { events: [], methodology: '' };
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function buildChinaPolicyGeography(data) {
  return {
    dataLayer: 'China-MOFCOM-curated',
    methodology:
      data.methodology ??
      'Curated MOFCOM/MIIT quota and export-control milestones. See linked USGS MCS and MOFCOM sources.',
    sourceUrl: 'https://www.mofcom.gov.cn/',
    events: data.events ?? [],
    summary: { eventCount: data.events?.length ?? 0 },
  };
}
