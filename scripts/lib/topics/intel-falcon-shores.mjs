import { createAcceleratorTopic, TIER1_SNIPPETS } from './accelerator-shared.mjs';

const t = createAcceleratorTopic({
  id: 'intel-falcon-shores',
  productNode: 'Intel Falcon Shores',
  productDescription: 'Intel Falcon Shores — unified GPU/XPU accelerator, INTC 10-K + TSMC + HBM',
  volumeEstimate: 280_000,
  methodology: {
    edaRouting: 'Synopsys, Cadence, Siemens EDA, Ansys, Arm flow directly to product (design-time)',
    assemblyRouting: 'INTC 10-K discloses foundry mix; Falcon Shores uses TSMC tiles plus Intel Foundry content',
  },
  tier1NodeMeta: {
    TSMC: TIER1_SNIPPETS.tsmc('INTC 10-K / roadmap: external foundry for Falcon Shores tiles'),
    'SK Hynix': TIER1_SNIPPETS.skHynix('INTC 10-K: HBM memory supplier'),
    Samsung: TIER1_SNIPPETS.samsung('INTC 10-K: HBM and alternate foundry capacity'),
    Micron: TIER1_SNIPPETS.micron('INTC 10-K: HBM memory supplier'),
    Intel: TIER1_SNIPPETS.intelFoundry('INTC 10-K: Intel Foundry for select tiles & packaging'),
    Amkor: TIER1_SNIPPETS.amkor('INTC 10-K: assembly & test subcontractor'),
    'ASE Technology': TIER1_SNIPPETS.ase('OSAT — cited across INTC, TSM filings'),
  },
  tier1Roles: {
    TSMC: { group: 'foundry', value: 188, note: 'Primary external foundry for Falcon Shores' },
    'SK Hynix': { group: 'memory', value: 218, note: 'HBM3e stack' },
    Samsung: { group: 'memory', value: 18 },
    Micron: { group: 'memory', value: 20 },
    Intel: { group: 'foundry', value: 32, note: 'Internal Intel Foundry content' },
    Amkor: { group: 'osat', value: 14 },
    'ASE Technology': { group: 'osat', value: 6, targets: ['TSMC', 'Amkor', 'Intel'] },
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
