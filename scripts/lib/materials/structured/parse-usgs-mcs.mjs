import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PATHS } from '../../paths.mjs';
import { countryNameToCode } from './country-codes.mjs';
import { countryMeta } from '../geo-resolve.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CURATED_2025 = join(__dirname, '../../../../data/materials/structured/usgs-mcs-2025-production.json');

/** Parse USGS MCS rare-earths PDF text for world mine production (best-effort; prefer curated JSON). */
export function parseUsgsMcsProduction(text, { year = 2025 } = {}) {
  const idx = text.search(/World Mine Production and Reserves/i);
  if (idx < 0) return { year, countries: [], worldTotal: null, source: 'USGS MCS' };

  const slice = text.slice(idx, idx + 6000);
  const lines = slice.split(/\n+/);
  const countries = [];
  let worldTotal = null;
  let inTable = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (/^World total/i.test(line)) {
      const nums = line.match(/([\d,]+)/g);
      if (nums?.length) {
        worldTotal = {
          production2023Mt: parseProduction(nums[0]),
          production2024Mt: parseProduction(nums[1]),
        };
      }
      break;
    }
    if (/^United States|^China|^Australia|^Mine production/i.test(line)) inTable = true;
    if (!inTable) continue;

    const m = line.match(
      /^([A-Za-z][A-Za-z .,'()-]+?)\s+([\d,]+|\—|—|-)\s+([\d,]+|\—|—|-)\s*([\d,]+|\—|—|-)?/,
    );
    if (!m) continue;
    const name = m[1].trim();
    if (/Mine production|Reserves|Events|Substitutes|eEstimated/i.test(name)) continue;

    const code = countryNameToCode(name);
    if (!code) continue;

    countries.push({
      name,
      countryCode: code,
      ...countryMeta(code),
      production2023Mt: parseProduction(m[2]),
      production2024Mt: parseProduction(m[3]),
      reservesMt: m[4] ? parseProduction(m[4]) : null,
      unit: 'metric tons REO equivalent',
    });
  }

  return {
    year,
    source: 'USGS Mineral Commodity Summaries',
    unit: 'metric tons REO equivalent',
    countries,
    worldTotal,
    parsedAt: new Date().toISOString(),
  };
}

function parseProduction(s) {
  if (!s || /^[—–-]$/.test(String(s).trim())) return null;
  const n = parseInt(String(s).replace(/,/g, '').replace(/\s+/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

export function loadUsgsMcsProduction({ year = 2025 } = {}) {
  if (year === 2025 && existsSync(CURATED_2025)) {
    const raw = JSON.parse(readFileSync(CURATED_2025, 'utf8'));
    return {
      ...raw,
      countries: raw.countries
        .filter((c) => c.countryCode)
        .map((c) => ({
          ...c,
          ...countryMeta(c.countryCode),
          unit: raw.unit,
        })),
      parsedAt: new Date().toISOString(),
    };
  }

  const reportId = year >= 2025 ? 'USGS-MCS-2025-REE' : 'USGS-MCS-2024-REE';
  const textPath = join(PATHS.rawPublicReports, reportId, 'report.txt');
  if (!existsSync(textPath)) return null;
  return parseUsgsMcsProduction(readFileSync(textPath, 'utf8'), { year });
}

export function buildProductionGeography(mcsProduction) {
  if (!mcsProduction?.countries?.length) {
    return { byCountry: [], methodology: 'USGS MCS production data not available.' };
  }

  const total2024 =
    mcsProduction.worldTotal?.production2024Mt ??
    mcsProduction.countries.reduce((s, c) => s + (c.production2024Mt ?? 0), 0);

  const byCountry = mcsProduction.countries
    .filter((c) => c.production2024Mt != null && c.countryCode)
    .map((c) => ({
      ...countryMeta(c.countryCode),
      productionMt: c.production2024Mt,
      production2023Mt: c.production2023Mt,
      reservesMt: c.reservesMt,
      share: total2024 ? Math.round((c.production2024Mt / total2024) * 1000) / 10 : null,
      unit: mcsProduction.unit,
      dataSource: `USGS MCS ${mcsProduction.year}`,
    }))
    .sort((a, b) => (b.productionMt ?? 0) - (a.productionMt ?? 0));

  return {
    year: mcsProduction.year,
    worldTotalMt: total2024,
    unit: mcsProduction.unit,
    byCountry,
    methodology:
      'Country shares from USGS MCS world mine production (REO metric tons). Distinct from SEC excerpt co-occurrence geography.',
  };
}
