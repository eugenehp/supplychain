import { createAcceleratorTopic, TIER1_SNIPPETS } from './accelerator-shared.mjs';

const t = createAcceleratorTopic({
  id: 'huawei-ascend-910c',
  productNode: 'Huawei Ascend 910C',
  productDescription: 'Ascend 910C — HBM-class AI accelerator (industry-modeled, no US SEC anchor)',
  country: 'CN',
  volumeEstimate: 600_000,
  methodology: {
    edaRouting: 'Synopsys, Cadence, Siemens EDA, Ansys, Arm flow directly to product (design-time)',
    assemblyRouting:
      'No US SEC filing anchor — tier-1 modeled from industry teardowns; export-control and domestic fab mix not fully represented',
  },
  tier1NodeMeta: {
    TSMC: TIER1_SNIPPETS.tsmc('Industry: advanced-node compute historically TSMC-class (modeled)'),
    'SK Hynix': TIER1_SNIPPETS.skHynix('Industry: HBM memory for Ascend-class accelerators'),
    Samsung: TIER1_SNIPPETS.samsung('Industry: alternate HBM capacity'),
    Micron: TIER1_SNIPPETS.micron('Industry: memory supplier'),
    Amkor: TIER1_SNIPPETS.amkor('Industry: OSAT for advanced packaging'),
    'ASE Technology': TIER1_SNIPPETS.ase('OSAT — cited in global supply-chain filings'),
  },
  tier1Roles: {
    TSMC: { group: 'foundry', value: 198, note: 'Compute die + advanced packaging (modeled)' },
    'SK Hynix': { group: 'memory', value: 228, note: 'HBM stack — industry estimate' },
    Samsung: { group: 'memory', value: 18 },
    Micron: { group: 'memory', value: 20 },
    Amkor: { group: 'osat', value: 14 },
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
