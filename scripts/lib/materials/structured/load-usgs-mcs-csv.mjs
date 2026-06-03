import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { PATHS } from '../../paths.mjs';
import { countryNameToCode } from './country-codes.mjs';
import { countryMeta } from '../geo-resolve.mjs';

const SALIENT_CSV_URL =
  'https://www.sciencebase.gov/catalog/file/get/6798f088d34ea8c18376e7f9?f=__disk__c7%2F24%2F3d%2Fc7243d9afda5c9aaa0572385e622d42a0e8c5c14';
const WORLD_CSV = join(PATHS.materialsStructured, 'usgs-mcs-2025-world-production.csv');
const SALIENT_CACHE = join(PATHS.materialsStructured, 'usgs-mcs-2025-salient.csv');
const WORLD_JSON = join(PATHS.materialsStructured, 'usgs-mcs-2025-production.json');

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQ = !inQ;
      continue;
    }
    if (ch === ',' && !inQ) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function parseNum(s) {
  if (!s || /^[—–-]$/.test(String(s).trim()) || /^[<>]/.test(String(s).trim())) return null;
  const n = parseInt(String(s).replace(/,/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

/** @param {string} csv */
export function parseUsgsSalientCsv(csv) {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { rows: [] };
  const header = parseCsvLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const row = Object.fromEntries(header.map((h, j) => [h, cols[j] ?? '']));
    rows.push({
      year: parseInt(row.Year, 10),
      usProductionConcentrateMt: parseNum(row.USprod_Concentrate_t),
      usProductionCompoundsMt: parseNum(row['USprod_Compounds-Metals_t']),
      importsCompoundsMt: parseNum(row.Imports_Compounds_t),
      exportsOresMt: parseNum(row['Exports_Ores-Compounds_t']),
      consumptionMt: parseNum(row['Consump_Compounds-Metals_t']),
      netImportReliance: row['NIR_Compounds-Metals_t'] ?? null,
      employment: parseNum(row.Employment_),
      prices: {
        CeO2: parseNum(row.Price_CeO2_dkg),
        Dy2O3: parseNum(row.Price_Dy2O3_dkg),
        Nd2O3: parseNum(row.Price_Nd2O3_dkg),
        TbO2: parseNum(row.Price_TbO2_dkg),
      },
    });
  }
  return { rows, source: 'USGS MCS 2025 salient CSV', unit: 'metric tons REO equivalent' };
}

/** @param {string} csv */
export function parseUsgsWorldProductionCsv(csv) {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { countries: [], worldTotal: null };

  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const countries = [];
  let worldTotal = { production2023Mt: 0, production2024Mt: 0 };

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const row = Object.fromEntries(header.map((h, j) => [h, cols[j] ?? '']));
    const name = row.country?.trim();
    if (!name || /^other$/i.test(name)) continue;

    const countryCode = row.country_code?.trim() || countryNameToCode(name);
    const p23 = parseNum(row.production_2023_mt);
    const p24 = parseNum(row.production_2024_mt);
    const reserves = parseNum(row.reserves_mt);

    if (p24 != null) worldTotal.production2024Mt += p24;
    if (p23 != null) worldTotal.production2023Mt += p23;

    countries.push({
      name,
      countryCode,
      production2023Mt: p23,
      production2024Mt: p24,
      reservesMt: reserves,
    });
  }

  return {
    year: 2025,
    source: 'USGS MCS 2025 world production CSV',
    unit: 'metric tons REO equivalent',
    countries,
    worldTotal,
  };
}

export async function downloadUsgsSalientCsv({ force = false } = {}) {
  mkdirSync(PATHS.materialsStructured, { recursive: true });
  if (!force && existsSync(SALIENT_CACHE) && readFileSync(SALIENT_CACHE, 'utf8').length > 100) {
    return readFileSync(SALIENT_CACHE, 'utf8');
  }
  const res = await fetch(SALIENT_CSV_URL, {
    headers: { 'User-Agent': 'SupplyChainResearch/1.0' },
  });
  if (!res.ok) throw new Error(`USGS salient CSV download failed: ${res.status}`);
  const csv = await res.text();
  writeFileSync(SALIENT_CACHE, csv);
  return csv;
}

export async function loadUsgsMcsStructured({ forceCsv = false } = {}) {
  let salient = { rows: [] };
  try {
    const csv = await downloadUsgsSalientCsv({ force: forceCsv });
    salient = parseUsgsSalientCsv(csv);
  } catch {
    if (existsSync(SALIENT_CACHE)) {
      salient = parseUsgsSalientCsv(readFileSync(SALIENT_CACHE, 'utf8'));
    }
  }

  let world = { countries: [], worldTotal: null };
  if (existsSync(WORLD_CSV)) {
    world = parseUsgsWorldProductionCsv(readFileSync(WORLD_CSV, 'utf8'));
  } else if (existsSync(WORLD_JSON)) {
    world = JSON.parse(readFileSync(WORLD_JSON, 'utf8'));
  }

  const countries = world.countries
    .filter((c) => c.countryCode)
    .map((c) => ({
      ...c,
      ...countryMeta(c.countryCode),
      unit: world.unit ?? 'metric tons REO equivalent',
    }));

  return {
    year: world.year ?? 2025,
    source: 'USGS Mineral Commodity Summaries 2025 (CSV + structured tables)',
    sourceUrls: {
      salientCsv: SALIENT_CSV_URL,
      worldCsv: WORLD_CSV,
    },
    unit: world.unit ?? 'metric tons REO equivalent',
    countries,
    worldTotal: world.worldTotal,
    usSalient: salient,
    parsedAt: new Date().toISOString(),
  };
}
