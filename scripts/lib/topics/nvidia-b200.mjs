import { createAcceleratorTopic, TIER1_SNIPPETS } from './accelerator-shared.mjs';

const t = createAcceleratorTopic({
  id: 'nvidia-b200',
  productNode: 'Nvidia B200',
  productDescription: 'Blackwell B200 SXM — 192GB HBM3e, TSMC CoWoS, NVDA 10-K grounded',
  volumeEstimate: 2_000_000,
  methodology: {
    edaRouting: 'Synopsys, Cadence, Siemens EDA, Ansys, Arm flow directly to product (design-time)',
    assemblyRouting: 'NVDA 10-K discloses foundry, memory, and ATMP partners; B200 uses TSMC advanced packaging',
  },
  tier1NodeMeta: {
    TSMC: TIER1_SNIPPETS.tsmc('NVDA 10-K: primary foundry; CoWoS for Blackwell B200'),
    'SK Hynix': TIER1_SNIPPETS.skHynix('NVDA 10-K: primary HBM3e supplier'),
    Samsung: TIER1_SNIPPETS.samsung('NVDA 10-K: foundry + HBM capacity'),
    Micron: TIER1_SNIPPETS.micron('NVDA 10-K: HBM3e memory supplier'),
    Amkor: TIER1_SNIPPETS.amkor('NVDA 10-K: assembly & test subcontractor'),
    'ASE Technology': TIER1_SNIPPETS.ase('OSAT — cited across NVDA, TSM filings'),
  },
  tier1Roles: {
    TSMC: { group: 'foundry', value: 248, note: 'B200 compute die + CoWoS' },
    'SK Hynix': { group: 'memory', value: 298, note: '192GB HBM3e stack' },
    Samsung: { group: 'memory', value: 22 },
    Micron: { group: 'memory', value: 24 },
    Amkor: { group: 'osat', value: 16 },
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
