import { createAcceleratorTopic, TIER1_SNIPPETS } from './accelerator-shared.mjs';

const t = createAcceleratorTopic({
  id: 'aws-inferentia-2',
  productNode: 'AWS Inferentia 2',
  productDescription: 'Amazon Inferentia 2 — inference accelerator, smaller HBM stack than Trainium',
  volumeEstimate: 800_000,
  methodology: {
    edaRouting: 'Synopsys, Cadence, Siemens EDA, Ansys, Arm flow directly to product (design-time)',
    assemblyRouting: 'AMZN 10-K cites manufacturing subcontractors; Inferentia shares AWS silicon supply chain with Trainium',
  },
  tier1NodeMeta: {
    TSMC: TIER1_SNIPPETS.tsmc('AMZN 10-K / industry: foundry for Inferentia silicon'),
    'SK Hynix': TIER1_SNIPPETS.skHynix('AMZN 10-K: memory & component suppliers'),
    Samsung: TIER1_SNIPPETS.samsung('AMZN 10-K: alternate memory capacity'),
    Micron: TIER1_SNIPPETS.micron('AMZN 10-K: memory supplier'),
    Amkor: TIER1_SNIPPETS.amkor('AMZN 10-K: third-party manufacturers & assemblers'),
    'ASE Technology': TIER1_SNIPPETS.ase('OSAT — cited across AMZN, TSM filings'),
  },
  tier1Roles: {
    TSMC: { group: 'foundry', value: 128, note: 'Inference-optimized die + packaging' },
    'SK Hynix': { group: 'memory', value: 92, note: 'Smaller HBM stack vs Trainium' },
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
