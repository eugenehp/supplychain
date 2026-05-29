import { createAcceleratorTopic, TIER1_SNIPPETS } from './accelerator-shared.mjs';

const t = createAcceleratorTopic({
  id: 'microsoft-maia-200',
  productNode: 'Microsoft Maia 200',
  productDescription: 'Azure Maia 200 — next-gen AI accelerator, MSFT 10-K + industry-modeled chip BOM',
  volumeEstimate: 350_000,
  methodology: {
    edaRouting: 'Synopsys, Cadence, Siemens EDA, Ansys, Arm flow directly to product (design-time)',
    assemblyRouting: 'MSFT 10-K discloses contract manufacturers; Maia 200 chip-level tier-1 industry-modeled',
  },
  tier1NodeMeta: {
    TSMC: TIER1_SNIPPETS.tsmc('MSFT 10-K / industry: foundry & CoWoS for Maia 200'),
    'SK Hynix': TIER1_SNIPPETS.skHynix('MSFT 10-K: component & memory suppliers'),
    Samsung: TIER1_SNIPPETS.samsung('MSFT 10-K: alternate memory & capacity'),
    Micron: TIER1_SNIPPETS.micron('MSFT 10-K: memory supplier'),
    Amkor: TIER1_SNIPPETS.amkor('MSFT 10-K: contract manufacturers'),
    'ASE Technology': TIER1_SNIPPETS.ase('OSAT — cited across MSFT, TSM filings'),
  },
  tier1Roles: {
    TSMC: { group: 'foundry', value: 198, note: 'Maia 200 compute + CoWoS' },
    'SK Hynix': { group: 'memory', value: 218, note: 'HBM3e for Azure AI clusters' },
    Samsung: { group: 'memory', value: 16 },
    Micron: { group: 'memory', value: 18 },
    Amkor: { group: 'osat', value: 14 },
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
