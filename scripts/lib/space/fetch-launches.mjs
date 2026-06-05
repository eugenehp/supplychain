/**
 * Launch manifest from Jonathan McDowell's General Catalog of Artificial
 * Space Objects (GCAT). https://planet4589.org/space/gcat/
 *
 * Pulls the launch log TSV — comprehensive record of orbital + suborbital
 * launches — filters to the last N years and tags rows where the launch
 * vehicle / operator / site matches a watchlist supplier.
 *
 * Output: static/<topicId>/launches/index.json
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PATHS, topicStaticDir } from '../paths.mjs';

const GCAT_URL = 'https://planet4589.org/space/gcat/tsv/launch/launch.tsv';
const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const WATCHLIST_TAGS = [
  // Vehicle → operator / ticker association.
  { pattern: /\bElectron\b/i, operator: 'Rocket Lab', ticker: 'RKLB' },
  { pattern: /\bNeutron\b/i, operator: 'Rocket Lab', ticker: 'RKLB' },
  { pattern: /\bAtlas\s*V|Vulcan\b/i, operator: 'ULA (Boeing/Lockheed)', ticker: 'BA/LMT' },
  { pattern: /\bFalcon\s*9|Falcon\s*Heavy|Starship\b/i, operator: 'SpaceX (private)', ticker: null },
  { pattern: /\bNew Shepard|New Glenn\b/i, operator: 'Blue Origin (private)', ticker: null },
  { pattern: /\bAriane[- ]?[56]\b/i, operator: 'ArianeGroup', ticker: null },
  { pattern: /\bVega(?:[- ]?C)?\b/i, operator: 'Avio', ticker: null },
  { pattern: /\bH3|H-?II\w?\b/i, operator: 'MHI', ticker: null },
  { pattern: /\bLong March|Chang\s+Zheng|CZ-/i, operator: 'CASC', ticker: null },
  { pattern: /\bSoyuz/i, operator: 'Roscosmos', ticker: null },
  { pattern: /\bGSLV|PSLV|LVM3/i, operator: 'ISRO', ticker: null },
  { pattern: /\bMinotaur\b/i, operator: 'Northrop Grumman', ticker: 'NOC' },
];

async function fetchGcatTsv() {
  const res = await fetch(GCAT_URL, {
    headers: {
      'User-Agent': BROWSER_UA,
      Accept: 'text/tab-separated-values,text/plain,*/*',
    },
  });
  if (!res.ok) throw new Error(`GCAT ${res.status}`);
  return res.text();
}

function parseTsvHeader(text) {
  const lines = text.split(/\r?\n/);
  let headerLine = null;
  let bodyStart = 0;
  for (let i = 0; i < Math.min(lines.length, 40); i++) {
    const l = lines[i];
    if (!l.trim()) continue;
    // GCAT's first non-blank line is the header, prefixed with `#`.
    if (l.startsWith('#') && /Launch_Tag|Launch_Date|LV_Type/i.test(l)) {
      headerLine = l.replace(/^#/, '').trim();
      bodyStart = i + 1;
      break;
    }
    // Some files have a plain header.
    if (!l.startsWith('#')) {
      headerLine = l;
      bodyStart = i + 1;
      break;
    }
  }
  if (!headerLine) return { header: [], body: lines, bodyStart };
  const header = headerLine.split(/\t/).map((s) => s.trim());
  return { header, body: lines.slice(bodyStart) };
}

function parseLaunchRow(row, header) {
  const cells = row.split(/\t/);
  /** @type {Record<string, string>} */
  const obj = {};
  for (let i = 0; i < header.length; i++) {
    obj[header[i]] = (cells[i] ?? '').trim();
  }
  return obj;
}

function tagRow(row) {
  const blob = [row['LV_Type'], row['Variant'], row['Mission'], row['Flight'], row['FlightCode'], row['Launch_Site']]
    .filter(Boolean)
    .join(' ');
  for (const t of WATCHLIST_TAGS) {
    if (t.pattern.test(blob)) return { operator: t.operator, ticker: t.ticker };
  }
  return null;
}

function normalizeDate(raw) {
  if (!raw) return null;
  // GCAT date format examples: 2023 Aug 13 2105:23, 2024 Jul 28, 2024 Jun 10 0000:00:00
  const m = raw.match(/^(\d{4})\s+([A-Za-z]{3})\s+(\d{1,2})/);
  if (!m) return null;
  const months = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
  const yr = m[1];
  const mo = months[m[2]] ?? '01';
  const dy = m[3].padStart(2, '0');
  return `${yr}-${mo}-${dy}`;
}

export async function fetchLaunchesForTopic({ topicId, years = 3 }) {
  const outDir = join(topicStaticDir(topicId), 'launches');
  mkdirSync(outDir, { recursive: true });
  const rawDir = join(PATHS.rawPublicSpace, '_launches');
  mkdirSync(rawDir, { recursive: true });

  console.log('  · GCAT launch log…');
  let tsv;
  try {
    tsv = await fetchGcatTsv();
    writeFileSync(join(rawDir, 'launch.tsv'), tsv);
  } catch (err) {
    if (existsSync(join(rawDir, 'launch.tsv'))) {
      console.log('    (using cached TSV — fetch failed: ' + err.message + ')');
      tsv = readFileSync(join(rawDir, 'launch.tsv'), 'utf8');
    } else {
      console.log(`    ✗ ${err.message}`);
      writeFileSync(join(outDir, 'index.json'), JSON.stringify({ error: err.message }, null, 2));
      return { error: err.message };
    }
  }

  const { header, body } = parseTsvHeader(tsv);
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - years);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const rows = [];
  for (const line of body) {
    if (!line.trim() || line.startsWith('#')) continue;
    const obj = parseLaunchRow(line, header);
    const dateRaw = obj['Launch_Date'] ?? obj['Date'] ?? '';
    const date = normalizeDate(dateRaw);
    if (!date || date < cutoffStr) continue;
    const tag = tagRow(obj);
    rows.push({
      date,
      vehicle: obj['LV_Type'] ?? obj['Vehicle'] ?? null,
      mission: obj['Mission'] ?? obj['JCAT'] ?? null,
      site: obj['Launch_Site'] ?? obj['Site'] ?? null,
      apogee_km: obj['Apogee'] ? Number(obj['Apogee']) : null,
      status: obj['Launch_Code'] ?? obj['Code'] ?? null,
      operator: tag?.operator ?? null,
      ticker: tag?.ticker ?? null,
      tagged: Boolean(tag),
    });
  }
  rows.sort((a, b) => a.date.localeCompare(b.date));

  // Aggregate stats.
  const byVehicle = new Map();
  const byOperator = new Map();
  const byYear = new Map();
  for (const r of rows) {
    if (r.vehicle) byVehicle.set(r.vehicle, (byVehicle.get(r.vehicle) ?? 0) + 1);
    if (r.operator) byOperator.set(r.operator, (byOperator.get(r.operator) ?? 0) + 1);
    const y = r.date.slice(0, 4);
    byYear.set(y, (byYear.get(y) ?? 0) + 1);
  }

  const result = {
    generatedAt: new Date().toISOString(),
    topicId,
    years,
    cutoff: cutoffStr,
    source: GCAT_URL,
    totalLaunches: rows.length,
    taggedLaunches: rows.filter((r) => r.tagged).length,
    byVehicle: [...byVehicle.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([vehicle, count]) => ({ vehicle, count })),
    byOperator: [...byOperator.entries()].sort((a, b) => b[1] - a[1]).map(([operator, count]) => ({ operator, count })),
    byYear: [...byYear.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([year, count]) => ({ year: Number(year), count })),
    launches: rows.slice(-500),  // cap at 500 most recent for static delivery
  };
  writeFileSync(join(outDir, 'index.json'), JSON.stringify(result, null, 2));
  console.log(`    ✓ ${rows.length} launches in last ${years}y · ${result.taggedLaunches} tagged to watchlist`);
  return result;
}
