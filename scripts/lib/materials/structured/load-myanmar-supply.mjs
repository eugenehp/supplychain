import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PATHS } from '../../paths.mjs';
import { countryMeta } from '../geo-resolve.mjs';

/** Curated Myanmar ionic-clay REE supply context (USGS/IEA/public sources). */
export function loadMyanmarSupplyContext() {
  const path = join(PATHS.materialsStructured, 'myanmar-ree-supply.json');
  if (!existsSync(path)) return defaultMyanmar();
  return JSON.parse(readFileSync(path, 'utf8'));
}

function defaultMyanmar() {
  return {
    version: 1,
    source: 'USGS MCS + IEA GCMO + trade estimates',
    methodology:
      'Myanmar ion-adsorption clay heavy REE (Dy/Tb) feedstock to southern China separation. Not issuer filings — structured from public commodity reports.',
    countryCode: 'MM',
    countryName: 'Myanmar',
    role: 'Heavy REE clay feedstock (informal cross-border trade)',
    elements: ['Dy', 'Tb', 'Y', 'Gd'],
    estimatedShareOfHeavyRee: 'Significant share of global heavy REE feedstock per IEA/USGS (exact % disputed)',
    risks: ['Conflict zones in Kachin/Shan', 'Chinese border processing dependence', 'Sanctions and governance'],
    sites: [
      { name: 'Kachin State ionic-clay districts', status: 'operating', elements: ['Dy', 'Tb', 'Y'] },
      { name: 'Shan State clay deposits', status: 'operating', elements: ['Dy', 'Tb'] },
    ],
  };
}

export function buildMyanmarSupplyGeography(data) {
  const meta = countryMeta(data.countryCode ?? 'MM');
  return {
    ...data,
    ...meta,
    dataLayer: 'Myanmar-REE-curated',
    summary: {
      siteCount: data.sites?.length ?? 0,
      elementCount: data.elements?.length ?? 0,
    },
  };
}
