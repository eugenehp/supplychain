import {
  writeFileSync,
  readFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { PATHS } from '../../paths.mjs';
import { countryNameToCode } from './country-codes.mjs';
import { countryMeta } from '../geo-resolve.mjs';

const REE_CSV_ZIP = 'https://mrdata.usgs.gov/ree/ree-csv.zip';
const CACHE_PATH = join(PATHS.materialsStructured, 'mrds-ree-sites.json');

/** @param {string} status */
function mapMrdsStatus(status) {
  const s = String(status ?? '').toLowerCase();
  if (/current producer|producer|small producer/.test(s)) return 'operating';
  if (/past producer|past byproduct/.test(s)) return 'historic';
  if (/prospect|potential/.test(s)) return 'deposit';
  if (/occurrence/.test(s)) return 'deposit';
  return 'deposit';
}

function slugify(name, recId) {
  return `mrds-${recId}-${String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 40)}`;
}

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

function parseMainCsv(csv) {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const header = parseCsvLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const row = Object.fromEntries(header.map((h, j) => [h, cols[j] ?? '']));
    rows.push(row);
  }
  return rows;
}

/**
 * @param {Set<string>} curatedNamesLower
 */
function rowToSite(row, curatedNamesLower) {
  const lat = parseFloat(row.latitude);
  const lon = parseFloat(row.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const name = row.depname?.trim();
  if (!name) return null;
  const nameKey = name.toLowerCase();
  if (curatedNamesLower.has(nameKey)) return null;
  for (const c of curatedNamesLower) {
    if (nameKey.includes(c) || c.includes(nameKey)) return null;
  }

  const countryCode = countryNameToCode(row.country);
  if (!countryCode) return null;

  const meta = countryMeta(countryCode);
  return {
    id: slugify(name, row.rec_id),
    name,
    lat: Math.round(lat * 1000) / 1000,
    lon: Math.round(lon * 1000) / 1000,
    countryCode,
    countryName: meta.name ?? row.country,
    flag: meta.flag ?? '',
    status: mapMrdsStatus(row.status),
    operators: row.company ? [row.company.slice(0, 80)] : ['unknown'],
    elements: ['REE'],
    notes: `USGS MRDS (${row.deptype ?? 'REE'}); ${row.status || 'unknown status'}`,
    source: 'USGS-MRDS',
    mrdsId: row.rec_id,
  };
}

export async function importMrdsReeSites({ force = false, curatedSites = [] } = {}) {
  mkdirSync(PATHS.materialsStructured, { recursive: true });
  if (!force && existsSync(CACHE_PATH)) {
    return JSON.parse(readFileSync(CACHE_PATH, 'utf8'));
  }

  const res = await fetch(REE_CSV_ZIP, {
    headers: { 'User-Agent': 'SupplyChainResearch/1.0' },
  });
  if (!res.ok) throw new Error(`MRDS download failed: ${res.status}`);

  const tmp = mkdtempSync(join(tmpdir(), 'ree-'));
  const zipPath = join(tmp, 'ree-csv.zip');
  writeFileSync(zipPath, Buffer.from(await res.arrayBuffer()));
  execFileSync('unzip', ['-q', zipPath, '-d', tmp], { stdio: 'pipe' });
  const csv = readFileSync(join(tmp, 'ree', 'main.csv'), 'utf8');
  rmSync(tmp, { recursive: true, force: true });

  const rows = parseMainCsv(csv);
  const curatedNamesLower = new Set(
    curatedSites.flatMap((s) => [s.name.toLowerCase(), ...(s.aliases ?? []).map((a) => a.toLowerCase())]),
  );

  const operatingFirst = rows.sort((a, b) => {
    const score = (s) => (/producer/i.test(s.status ?? '') ? 0 : /occurrence/i.test(s.status ?? '') ? 2 : 1);
    return score(a) - score(b);
  });

  const sites = [];
  for (const row of operatingFirst) {
    const site = rowToSite(row, curatedNamesLower);
    if (site) sites.push(site);
  }

  const payload = {
    importedAt: new Date().toISOString(),
    sourceUrl: REE_CSV_ZIP,
    totalRows: rows.length,
    siteCount: sites.length,
    sites,
  };
  writeFileSync(CACHE_PATH, JSON.stringify(payload, null, 2));
  return payload;
}

export function loadMrdsSitesCache() {
  if (!existsSync(CACHE_PATH)) return { sites: [] };
  return JSON.parse(readFileSync(CACHE_PATH, 'utf8'));
}
