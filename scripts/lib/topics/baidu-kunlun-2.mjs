import { createAcceleratorTopic, TIER1_SNIPPETS } from './accelerator-shared.mjs';

const t = createAcceleratorTopic({
  id: 'baidu-kunlun-2',
  productNode: 'Baidu Kunlun 2',
  productDescription: 'Baidu Kunlun 2 AI chip — HBM-class accelerator, BIDU 20-F + industry model',
  country: 'CN',
  volumeEstimate: 450_000,
  methodology: {
    edaRouting: 'Synopsys, Cadence, Siemens EDA, Ansys, Arm flow directly to product (design-time)',
    assemblyRouting: 'BIDU 20-F cites cloud capex and suppliers; chip-level tier-1 flows industry-modeled',
  },
  tier1NodeMeta: {
    TSMC: TIER1_SNIPPETS.tsmc('Industry / BIDU filings: external foundry for Kunlun silicon'),
    'SK Hynix': TIER1_SNIPPETS.skHynix('Industry: HBM for Kunlun-class accelerators'),
    Samsung: TIER1_SNIPPETS.samsung('Industry: alternate memory capacity'),
    Micron: TIER1_SNIPPETS.micron('Industry: memory supplier'),
    Amkor: TIER1_SNIPPETS.amkor('Industry: OSAT for advanced packaging'),
    'ASE Technology': TIER1_SNIPPETS.ase('OSAT — cited in global supply-chain filings'),
  },
  tier1Roles: {
    TSMC: { group: 'foundry', value: 192, note: 'Kunlun 2 compute + packaging (modeled)' },
    'SK Hynix': { group: 'memory', value: 218, note: 'HBM stack — industry estimate' },
    Samsung: { group: 'memory', value: 16 },
    Micron: { group: 'memory', value: 18 },
    Amkor: { group: 'osat', value: 13 },
    'ASE Technology': { group: 'osat', value: 7, targets: ['TSMC', 'Amkor'] },
  },
  osatTargets: ['TSMC', 'Amkor'],
});

export const TOPIC_ID = t.TOPIC_ID;
export const ANNUAL_VOLUME_ESTIMATE = t.ANNUAL_VOLUME_ESTIMATE;
export const H200_ANNUAL_VOLUME_ESTIMATE = t.H200_ANNUAL_VOLUME_ESTIMATE;
export const PRODUCT_NODE = t.PRODUCT_NODE;
export const METHODOLOGY = t.METHODOLOGY;
export const NODE_META = t.NODE_META;
export const SEC_SUPPLY_ROLES = t.SEC_SUPPLY_ROLES;
export const MATERIALS_ALLOWLIST = t.MATERIALS_ALLOWLIST;
