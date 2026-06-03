import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PATHS } from '../../paths.mjs';
import { parseUsgsSalientCsv } from './load-usgs-mcs-csv.mjs';

/**
 * Time series + oxide prices from USGS MCS salient CSV (items 7 & 8).
 * @param {{ salient?: object }} [opts]
 */
export function buildUsgsHistoricalSeries({ salient } = {}) {
  let rows = salient?.rows ?? [];
  if (!rows.length) {
    const path = join(PATHS.materialsStructured, 'usgs-mcs-2025-salient.csv');
    if (existsSync(path)) {
      rows = parseUsgsSalientCsv(readFileSync(path, 'utf8')).rows ?? [];
    }
  }

  const production = rows
    .filter((r) => r.year)
    .map((r) => ({
      year: r.year,
      usProductionMt: r.usProductionConcentrateMt ?? r.usProductionCompoundsMt,
      importsMt: r.importsCompoundsMt,
      exportsMt: r.exportsOresMt,
      consumptionMt: r.consumptionMt,
      netImportReliance: r.netImportReliance,
      employment: r.employment,
    }))
    .sort((a, b) => a.year - b.year);

  const prices = rows
    .filter((r) => r.year && r.prices)
    .map((r) => ({
      year: r.year,
      CeO2UsdPerKg: r.prices.CeO2,
      Dy2O3UsdPerKg: r.prices.Dy2O3,
      Nd2O3UsdPerKg: r.prices.Nd2O3,
      TbO2UsdPerKg: r.prices.TbO2,
    }))
    .sort((a, b) => a.year - b.year);

  return {
    dataLayer: 'USGS-MCS-Salient-Historical',
    source: 'USGS Mineral Commodity Summaries — 5-year salient statistics (REE chapter CSV)',
    unit: { production: 'metric tons REO', prices: 'USD/kg (dealer, 99% purity oxides)' },
    production,
    prices,
    summary: {
      yearSpan: production.length ? `${production[0].year}–${production[production.length - 1].year}` : null,
      pricePoints: prices.length,
    },
  };
}
