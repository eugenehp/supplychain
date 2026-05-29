import { createAcceleratorTopic, TIER1_SNIPPETS } from './accelerator-shared.mjs';

const t = createAcceleratorTopic({
  id: 'intel-gaudi-3',
  productNode: 'Intel Gaudi 3',
  productDescription: 'Habana Gaudi 3 — training accelerator, TSMC 5nm compute + HBM2e',
  volumeEstimate: 350_000,
  methodology: {
    edaRouting: 'Synopsys, Cadence, Siemens EDA, Ansys, Arm flow directly to product (design-time)',
    assemblyRouting: 'Intel 10-K discloses foundry and ATMP partners; Gaudi tiles fabbed at TSMC with HBM stack assembly',
  },
  tier1NodeMeta: {
    TSMC: TIER1_SNIPPETS.tsmc('INTC 10-K / industry: primary foundry for Gaudi 3 compute tiles'),
    'SK Hynix': TIER1_SNIPPETS.skHynix('INTC 10-K: HBM memory supplier'),
    Samsung: TIER1_SNIPPETS.samsung('INTC 10-K: HBM and alternate foundry capacity'),
    Micron: TIER1_SNIPPETS.micron('INTC 10-K: HBM memory supplier'),
    Amkor: TIER1_SNIPPETS.amkor('INTC 10-K: assembly & test subcontractor'),
    'ASE Technology': TIER1_SNIPPETS.ase('OSAT — cited across INTC, TSM filings'),
    Intel: TIER1_SNIPPETS.intelFoundry('INTC 10-K: internal Intel Foundry for select tiles & packaging'),
  },
  tier1Roles: {
    TSMC: { group: 'foundry', value: 192, note: 'Primary external foundry for Gaudi 3' },
    'SK Hynix': { group: 'memory', value: 248, note: '128GB HBM2e stack' },
    Samsung: { group: 'memory', value: 20 },
    Micron: { group: 'memory', value: 22 },
    Amkor: { group: 'osat', value: 14 },
    Intel: { group: 'foundry', value: 18, note: 'Internal packaging / legacy-node content' },
    'ASE Technology': { group: 'osat', value: 6, targets: ['TSMC', 'Amkor'] },
  },
  fabTargets: ['TSMC', 'SK Hynix', 'Samsung', 'Micron', 'Intel'],
  osatTargets: ['TSMC', 'Amkor'],
  extraAllowlist: ['Intel'],
});

export const TOPIC_ID = t.TOPIC_ID;
export const ANNUAL_VOLUME_ESTIMATE = t.ANNUAL_VOLUME_ESTIMATE;
export const H200_ANNUAL_VOLUME_ESTIMATE = t.H200_ANNUAL_VOLUME_ESTIMATE;
export const PRODUCT_NODE = t.PRODUCT_NODE;
export const METHODOLOGY = t.METHODOLOGY;
export const NODE_META = t.NODE_META;
export const SEC_SUPPLY_ROLES = t.SEC_SUPPLY_ROLES;
export const MATERIALS_ALLOWLIST = t.MATERIALS_ALLOWLIST;
