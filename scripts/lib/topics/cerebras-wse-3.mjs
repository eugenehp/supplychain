import { createAcceleratorTopic, TIER1_SNIPPETS } from './accelerator-shared.mjs';

const t = createAcceleratorTopic({
  id: 'cerebras-wse-3',
  productNode: 'Cerebras WSE-3',
  productDescription: 'Cerebras WSE-3 — wafer-scale engine, no conventional HBM stack',
  volumeEstimate: 15_000,
  methodology: {
    edaRouting: 'Synopsys, Cadence, Siemens EDA, Ansys, Arm flow directly to product (design-time)',
    assemblyRouting:
      'Private company — full-wafer die + custom packaging; no HBM stack like H200/MI325X; fab-heavy BOM modeled from industry',
  },
  tier1NodeMeta: {
    TSMC: TIER1_SNIPPETS.tsmc('Industry: wafer-scale die fabrication at leading external foundry'),
    'SK Hynix': TIER1_SNIPPETS.skHynix('Industry: minimal off-wafer memory — not HBM stack'),
    Samsung: TIER1_SNIPPETS.samsung('Industry: supplemental memory'),
    Micron: TIER1_SNIPPETS.micron('Industry: off-wafer memory & I/O support'),
    Amkor: TIER1_SNIPPETS.amkor('Industry: advanced OSAT for wafer-scale packages'),
    'ASE Technology': TIER1_SNIPPETS.ase('OSAT — cited in global supply-chain filings'),
  },
  tier1Roles: {
    TSMC: { group: 'foundry', value: 400, note: 'Wafer-scale die + interposer — dominates BOM' },
    'SK Hynix': { group: 'memory', value: 6, note: 'Peripheral memory only' },
    Samsung: { group: 'memory', value: 4 },
    Micron: { group: 'memory', value: 6, note: 'Peripheral memory — not HBM-class stack' },
    Amkor: { group: 'osat', value: 26, note: 'Wafer-scale package assembly' },
    'ASE Technology': { group: 'osat', value: 8, targets: ['TSMC', 'Amkor'] },
  },
  fabTargets: ['TSMC', 'SK Hynix', 'Samsung', 'Micron'],
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
