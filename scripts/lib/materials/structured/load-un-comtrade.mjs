import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { PATHS } from '../../paths.mjs';
import { countryMeta } from '../geo-resolve.mjs';

const SEED_PATH = join(PATHS.materialsStructured, 'un-comtrade-ree-seed.json');
const CACHE_PATH = join(PATHS.materialsStructured, 'un-comtrade-ree.json');

/** HS codes for rare-earth trade (Comtrade Plus). */
const REE_HS = ['280530', '284610', '284690'];

/**
 * Attempt Comtrade Plus API fetch (best-effort; falls back to seed).
 * @param {{ force?: boolean, year?: number }} [opts]
 */
export async function loadUnComtradeRee({ force = false, year = 2023 } = {}) {
  mkdirSync(PATHS.materialsStructured, { recursive: true });
  if (!force && existsSync(CACHE_PATH)) {
    return JSON.parse(readFileSync(CACHE_PATH, 'utf8'));
  }

  let payload = null;
  if (existsSync(SEED_PATH)) {
    payload = JSON.parse(readFileSync(SEED_PATH, 'utf8'));
  }

  try {
    const fetched = await fetchComtradeFlows(year);
    if (fetched?.flows?.length) {
      payload = fetched;
      writeFileSync(CACHE_PATH, JSON.stringify(payload, null, 2));
      return payload;
    }
  } catch {
    /* use seed */
  }

  if (payload) {
    writeFileSync(CACHE_PATH, JSON.stringify(payload, null, 2));
    return payload;
  }

  return { flows: [], byReporter: [], methodology: 'No Comtrade data available.' };
}

/** @param {number} year */
async function fetchComtradeFlows(year) {
  /** @type {object[]} */
  const flows = [];
  const reporters = [
    { code: '842', iso: 'US' },
    { code: '156', iso: 'CN' },
    { code: '392', iso: 'JP' },
  ];

  for (const rep of reporters) {
    for (const hs of REE_HS) {
      const url = new URL('https://comtradeplus.un.org/api/get');
      url.searchParams.set('max', '500');
      url.searchParams.set('type', 'C');
      url.searchParams.set('freq', 'A');
      url.searchParams.set('px', 'HS');
      url.searchParams.set('ps', String(year));
      url.searchParams.set('r', rep.code);
      url.searchParams.set('rg', '1');
      url.searchParams.set('cc', hs);

      const res = await fetch(url, { headers: { 'User-Agent': 'SupplyChainResearch/1.0' } });
      if (!res.ok) continue;
      const json = await res.json();
      const rows = json?.data ?? json?.dataset ?? [];
      for (const row of rows.slice(0, 20)) {
        const partnerCode = row.partnerCode ?? row.ptCode ?? row.partnerISO ?? '';
        const value = row.primaryValue ?? row.TradeValue ?? row.tradeValue ?? 0;
        if (!value || value < 1000) continue;
        flows.push({
          reporterCode: rep.iso,
          reporter: countryMeta(rep.iso)?.name ?? rep.iso,
          partnerCode: String(partnerCode).slice(0, 2) || 'XX',
          partner: row.partnerDesc ?? row.partner ?? String(partnerCode),
          hsCode: hs,
          flow: 'export',
          valueUsdM: Math.round(value / 1e6),
          year,
        });
      }
    }
  }

  if (!flows.length) return null;

  return {
    version: 1,
    source: `UN Comtrade Plus API (${year})`,
    sourceUrl: 'https://comtradeplus.un.org/',
    year,
    unit: 'USD millions',
    hsCodes: REE_HS.map((code) => ({ code, label: code })),
    methodology:
      'Reporter export values from UN Comtrade Plus for HS 280530, 284610, 284690. Seed file used when API unavailable.',
    flows,
    byReporter: aggregateByReporter(flows),
  };
}

/** @param {object[]} flows */
function aggregateByReporter(flows) {
  /** @type {Map<string, { code: string, name: string, exportUsdM: number, importUsdM: number }>} */
  const map = new Map();
  for (const f of flows) {
    const code = f.reporterCode ?? 'XX';
    if (!map.has(code)) {
      map.set(code, { code, name: f.reporter ?? code, exportUsdM: 0, importUsdM: 0 });
    }
    const row = map.get(code);
    if (f.flow === 'import') row.importUsdM += f.valueUsdM ?? 0;
    else row.exportUsdM += f.valueUsdM ?? 0;
  }
  return [...map.values()].sort((a, b) => b.exportUsdM - a.exportUsdM);
}

export function buildTradeGeography(comtrade) {
  const byReporter = comtrade?.byReporter ?? [];
  const flows = comtrade?.flows ?? [];
  return {
    dataLayer: 'UN-Comtrade-REE',
    year: comtrade?.year ?? null,
    unit: comtrade?.unit ?? 'USD millions',
    methodology: comtrade?.methodology ?? '',
    sourceUrl: comtrade?.sourceUrl ?? 'https://comtradeplus.un.org/',
    hsCodes: comtrade?.hsCodes ?? [],
    byReporter: byReporter.map((r) => ({
      ...r,
      ...countryMeta(r.code),
    })),
    topFlows: [...flows].sort((a, b) => (b.valueUsdM ?? 0) - (a.valueUsdM ?? 0)).slice(0, 24),
    summary: {
      reporterCount: byReporter.length,
      flowCount: flows.length,
    },
  };
}
