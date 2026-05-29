import { createAcceleratorTopic, TIER1_SNIPPETS } from './accelerator-shared.mjs';

const t = createAcceleratorTopic({
  id: 'aws-trainium-2',
  productNode: 'AWS Trainium 2',
  productDescription: 'Amazon Trainium 2 — hyperscale training chip, TSMC + HBM3e',
  volumeEstimate: 500_000,
  methodology: {
    edaRouting: 'Synopsys, Cadence, Siemens EDA, Ansys, Arm flow directly to product (design-time)',
    assemblyRouting: 'AMZN 10-K cites manufacturing subcontractors; Trainium assembled via TSMC advanced packaging + OSAT partners',
  },
  tier1NodeMeta: {
    TSMC: TIER1_SNIPPETS.tsmc('AMZN 10-K / industry: foundry & CoWoS for Trainium'),
    'SK Hynix': TIER1_SNIPPETS.skHynix('AMZN 10-K: memory & component suppliers'),
    Samsung: TIER1_SNIPPETS.samsung('AMZN 10-K: alternate memory & foundry capacity'),
    Micron: TIER1_SNIPPETS.micron('AMZN 10-K: memory supplier'),
    Amkor: TIER1_SNIPPETS.amkor('AMZN 10-K: third-party manufacturers & assemblers'),
    'ASE Technology': TIER1_SNIPPETS.ase('OSAT — cited across AMZN, TSM filings'),
  },
  tier1Roles: {
    TSMC: { group: 'foundry', value: 205, note: 'Trainium 2 compute + advanced packaging' },
    'SK Hynix': { group: 'memory', value: 235, note: 'HBM3e for training workloads' },
    Samsung: { group: 'memory', value: 18 },
    Micron: { group: 'memory', value: 20 },
    Amkor: { group: 'osat', value: 15 },
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
