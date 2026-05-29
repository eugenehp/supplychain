import { TIERS } from './index.mjs';

export const TOPIC_ID = 'amd-mi325x';

/** Instinct MI325X OAM — ~400k units/yr est. (hyperscaler + enterprise 2025–26) */
export const ANNUAL_VOLUME_ESTIMATE = 400_000;
export const H200_ANNUAL_VOLUME_ESTIMATE = ANNUAL_VOLUME_ESTIMATE;

export const PRODUCT_NODE = 'AMD MI325X';

export const METHODOLOGY = {
  edaRouting: 'Synopsys, Cadence, Siemens EDA, Ansys, Arm flow directly to product (design-time)',
  assemblyRouting: 'Amkor and ASE disclosed as AMD 10-K assembly / test subcontractors; TSMC performs 3DFabric advanced packaging',
};

export const NODE_META = {
  'AMD MI325X': {
    tier: TIERS.product,
    group: 'product',
    description: 'Instinct MI325X OAM — CDNA3 chiplets, 256GB HBM3e',
    country: 'US',
  },

  // Tier 1 — direct suppliers
  TSMC: { tier: TIERS.tier1, group: 'foundry', description: 'AMD 10-K: primary foundry; SoIC + CoWoS 3DFabric for MI300 series' },
  'SK Hynix': { tier: TIERS.tier1, group: 'memory', description: 'AMD 10-K / industry: primary HBM3e supplier for Instinct' },
  Samsung: { tier: TIERS.tier1, group: 'memory', description: 'AMD 10-K: HBM and alternate foundry capacity' },
  Micron: { tier: TIERS.tier1, group: 'memory', description: 'AMD 10-K: HBM memory supplier' },
  Amkor: { tier: TIERS.tier1, group: 'osat', description: 'AMD 10-K: assembly, test & packaging subcontractor' },
  GlobalFoundries: { tier: TIERS.tier1, group: 'foundry', description: 'AMD 10-K: I/O and mature-node wafer foundry' },
  'ASE Technology': { tier: TIERS.tier1, group: 'osat', description: 'OSAT — cited across AMD, TSM, SNPS, CDNS filings' },
  Synopsys: { tier: TIERS.tier1, group: 'eda', description: 'EDA tools & IP — SNPS 10-K' },
  Cadence: { tier: TIERS.tier1, group: 'eda', description: 'Verification & emulation — CDNS 10-K' },
  'Siemens EDA': { tier: TIERS.tier1, group: 'eda', description: 'SNPS/CDNS 10-K: EDA ecosystem competitor' },
  Ansys: { tier: TIERS.tier1, group: 'eda', description: 'SNPS 10-K: simulation (acquired by Synopsys)' },
  Arm: { tier: TIERS.tier1, group: 'eda', description: 'Interconnect IP licenses' },

  // Tier 2 — equipment
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

  // Tier 2 — materials
  JSR: { tier: TIERS.tier2, group: 'materials', description: 'EUV & DUV photoresist' },
  'Shin-Etsu (PR)': { tier: TIERS.tier2, group: 'materials', description: 'Photoresist' },
  'Shin-Etsu (Wafers)': { tier: TIERS.tier2, group: 'materials', description: '300mm silicon wafers' },
  Linde: { tier: TIERS.tier2, group: 'materials', description: 'Ultra-high purity process gases' },
  Ibiden: { tier: TIERS.tier2, group: 'materials', description: 'ABF substrates for advanced packaging interposer' },

  // Tier 3 — equipment sub-components
  Zeiss: { tier: TIERS.tier3, group: 'subcomponent', description: 'ASML 20-F: sole supplier of EUV optics (Carl Zeiss SMT)' },
  Cymer: { tier: TIERS.tier3, group: 'subcomponent', description: 'ASML 20-F: EUV light source (ASML subsidiary)' },
  Trumpf: { tier: TIERS.tier3, group: 'subcomponent', description: 'Laser systems for lithography & metrology' },
  'VAT Group': { tier: TIERS.tier3, group: 'subcomponent', description: 'Vacuum valves — ASML/KLA filings' },
  TOTO: { tier: TIERS.tier3, group: 'subcomponent', description: 'Electrostatic chucks for wafer handling' },

  // Tier 4
  Schott: { tier: TIERS.tier4, group: 'raw', description: 'Specialty glass & mirror substrates for EUV optics (Zeiss supply chain)' },
  Hoya: { tier: TIERS.tier4, group: 'raw', description: 'Optical glass blanks & filter materials for precision optics' },
  Corning: { tier: TIERS.tier4, group: 'raw', description: 'Fused silica & advanced glass for lithography optics' },
  'Pfeiffer Vacuum': { tier: TIERS.tier4, group: 'raw', description: 'Vacuum pumps & gauging for semiconductor vacuum systems' },
  Ferrotec: { tier: TIERS.tier4, group: 'raw', description: 'Ceramic & silicon components for electrostatic chucks' },
  'IPG Photonics': { tier: TIERS.tier4, group: 'raw', description: 'High-power fiber laser diodes for Trumpf laser systems', country: 'US' },

  // Tier 5
  'SGL Carbon': { tier: TIERS.tier5, group: 'commodity', description: 'Graphite & carbon materials for high-power laser diodes (IPG supply chain)', country: 'DE' },
  'Morgan Advanced Materials': { tier: TIERS.tier5, group: 'commodity', description: 'Advanced ceramics & thermal materials for electrostatic chucks', country: 'GB' },
  Materion: { tier: TIERS.tier5, group: 'commodity', description: 'Beryllium & specialty metals for precision optical glass', country: 'US' },
  Sibelco: { tier: TIERS.tier5, group: 'commodity', description: 'High-purity quartz sand for fused silica glass', country: 'BE' },
  'Sumitomo Metal Mining': { tier: TIERS.tier5, group: 'commodity', description: 'Rare metals & optical-grade raw materials for lens blanks', country: 'JP' },
};

export const SEC_SUPPLY_ROLES = {
  TSMC: { tier: 1, group: 'foundry', targets: [PRODUCT_NODE], value: 198, note: 'AMD 10-K: primary foundry + 3DFabric packaging' },
  'SK Hynix': { tier: 1, group: 'memory', targets: [PRODUCT_NODE], value: 288, note: '256GB HBM3e stack — largest BOM line' },
  Samsung: { tier: 1, group: 'memory', targets: [PRODUCT_NODE], value: 22, note: 'AMD 10-K: HBM + alternate foundry' },
  Micron: { tier: 1, group: 'memory', targets: [PRODUCT_NODE], value: 24 },
  Amkor: { tier: 1, group: 'osat', targets: [PRODUCT_NODE], value: 16, note: 'AMD 10-K: ATMP subcontractor' },
  GlobalFoundries: { tier: 1, group: 'foundry', targets: [PRODUCT_NODE], value: 12, note: 'AMD 10-K: I/O die & mature-node wafers' },
  Synopsys: { tier: 1, group: 'eda', targets: [PRODUCT_NODE], value: 9 },
  Cadence: { tier: 1, group: 'eda', targets: [PRODUCT_NODE], value: 5 },
  'Siemens EDA': { tier: 1, group: 'eda', targets: [PRODUCT_NODE], value: 3 },
  Ansys: { tier: 1, group: 'eda', targets: [PRODUCT_NODE], value: 2 },
  Arm: { tier: 1, group: 'eda', targets: [PRODUCT_NODE], value: 4 },
  'ASE Technology': { tier: 1, group: 'osat', targets: ['TSMC', 'Amkor'], value: 7 },
  ASML: { tier: 2, group: 'equipment', targets: ['TSMC', 'SK Hynix', 'Samsung', 'Micron', 'GlobalFoundries'] },
  'Applied Materials': { tier: 2, group: 'equipment', targets: ['TSMC', 'SK Hynix', 'Samsung', 'Micron', 'GlobalFoundries'] },
  'Lam Research': { tier: 2, group: 'equipment', targets: ['TSMC', 'SK Hynix', 'Samsung', 'Micron', 'GlobalFoundries'] },
  KLA: { tier: 2, group: 'equipment', targets: ['TSMC', 'SK Hynix', 'Samsung', 'Micron', 'GlobalFoundries'] },
  'Tokyo Electron': { tier: 2, group: 'equipment', targets: ['TSMC', 'SK Hynix'] },
  'Hitachi High-Tech': { tier: 2, group: 'equipment', targets: ['TSMC', 'SK Hynix'] },
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

export const MATERIALS_ALLOWLIST = [
  'Trumpf', 'TOTO', 'JSR', 'Shin-Etsu (PR)', 'Shin-Etsu (Wafers)', 'Linde', 'Ibiden',
  'Schott', 'Hoya', 'Corning', 'Pfeiffer Vacuum', 'Ferrotec', 'IPG Photonics',
  'SGL Carbon', 'Morgan Advanced Materials', 'Materion', 'Sibelco', 'Sumitomo Metal Mining',
  'Amkor', 'GlobalFoundries',
];
