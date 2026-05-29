import { createAcceleratorTopic, TIER1_SNIPPETS } from './accelerator-shared.mjs';

const t = createAcceleratorTopic({
  id: 'amd-mi350x',
  productNode: 'AMD MI350X',
  productDescription: 'Instinct MI350X — CDNA4 chiplets, expanded HBM3e, AMD 10-K grounded',
  volumeEstimate: 500_000,
  methodology: {
    edaRouting: 'Synopsys, Cadence, Siemens EDA, Ansys, Arm flow directly to product (design-time)',
    assemblyRouting: 'AMD 10-K: TSMC 3DFabric packaging, Amkor assembly, GlobalFoundries I/O tiles',
  },
  tier1NodeMeta: {
    TSMC: TIER1_SNIPPETS.tsmc('AMD 10-K: primary foundry; SoIC + CoWoS for MI350 series'),
    'SK Hynix': TIER1_SNIPPETS.skHynix('AMD 10-K / industry: primary HBM3e for Instinct'),
    Samsung: TIER1_SNIPPETS.samsung('AMD 10-K: HBM and alternate foundry capacity'),
    Micron: TIER1_SNIPPETS.micron('AMD 10-K: HBM memory supplier'),
    Amkor: TIER1_SNIPPETS.amkor('AMD 10-K: assembly, test & packaging subcontractor'),
    GlobalFoundries: TIER1_SNIPPETS.globalFoundries('AMD 10-K: I/O and mature-node wafer foundry'),
    'ASE Technology': TIER1_SNIPPETS.ase('OSAT — cited across AMD, TSM filings'),
  },
  tier1Roles: {
    TSMC: { group: 'foundry', value: 208, note: 'MI350X compute chiplets + 3DFabric' },
    'SK Hynix': { group: 'memory', value: 328, note: 'Expanded HBM3e vs MI325X' },
    Samsung: { group: 'memory', value: 20 },
    Micron: { group: 'memory', value: 22 },
    Amkor: { group: 'osat', value: 15 },
    GlobalFoundries: { group: 'foundry', value: 12 },
    'ASE Technology': { group: 'osat', value: 7, targets: ['TSMC', 'Amkor'] },
  },
  osatTargets: ['TSMC', 'Amkor'],
  extraAllowlist: ['GlobalFoundries'],
});

export const TOPIC_ID = t.TOPIC_ID;
export const ANNUAL_VOLUME_ESTIMATE = t.ANNUAL_VOLUME_ESTIMATE;
export const H200_ANNUAL_VOLUME_ESTIMATE = t.H200_ANNUAL_VOLUME_ESTIMATE;
export const PRODUCT_NODE = t.PRODUCT_NODE;
export const METHODOLOGY = t.METHODOLOGY;
export const NODE_META = t.NODE_META;
export const SEC_SUPPLY_ROLES = t.SEC_SUPPLY_ROLES;
export const MATERIALS_ALLOWLIST = t.MATERIALS_ALLOWLIST;
