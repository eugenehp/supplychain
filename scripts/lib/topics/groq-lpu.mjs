import { createAcceleratorTopic, TIER1_SNIPPETS } from './accelerator-shared.mjs';

const t = createAcceleratorTopic({
  id: 'groq-lpu',
  productNode: 'Groq LPU',
  productDescription: 'Groq LPU — inference accelerator, on-chip SRAM (not HBM-centric)',
  volumeEstimate: 350_000,
  methodology: {
    edaRouting: 'Synopsys, Cadence, Siemens EDA, Ansys, Arm flow directly to product (design-time)',
    assemblyRouting:
      'Private company — SRAM-centric architecture; minimal off-chip memory vs HBM-class peers; tier-1 modeled from TSMC fab disclosures',
  },
  tier1NodeMeta: {
    TSMC: TIER1_SNIPPETS.tsmc('Industry: Groq LPU silicon fabbed at advanced external foundry'),
    'SK Hynix': TIER1_SNIPPETS.skHynix('Industry: minimal off-chip DRAM — small BOM share'),
    Samsung: TIER1_SNIPPETS.samsung('Industry: supplemental memory'),
    Micron: TIER1_SNIPPETS.micron('Industry: supplemental memory'),
    Amkor: TIER1_SNIPPETS.amkor('Industry: OSAT for accelerator packages'),
    'ASE Technology': TIER1_SNIPPETS.ase('OSAT — cited in global supply-chain filings'),
  },
  tier1Roles: {
    TSMC: { group: 'foundry', value: 198, note: 'LPU compute die dominates BOM (SRAM on-die)' },
    'SK Hynix': { group: 'memory', value: 12, note: 'Minimal off-chip memory vs HBM peers' },
    Samsung: { group: 'memory', value: 8 },
    Micron: { group: 'memory', value: 8 },
    Amkor: { group: 'osat', value: 14 },
    'ASE Technology': { group: 'osat', value: 6, targets: ['TSMC', 'Amkor'] },
  },
  fabTargets: ['TSMC'],
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
