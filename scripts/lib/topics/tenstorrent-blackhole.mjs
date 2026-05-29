import { createAcceleratorTopic, TIER1_SNIPPETS } from './accelerator-shared.mjs';

const t = createAcceleratorTopic({
  id: 'tenstorrent-blackhole',
  productNode: 'Tenstorrent Blackhole',
  productDescription: 'Tenstorrent Blackhole — chiplet AI accelerator (industry-modeled, limited SEC)',
  volumeEstimate: 120_000,
  methodology: {
    edaRouting: 'Synopsys, Cadence, Siemens EDA, Ansys, Arm flow directly to product (design-time)',
    assemblyRouting: 'Private company — chiplet + off-chip memory; tier-1 modeled from foundry disclosures',
  },
  tier1NodeMeta: {
    TSMC: TIER1_SNIPPETS.tsmc('Industry: Blackhole chiplets fabbed at TSMC advanced nodes'),
    'SK Hynix': TIER1_SNIPPETS.skHynix('Industry: HBM / memory for Blackhole systems'),
    Samsung: TIER1_SNIPPETS.samsung('Industry: supplemental memory'),
    Micron: TIER1_SNIPPETS.micron('Industry: supplemental memory'),
    Amkor: TIER1_SNIPPETS.amkor('Industry: OSAT for chiplet packages'),
    'ASE Technology': TIER1_SNIPPETS.ase('OSAT — cited in global supply-chain filings'),
  },
  tier1Roles: {
    TSMC: { group: 'foundry', value: 248, note: 'Chiplet compute tiles + packaging' },
    'SK Hynix': { group: 'memory', value: 52, note: 'Off-chip memory — lower share vs HBM-first peers' },
    Samsung: { group: 'memory', value: 12 },
    Micron: { group: 'memory', value: 12 },
    Amkor: { group: 'osat', value: 14 },
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
