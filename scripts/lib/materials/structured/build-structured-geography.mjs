import { loadUsgsMcsStructured } from './load-usgs-mcs-csv.mjs';
import { buildProductionGeography } from './parse-usgs-mcs.mjs';
import { loadEuStrategicProjects } from './load-eu-strategic-projects.mjs';
import { loadUnComtradeRee, buildTradeGeography } from './load-un-comtrade.mjs';
import { buildUsgsHistoricalSeries } from './load-usgs-historical.mjs';
import { loadChinaExportControls, buildChinaPolicyGeography } from './load-china-export.mjs';
import { loadMyanmarSupplyContext, buildMyanmarSupplyGeography } from './load-myanmar-supply.mjs';

export async function buildStructuredGeography({ forceCsv = false, forceComtrade = false } = {}) {
  const mcs = await loadUsgsMcsStructured({ forceCsv });
  const productionGeography = buildProductionGeography(mcs);
  const strategicProjects = loadEuStrategicProjects();
  const comtrade = await loadUnComtradeRee({ force: forceComtrade });
  const tradeGeography = buildTradeGeography(comtrade);
  const usgsHistorical = buildUsgsHistoricalSeries({ salient: mcs.usSalient });
  const chinaPolicy = buildChinaPolicyGeography(loadChinaExportControls());
  const myanmarSupply = buildMyanmarSupplyGeography(loadMyanmarSupplyContext());

  return {
    productionGeography: {
      ...productionGeography,
      dataLayer: 'USGS-MCS-CSV',
      usSalient: mcs.usSalient,
      sourceUrls: mcs.sourceUrls,
    },
    strategicProjects,
    tradeGeography,
    usgsHistorical,
    chinaPolicy,
    myanmarSupply,
  };
}
