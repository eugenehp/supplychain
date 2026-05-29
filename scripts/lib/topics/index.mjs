/** Shared tier constants across all research topics. */
export const TIERS = {
  product: 0,
  tier1: 1,
  tier2: 2,
  tier3: 3,
  tier4: 4,
  tier5: 5,
};

export const TIER_LABELS = ['Product', 'Tier 1', 'Tier 2', 'Tier 3', 'Tier 4', 'Tier 5'];

/** @typedef {import('./types.mjs').ResearchTopic} ResearchTopic */

const SUPPLY_CHAIN = ['TSM', 'ASML', 'AMAT', 'LRCX', 'KLAC', 'SNPS', 'CDNS', 'MU'];

function standardSecWatchlistWithPackaging(anchorTicker) {
  return [anchorTicker, ...SUPPLY_CHAIN, 'AMKR'];
}

/** @type {ResearchTopic[]} */
export const TOPICS = [
  // ── Active: SEC-grounded HBM accelerators ──
  {
    id: 'nvidia-h200',
    label: 'Nvidia H200',
    shortLabel: 'H200',
    description: 'Blackwell H200 SXM — reverse-traced semiconductor supply chain from SEC 10-K / 20-F filings.',
    productNode: 'Nvidia H200',
    status: 'active',
    category: 'AI Accelerators',
    anchorCompany: 'NVIDIA',
    anchorCountry: 'US',
    anchorTicker: 'NVDA',
    secWatchlist: ['NVDA', ...SUPPLY_CHAIN],
    subtitle: 'TSMC and SK Hynix flows are nearly equal — HBM3e memory costs roughly as much as the GPU die itself.',
  },
  {
    id: 'nvidia-b200',
    label: 'Nvidia B200',
    shortLabel: 'B200',
    description: 'Blackwell B200 SXM — 192GB HBM3e successor to H200, NVDA 10-K grounded.',
    productNode: 'Nvidia B200',
    status: 'active',
    category: 'AI Accelerators',
    anchorCompany: 'NVIDIA',
    anchorCountry: 'US',
    anchorTicker: 'NVDA',
    secWatchlist: ['NVDA', ...SUPPLY_CHAIN],
    subtitle: 'Higher HBM3e load than H200 — same NVDA filing anchor with expanded memory BOM share.',
  },
  {
    id: 'amd-mi325x',
    label: 'AMD MI325X',
    shortLabel: 'MI325X',
    description: 'Instinct MI325X OAM — chiplet CDNA3 accelerator reverse-traced from SEC 10-K / 20-F filings.',
    productNode: 'AMD MI325X',
    status: 'active',
    category: 'AI Accelerators',
    anchorCompany: 'AMD',
    anchorCountry: 'US',
    anchorTicker: 'AMD',
    secWatchlist: ['AMD', ...SUPPLY_CHAIN, 'AMKR', 'GFS'],
    subtitle: '256GB HBM3e dominates the BOM — chiplet CDNA3 dies on TSMC 3DFabric with Amkor assembly and GlobalFoundries I/O.',
  },
  {
    id: 'amd-mi350x',
    label: 'AMD MI350X',
    shortLabel: 'MI350X',
    description: 'Instinct MI350X — CDNA4 with expanded HBM3e, AMD 10-K grounded.',
    productNode: 'AMD MI350X',
    status: 'active',
    category: 'AI Accelerators',
    anchorCompany: 'AMD',
    anchorCountry: 'US',
    anchorTicker: 'AMD',
    secWatchlist: ['AMD', ...SUPPLY_CHAIN, 'AMKR', 'GFS'],
    subtitle: 'Next Instinct generation — HBM3e share rises vs MI325X on the same AMD supplier disclosures.',
  },
  {
    id: 'intel-gaudi-3',
    label: 'Intel Gaudi 3',
    shortLabel: 'Gaudi 3',
    description: 'Habana Gaudi 3 training accelerator — INTC 10-K grounded, TSMC fab + HBM stack.',
    productNode: 'Intel Gaudi 3',
    status: 'active',
    category: 'AI Accelerators',
    anchorCompany: 'Intel',
    anchorCountry: 'US',
    anchorTicker: 'INTC',
    secWatchlist: standardSecWatchlistWithPackaging('INTC'),
    subtitle: 'Closest Intel peer to H200/MI325X — TSMC compute tiles plus HBM2e; internal Intel Foundry for select content.',
  },
  {
    id: 'intel-falcon-shores',
    label: 'Intel Falcon Shores',
    shortLabel: 'Falcon Shores',
    description: 'Intel Falcon Shores unified GPU/XPU — INTC 10-K, TSMC + HBM + Intel Foundry mix.',
    productNode: 'Intel Falcon Shores',
    status: 'active',
    category: 'AI Accelerators',
    anchorCompany: 'Intel',
    anchorCountry: 'US',
    anchorTicker: 'INTC',
    secWatchlist: standardSecWatchlistWithPackaging('INTC'),
    subtitle: 'Intel’s next unified datacenter accelerator — external TSMC tiles plus internal foundry content per INTC filings.',
  },
  {
    id: 'aws-trainium-2',
    label: 'AWS Trainium 2',
    shortLabel: 'Trainium 2',
    description: 'Amazon custom training accelerator — AMZN 10-K with TSMC + HBM supply chain.',
    productNode: 'AWS Trainium 2',
    status: 'active',
    category: 'Cloud AI Silicon',
    anchorCompany: 'Amazon',
    anchorCountry: 'US',
    anchorTicker: 'AMZN',
    secWatchlist: standardSecWatchlistWithPackaging('AMZN'),
    subtitle: 'Hyperscale training chip — same HBM + advanced packaging shape as H200, anchored on Amazon filings.',
  },
  {
    id: 'aws-trainium-3',
    label: 'AWS Trainium 3',
    shortLabel: 'Trainium 3',
    description: 'Amazon Trainium 3 — next-gen training accelerator, AMZN 10-K with TSMC + HBM3e.',
    productNode: 'AWS Trainium 3',
    status: 'active',
    category: 'Cloud AI Silicon',
    anchorCompany: 'Amazon',
    anchorCountry: 'US',
    anchorTicker: 'AMZN',
    secWatchlist: standardSecWatchlistWithPackaging('AMZN'),
    subtitle: 'Successor to Trainium 2 — same AMZN supplier-risk anchor with higher memory BOM per chip.',
  },
  {
    id: 'aws-inferentia-2',
    label: 'AWS Inferentia 2',
    shortLabel: 'Inferentia 2',
    description: 'Amazon inference accelerator — AMZN 10-K, smaller HBM stack than Trainium.',
    productNode: 'AWS Inferentia 2',
    status: 'active',
    category: 'Cloud AI Silicon',
    anchorCompany: 'Amazon',
    anchorCountry: 'US',
    anchorTicker: 'AMZN',
    secWatchlist: standardSecWatchlistWithPackaging('AMZN'),
    subtitle: 'Inference sibling to Trainium — shared AWS silicon supply chain with a lighter memory BOM.',
  },
  {
    id: 'microsoft-maia-100',
    label: 'Microsoft Maia 100',
    shortLabel: 'Maia 100',
    description: 'Azure Maia 100 AI accelerator — MSFT 10-K, TSMC CoWoS + HBM3e.',
    productNode: 'Microsoft Maia 100',
    status: 'active',
    category: 'Cloud AI Silicon',
    anchorCompany: 'Microsoft',
    anchorCountry: 'US',
    anchorTicker: 'MSFT',
    secWatchlist: standardSecWatchlistWithPackaging('MSFT'),
    subtitle: 'Azure AI accelerator — TSMC advanced packaging and HBM disclosed via Microsoft supplier risk language.',
  },
  {
    id: 'google-tpu-v5p',
    label: 'Google TPU v5p',
    shortLabel: 'TPU v5p',
    description: 'Google Cloud TPU v5p (Trillium) — GOOGL 10-K with industry-modeled chip BOM.',
    productNode: 'Google TPU v5p',
    status: 'active',
    category: 'Cloud AI Silicon',
    anchorCompany: 'Alphabet',
    anchorCountry: 'US',
    anchorTicker: 'GOOGL',
    secWatchlist: standardSecWatchlistWithPackaging('GOOGL'),
    subtitle: 'Same cloud AI role as Maia/Trainium — Google rarely breaks out chip-level suppliers in SEC filings.',
  },
  {
    id: 'google-tpu-v6',
    label: 'Google TPU v6',
    shortLabel: 'TPU v6',
    description: 'Google Cloud TPU v6 — GOOGL 10-K with industry-modeled chip BOM.',
    productNode: 'Google TPU v6',
    status: 'active',
    category: 'Cloud AI Silicon',
    anchorCompany: 'Alphabet',
    anchorCountry: 'US',
    anchorTicker: 'GOOGL',
    secWatchlist: standardSecWatchlistWithPackaging('GOOGL'),
    subtitle: 'Trillium successor — same GOOGL filing anchor; tier-1 chip flows industry-modeled like v5p.',
  },
  // ── Limited SEC disclosure ──
  {
    id: 'huawei-ascend-910c',
    label: 'Huawei Ascend 910C',
    shortLabel: 'Ascend 910C',
    description: 'Ascend 910B/910C — HBM + advanced packaging peer, not US SEC-grounded.',
    productNode: 'Huawei Ascend 910C',
    status: 'limited',
    category: 'AI Accelerators',
    anchorCompany: 'Huawei',
    anchorCountry: 'CN',
    secWatchlist: [...SUPPLY_CHAIN, 'AMKR'],
    subtitle: 'Comparable HBM accelerator — no US SEC filing anchor for reverse trace.',
    disclosureNote: 'Industry-modeled BOM only. No US SEC 10-K anchor; export-control and domestic fab mix not fully shown.',
  },
  {
    id: 'meta-mtia-v2',
    label: 'Meta MTIA v2',
    shortLabel: 'MTIA v2',
    description: 'Meta Training & Inference Accelerator — limited public supplier disclosure.',
    productNode: 'Meta MTIA v2',
    status: 'limited',
    category: 'Cloud AI Silicon',
    anchorCompany: 'Meta',
    anchorCountry: 'US',
    anchorTicker: 'META',
    secWatchlist: standardSecWatchlistWithPackaging('META'),
    subtitle: 'Custom inference/training silicon — META 10-K lacks chip-level supplier detail today.',
    disclosureNote: 'META 10-K indexed for infrastructure risk language; chip-level tier-1 flows are industry-modeled.',
  },
  {
    id: 'microsoft-maia-200',
    label: 'Microsoft Maia 200',
    shortLabel: 'Maia 200',
    description: 'Azure Maia 200 — next-gen AI accelerator, MSFT 10-K with industry-modeled chip BOM.',
    productNode: 'Microsoft Maia 200',
    status: 'limited',
    category: 'Cloud AI Silicon',
    anchorCompany: 'Microsoft',
    anchorCountry: 'US',
    anchorTicker: 'MSFT',
    secWatchlist: standardSecWatchlistWithPackaging('MSFT'),
    subtitle: 'Maia 100 successor — MSFT filings indexed; chip-level tier-1 flows industry-modeled.',
    disclosureNote: 'MSFT 10-K indexed for supplier risk; Maia 200 chip-level BOM is industry-modeled pending product disclosure.',
  },
  {
    id: 'baidu-kunlun-2',
    label: 'Baidu Kunlun 2',
    shortLabel: 'Kunlun 2',
    description: 'Baidu Kunlun 2 AI chip — BIDU 20-F indexed, chip-level BOM industry-modeled.',
    productNode: 'Baidu Kunlun 2',
    status: 'limited',
    category: 'Cloud AI Silicon',
    anchorCompany: 'Baidu',
    anchorCountry: 'CN',
    anchorTicker: 'BIDU',
    secWatchlist: standardSecWatchlistWithPackaging('BIDU'),
    subtitle: 'China cloud AI silicon — BIDU 20-F for infrastructure; chip suppliers not named at product level.',
    disclosureNote: 'BIDU 20-F indexed for cloud/AI capex language; Kunlun chip tier-1 flows are industry-modeled.',
  },
  {
    id: 'sambanova-sn40',
    label: 'SambaNova SN40',
    shortLabel: 'SN40',
    description: 'SambaNova SN40 RDU — HBM-class training accelerator, industry-modeled.',
    productNode: 'SambaNova SN40',
    status: 'limited',
    category: 'AI Accelerators',
    anchorCompany: 'SambaNova',
    anchorCountry: 'US',
    secWatchlist: [...SUPPLY_CHAIN, 'AMKR'],
    subtitle: 'HBM + CoWoS peer to hyperscale custom silicon — no public SEC BOM.',
    disclosureNote: 'Private company — no SEC filing. Tier-1 modeled from industry AI accelerator BOM benchmarks.',
  },
  {
    id: 'tenstorrent-blackhole',
    label: 'Tenstorrent Blackhole',
    shortLabel: 'Blackhole',
    description: 'Tenstorrent Blackhole chiplet accelerator — industry-modeled, limited SEC.',
    productNode: 'Tenstorrent Blackhole',
    status: 'limited',
    category: 'AI Accelerators',
    anchorCompany: 'Tenstorrent',
    anchorCountry: 'US',
    secWatchlist: [...SUPPLY_CHAIN, 'AMKR'],
    subtitle: 'Chiplet architecture with off-chip memory — private company, no SEC chip BOM.',
    disclosureNote: 'Private company — no SEC filing. Chiplet tier-1 modeled from foundry supply-chain disclosures.',
  },
  {
    id: 'groq-lpu',
    label: 'Groq LPU',
    shortLabel: 'Groq LPU',
    description: 'Groq Language Processing Unit — inference-only, SRAM-centric (not HBM-class).',
    productNode: 'Groq LPU',
    status: 'limited',
    category: 'AI Accelerators',
    anchorCompany: 'Groq',
    anchorCountry: 'US',
    secWatchlist: [...SUPPLY_CHAIN, 'AMKR'],
    subtitle: 'Different architecture — on-chip SRAM instead of HBM stack; no public SEC BOM.',
    disclosureNote: 'Private company — no SEC filing. SRAM-centric BOM modeled from foundry supply-chain disclosures.',
  },
  {
    id: 'cerebras-wse-3',
    label: 'Cerebras WSE-3',
    shortLabel: 'WSE-3',
    description: 'Cerebras wafer-scale engine — unique BOM without conventional HBM packaging.',
    productNode: 'Cerebras WSE-3',
    status: 'limited',
    category: 'AI Accelerators',
    anchorCompany: 'Cerebras',
    anchorCountry: 'US',
    secWatchlist: [...SUPPLY_CHAIN, 'AMKR'],
    subtitle: 'Wafer-scale die — totally different supply chain from H200/MI325X class accelerators.',
    disclosureNote: 'Private company — no SEC filing. Wafer-scale fab-heavy BOM; no HBM tier like H200/MI325X.',
  },
];

export function getTopic(id) {
  return TOPICS.find((t) => t.id === id);
}

export function getActiveTopics() {
  return TOPICS.filter((t) => t.status === 'active');
}

export function getLimitedTopics() {
  return TOPICS.filter((t) => t.status === 'limited');
}

/** Topics that receive a full supply-chain build in the pipeline. */
export function getBuildTopics() {
  return TOPICS.filter((t) => t.status === 'active' || t.status === 'limited');
}

/** @deprecated use getLimitedTopics */
export function getPlannedTopics() {
  return getLimitedTopics();
}

export function getDefaultTopicId() {
  return getActiveTopics()[0]?.id ?? 'nvidia-h200';
}

/** All unique SEC tickers required across build topics. */
export function allSecWatchlistTickers() {
  const set = new Set();
  for (const t of getBuildTopics()) {
    for (const ticker of t.secWatchlist ?? []) set.add(ticker);
  }
  return [...set].sort();
}
