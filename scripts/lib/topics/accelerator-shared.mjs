import { TIERS } from './index.mjs';

/** Tier 2–5 nodes shared across HBM-class AI accelerators. */
export const SHARED_NODE_META = {
  ASML: { tier: TIERS.tier2, group: 'equipment', description: 'EUV & DUV lithography — ASML 20-F' },
  'Applied Materials': { tier: TIERS.tier2, group: 'equipment', description: 'Deposition, CMP, implant — AMAT 10-K' },
  'Lam Research': { tier: TIERS.tier2, group: 'equipment', description: 'Etch & deposition — LRCX 10-K' },
  KLA: { tier: TIERS.tier2, group: 'equipment', description: 'Process control & metrology — KLAC 10-K' },
  'Tokyo Electron': { tier: TIERS.tier2, group: 'equipment', description: 'LRCX 10-K: coater/developer, furnaces' },
  'Hitachi High-Tech': { tier: TIERS.tier2, group: 'equipment', description: 'LRCX/KLA 10-K: etch & metrology' },
  'Onto Innovation': { tier: TIERS.tier2, group: 'equipment', description: 'KLAC 10-K: optical metrology' },
  'ASM International': { tier: TIERS.tier2, group: 'equipment', description: 'LRCX 10-K: ALD & PECVD' },
  'Wonik IPS': { tier: TIERS.tier2, group: 'equipment', description: 'LRCX 10-K: etch & deposition (Korea)' },
  Lasertec: { tier: TIERS.tier2, group: 'equipment', description: 'KLAC 10-K: e-beam metrology' },
  Nikon: { tier: TIERS.tier2, group: 'equipment', description: 'ASML 20-F: DUV lithography competitor' },
  Canon: { tier: TIERS.tier2, group: 'equipment', description: 'ASML 20-F: lithography competitor' },
  JSR: { tier: TIERS.tier2, group: 'materials', description: 'EUV & DUV photoresist' },
  'Shin-Etsu (PR)': { tier: TIERS.tier2, group: 'materials', description: 'Photoresist' },
  'Shin-Etsu (Wafers)': { tier: TIERS.tier2, group: 'materials', description: '300mm silicon wafers' },
  Linde: { tier: TIERS.tier2, group: 'materials', description: 'Ultra-high purity process gases' },
  Ibiden: { tier: TIERS.tier2, group: 'materials', description: 'ABF substrates for advanced packaging interposer' },
  Zeiss: { tier: TIERS.tier3, group: 'subcomponent', description: 'ASML 20-F: sole supplier of EUV optics (Carl Zeiss SMT)' },
  Cymer: { tier: TIERS.tier3, group: 'subcomponent', description: 'ASML 20-F: EUV light source (ASML subsidiary)' },
  Trumpf: { tier: TIERS.tier3, group: 'subcomponent', description: 'Laser systems for lithography & metrology' },
  'VAT Group': { tier: TIERS.tier3, group: 'subcomponent', description: 'Vacuum valves — ASML/KLA filings' },
  TOTO: { tier: TIERS.tier3, group: 'subcomponent', description: 'Electrostatic chucks for wafer handling' },
  Schott: { tier: TIERS.tier4, group: 'raw', description: 'Specialty glass & mirror substrates for EUV optics (Zeiss supply chain)' },
  Hoya: { tier: TIERS.tier4, group: 'raw', description: 'Optical glass blanks & filter materials for precision optics' },
  Corning: { tier: TIERS.tier4, group: 'raw', description: 'Fused silica & advanced glass for lithography optics' },
  'Pfeiffer Vacuum': { tier: TIERS.tier4, group: 'raw', description: 'Vacuum pumps & gauging for semiconductor vacuum systems' },
  Ferrotec: { tier: TIERS.tier4, group: 'raw', description: 'Ceramic & silicon components for electrostatic chucks' },
  'IPG Photonics': { tier: TIERS.tier4, group: 'raw', description: 'High-power fiber laser diodes for Trumpf laser systems', country: 'US' },
  'SGL Carbon': { tier: TIERS.tier5, group: 'commodity', description: 'Graphite & carbon materials for high-power laser diodes (IPG supply chain)', country: 'DE' },
  'Morgan Advanced Materials': { tier: TIERS.tier5, group: 'commodity', description: 'Advanced ceramics & thermal materials for electrostatic chucks', country: 'GB' },
  Materion: { tier: TIERS.tier5, group: 'commodity', description: 'Beryllium & specialty metals for precision optical glass', country: 'US' },
  Sibelco: { tier: TIERS.tier5, group: 'commodity', description: 'High-purity quartz sand for fused silica glass', country: 'BE' },
  'Sumitomo Metal Mining': { tier: TIERS.tier5, group: 'commodity', description: 'Rare metals & optical-grade raw materials for lens blanks', country: 'JP' },
};

export const BASE_EDA_TIER1 = {
  Synopsys: { tier: 1, group: 'eda', value: 9 },
  Cadence: { tier: 1, group: 'eda', value: 5 },
  'Siemens EDA': { tier: 1, group: 'eda', value: 3 },
  Ansys: { tier: 1, group: 'eda', value: 2 },
  Arm: { tier: 1, group: 'eda', value: 4 },
};

export const BASE_EDA_NODE_META = {
  Synopsys: { tier: TIERS.tier1, group: 'eda', description: 'EDA tools & IP — SNPS 10-K' },
  Cadence: { tier: TIERS.tier1, group: 'eda', description: 'Verification & emulation — CDNS 10-K' },
  'Siemens EDA': { tier: TIERS.tier1, group: 'eda', description: 'SNPS/CDNS 10-K: EDA ecosystem competitor' },
  Ansys: { tier: TIERS.tier1, group: 'eda', description: 'SNPS 10-K: simulation (acquired by Synopsys)' },
  Arm: { tier: TIERS.tier1, group: 'eda', description: 'Interconnect & CPU IP licenses' },
};

export const BASE_MATERIALS_ALLOWLIST = [
  'Trumpf', 'TOTO', 'JSR', 'Shin-Etsu (PR)', 'Shin-Etsu (Wafers)', 'Linde', 'Ibiden',
  'Schott', 'Hoya', 'Corning', 'Pfeiffer Vacuum', 'Ferrotec', 'IPG Photonics',
  'SGL Carbon', 'Morgan Advanced Materials', 'Materion', 'Sibelco', 'Sumitomo Metal Mining',
  'Amkor', 'GlobalFoundries', 'ASE Technology',
];

/** @param {string[]} fabTargets */
export function downstreamSupplyRoles(fabTargets) {
  return {
    ASML: { tier: 2, group: 'equipment', targets: fabTargets },
    'Applied Materials': { tier: 2, group: 'equipment', targets: fabTargets },
    'Lam Research': { tier: 2, group: 'equipment', targets: fabTargets },
    KLA: { tier: 2, group: 'equipment', targets: fabTargets },
    'Tokyo Electron': { tier: 2, group: 'equipment', targets: fabTargets.slice(0, 2) },
    'Hitachi High-Tech': { tier: 2, group: 'equipment', targets: fabTargets.slice(0, 2) },
    'Onto Innovation': { tier: 2, group: 'equipment', targets: ['TSMC'] },
    'ASM International': { tier: 2, group: 'equipment', targets: ['TSMC'] },
    'Wonik IPS': { tier: 2, group: 'equipment', targets: ['SK Hynix'] },
    Lasertec: { tier: 2, group: 'equipment', targets: ['TSMC'] },
    Nikon: { tier: 2, group: 'equipment', targets: ['TSMC'], value: 4 },
    Canon: { tier: 2, group: 'equipment', targets: ['TSMC'], value: 3 },
    'Carl Zeiss SMT': { tier: 3, group: 'subcomponent', targets: ['ASML'], value: 22, note: 'ASML 20-F: sole supplier of EUV optics' },
    Cymer: { tier: 3, group: 'subcomponent', targets: ['ASML'], value: 10 },
    Trumpf: { tier: 3, group: 'subcomponent', targets: ['ASML'] },
    'VAT Group': { tier: 3, group: 'subcomponent', targets: ['ASML', 'Applied Materials', 'Lam Research', 'KLA'] },
    TOTO: { tier: 3, group: 'subcomponent', targets: ['Applied Materials', 'Lam Research'] },
    JSR: { tier: 2, group: 'materials', targets: ['TSMC', 'SK Hynix'] },
    'Shin-Etsu (PR)': { tier: 2, group: 'materials', targets: ['TSMC'] },
    'Shin-Etsu (Wafers)': { tier: 2, group: 'materials', targets: ['TSMC', 'SK Hynix'] },
    Linde: { tier: 2, group: 'materials', targets: ['TSMC', 'SK Hynix'] },
    Ibiden: { tier: 2, group: 'materials', targets: ['TSMC'] },
    Schott: { tier: 4, group: 'raw', targets: ['Zeiss'], value: 8 },
    Hoya: { tier: 4, group: 'raw', targets: ['Zeiss'], value: 6 },
    Corning: { tier: 4, group: 'raw', targets: ['Zeiss'], value: 5 },
    'Pfeiffer Vacuum': { tier: 4, group: 'raw', targets: ['VAT Group'], value: 4 },
    Ferrotec: { tier: 4, group: 'raw', targets: ['TOTO'], value: 3 },
    'IPG Photonics': { tier: 4, group: 'raw', targets: ['Trumpf'], value: 5 },
    'SGL Carbon': { tier: 5, group: 'commodity', targets: ['IPG Photonics'], value: 3 },
    'Morgan Advanced Materials': { tier: 5, group: 'commodity', targets: ['Ferrotec'], value: 2 },
    Materion: { tier: 5, group: 'commodity', targets: ['Schott'], value: 2 },
    Sibelco: { tier: 5, group: 'commodity', targets: ['Corning'], value: 2 },
    'Sumitomo Metal Mining': { tier: 5, group: 'commodity', targets: ['Hoya'], value: 2 },
  };
}

/**
 * @param {{
 *   id: string,
 *   productNode: string,
 *   productDescription: string,
 *   country?: string,
 *   volumeEstimate: number,
 *   methodology: { edaRouting: string, assemblyRouting: string },
 *   tier1NodeMeta: Record<string, object>,
 *   tier1Roles: Record<string, object>,
 *   fabTargets?: string[],
 *   osatTargets?: string[],
 *   extraAllowlist?: string[],
 * }} config
 */
export function createAcceleratorTopic(config) {
  const PRODUCT_NODE = config.productNode;
  const fabTargets = config.fabTargets ?? ['TSMC', 'SK Hynix', 'Samsung', 'Micron'];
  const osatTargets = config.osatTargets ?? ['TSMC'];

  const tier1Roles = {};
  for (const [name, role] of Object.entries(config.tier1Roles)) {
    tier1Roles[name] = {
      ...role,
      tier: 1,
      targets: role.targets ?? [PRODUCT_NODE],
    };
  }

  for (const [name, role] of Object.entries(BASE_EDA_TIER1)) {
    tier1Roles[name] = { ...role, targets: [PRODUCT_NODE] };
  }

  if (!config.tier1NodeMeta['ASE Technology']) {
    config.tier1NodeMeta['ASE Technology'] = TIER1_SNIPPETS.ase('OSAT — cited across supply-chain filings');
  }
  if (!tier1Roles['ASE Technology']) {
    tier1Roles['ASE Technology'] = { group: 'osat', value: 6, targets: osatTargets };
  } else {
    tier1Roles['ASE Technology'].targets = osatTargets;
  }

  const SEC_SUPPLY_ROLES = {
    ...tier1Roles,
    ...downstreamSupplyRoles(fabTargets),
  };

  return {
    TOPIC_ID: config.id,
    ANNUAL_VOLUME_ESTIMATE: config.volumeEstimate,
    H200_ANNUAL_VOLUME_ESTIMATE: config.volumeEstimate,
    PRODUCT_NODE,
    METHODOLOGY: config.methodology,
    NODE_META: {
      [PRODUCT_NODE]: {
        tier: TIERS.product,
        group: 'product',
        description: config.productDescription,
        country: config.country ?? 'US',
      },
      ...config.tier1NodeMeta,
      ...BASE_EDA_NODE_META,
      ...SHARED_NODE_META,
    },
    SEC_SUPPLY_ROLES,
    MATERIALS_ALLOWLIST: [...BASE_MATERIALS_ALLOWLIST, ...(config.extraAllowlist ?? [])],
  };
}

/** Re-export standard tier-1 memory/foundry node metadata snippets. */
export const TIER1_SNIPPETS = {
  tsmc: (note) => ({ tier: TIERS.tier1, group: 'foundry', description: note }),
  skHynix: (note) => ({ tier: TIERS.tier1, group: 'memory', description: note }),
  samsung: (note) => ({ tier: TIERS.tier1, group: 'memory', description: note }),
  micron: (note) => ({ tier: TIERS.tier1, group: 'memory', description: note }),
  amkor: (note) => ({ tier: TIERS.tier1, group: 'osat', description: note }),
  ase: (note) => ({ tier: TIERS.tier1, group: 'osat', description: note }),
  globalFoundries: (note) => ({ tier: TIERS.tier1, group: 'foundry', description: note }),
  intelFoundry: (note) => ({ tier: TIERS.tier1, group: 'foundry', description: note }),
};

const SUPPLY_CHAIN_TICKERS = ['TSM', 'ASML', 'AMAT', 'LRCX', 'KLAC', 'SNPS', 'CDNS', 'MU'];

/** @param {string} anchorTicker */
export function standardSecWatchlist(anchorTicker) {
  return [anchorTicker, ...SUPPLY_CHAIN_TICKERS];
}

/** @param {string} anchorTicker */
export function standardSecWatchlistWithPackaging(anchorTicker) {
  return [anchorTicker, ...SUPPLY_CHAIN_TICKERS, 'AMKR'];
}
