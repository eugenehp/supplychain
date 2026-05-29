import { createAcceleratorTopic, TIER1_SNIPPETS } from './accelerator-shared.mjs';

const t = createAcceleratorTopic({
  id: 'meta-mtia-v2',
  productNode: 'Meta MTIA v2',
  productDescription: 'Meta MTIA v2 — custom inference/training accelerator, TSMC + HBM (industry-modeled)',
  volumeEstimate: 250_000,
  methodology: {
    edaRouting: 'Synopsys, Cadence, Siemens EDA, Ansys, Arm flow directly to product (design-time)',
    assemblyRouting:
      'META 10-K lacks chip-level supplier names — tier-1 flows modeled from hyperscaler AI silicon BOM benchmarks',
  },
  tier1NodeMeta: {
    TSMC: TIER1_SNIPPETS.tsmc('Industry / META infrastructure filings: external foundry for MTIA'),
    'SK Hynix': TIER1_SNIPPETS.skHynix('Industry: HBM supplier for MTIA-class accelerators'),
    Samsung: TIER1_SNIPPETS.samsung('Industry: alternate memory capacity'),
    Micron: TIER1_SNIPPETS.micron('Industry: memory supplier'),
    Amkor: TIER1_SNIPPETS.amkor('Industry: OSAT for advanced AI packages'),
    'ASE Technology': TIER1_SNIPPETS.ase('OSAT — cited across META, TSM filings'),
  },
  tier1Roles: {
    TSMC: { group: 'foundry', value: 165, note: 'MTIA compute + CoWoS (modeled)' },
    'SK Hynix': { group: 'memory', value: 175, note: 'HBM stack — industry estimate' },
    Samsung: { group: 'memory', value: 14 },
    Micron: { group: 'memory', value: 16 },
    Amkor: { group: 'osat', value: 11 },
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
