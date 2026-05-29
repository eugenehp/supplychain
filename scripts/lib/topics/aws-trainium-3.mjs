import { createAcceleratorTopic, TIER1_SNIPPETS } from './accelerator-shared.mjs';

const t = createAcceleratorTopic({
  id: 'aws-trainium-3',
  productNode: 'AWS Trainium 3',
  productDescription: 'Amazon Trainium 3 — next-gen hyperscale training, TSMC + HBM3e, AMZN 10-K',
  volumeEstimate: 600_000,
  methodology: {
    edaRouting: 'Synopsys, Cadence, Siemens EDA, Ansys, Arm flow directly to product (design-time)',
    assemblyRouting: 'AMZN 10-K cites manufacturing subcontractors; Trainium 3 follows Trainium 2 supply chain shape',
  },
  tier1NodeMeta: {
    TSMC: TIER1_SNIPPETS.tsmc('AMZN 10-K / industry: foundry & CoWoS for Trainium 3'),
    'SK Hynix': TIER1_SNIPPETS.skHynix('AMZN 10-K: memory & component suppliers'),
    Samsung: TIER1_SNIPPETS.samsung('AMZN 10-K: alternate memory & foundry capacity'),
    Micron: TIER1_SNIPPETS.micron('AMZN 10-K: memory supplier'),
    Amkor: TIER1_SNIPPETS.amkor('AMZN 10-K: third-party manufacturers & assemblers'),
    'ASE Technology': TIER1_SNIPPETS.ase('OSAT — cited across AMZN, TSM filings'),
  },
  tier1Roles: {
    TSMC: { group: 'foundry', value: 228, note: 'Trainium 3 compute + advanced packaging' },
    'SK Hynix': { group: 'memory', value: 268, note: 'HBM3e for next-gen training' },
    Samsung: { group: 'memory', value: 20 },
    Micron: { group: 'memory', value: 22 },
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
