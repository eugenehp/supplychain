import { createAcceleratorTopic, TIER1_SNIPPETS } from './accelerator-shared.mjs';

const t = createAcceleratorTopic({
  id: 'google-tpu-v5p',
  productNode: 'Google TPU v5p',
  productDescription: 'Google TPU v5p (Trillium) — Cloud TPU training/inference, TSMC + HBM',
  volumeEstimate: 450_000,
  methodology: {
    edaRouting: 'Synopsys, Cadence, Siemens EDA, Ansys, Arm flow directly to product (design-time)',
    assemblyRouting: 'GOOGL 10-K rarely names chip-level suppliers — tier-1 flows modeled from industry BOM with SEC vendor mentions where available',
  },
  tier1NodeMeta: {
    TSMC: TIER1_SNIPPETS.tsmc('GOOGL 10-K / industry: external foundry for TPU silicon'),
    'SK Hynix': TIER1_SNIPPETS.skHynix('GOOGL 10-K: infrastructure component suppliers'),
    Samsung: TIER1_SNIPPETS.samsung('GOOGL 10-K: alternate memory capacity'),
    Micron: TIER1_SNIPPETS.micron('GOOGL 10-K: memory supplier mentions'),
    Amkor: TIER1_SNIPPETS.amkor('Industry: OSAT for advanced AI accelerator packages'),
    'ASE Technology': TIER1_SNIPPETS.ase('OSAT — cited across GOOGL, TSM filings'),
  },
  tier1Roles: {
    TSMC: { group: 'foundry', value: 178, note: 'Trillium / v5p compute + packaging' },
    'SK Hynix': { group: 'memory', value: 185, note: 'HBM for TPU pods' },
    Samsung: { group: 'memory', value: 15 },
    Micron: { group: 'memory', value: 17 },
    Amkor: { group: 'osat', value: 12 },
    'ASE Technology': { group: 'osat', value: 6, targets: ['TSMC', 'Amkor'] },
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
