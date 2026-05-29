/** Public, verifiable source catalog for methodology citations */

export const SOURCE_CATALOG = {
  sec_edgar: {
    id: 'sec_edgar',
    label: 'SEC EDGAR — search U.S. company filings',
    url: 'https://www.sec.gov/search-filings',
    kind: 'registry',
  },
  sec_evidence: {
    id: 'sec_evidence',
    label: 'SEC-grounded excerpts (bundled in this report)',
    url: '#sec-evidence',
    kind: 'report',
  },
  trendforce_hbm: {
    id: 'trendforce_hbm',
    label: 'TrendForce — HBM market share projections (2025)',
    url: 'https://www.trendforce.com/news/2025/08/18/news-nvidia-reportedly-drives-27-of-sk-hynix-revenue-in-1h25-cementing-ai-chip-partnership/',
    kind: 'industry',
  },
  semianalysis_h200: {
    id: 'semianalysis_hbm',
    label: 'SemiAnalysis — H200 accelerator & HBM supply chain model',
    url: 'https://semianalysis.com/accelerator-hbm-model/',
    kind: 'industry',
  },
  semianalysis_h200_benchmark: {
    id: 'semianalysis_h200_benchmark',
    label: 'SemiAnalysis — H200 public benchmark & architecture notes',
    url: 'https://newsletter.semianalysis.com/p/mi300x-vs-h100-vs-h200-benchmark-part-1-training',
    kind: 'industry',
  },
  semianalysis_mi325x: {
    id: 'semianalysis_mi325x',
    label: 'SemiAnalysis — MI300X / MI325X accelerator & HBM supply chain',
    url: 'https://semianalysis.com/accelerator-hbm-model/',
    kind: 'industry',
  },
  amd_instinct_launch: {
    id: 'amd_instinct_launch',
    label: 'AMD — Instinct MI325X product brief',
    url: 'https://www.amd.com/en/products/accelerators/instinct/mi325x.html',
    kind: 'industry',
  },
  yole_advanced_packaging: {
    id: 'yole_advanced_packaging',
    label: 'Yole Group — advanced packaging & CoWoS substrate demand',
    url: 'https://www.yolegroup.com/pressrelease/advanced-packaging-market-expected-to-reach-us-89-4-billion-by-2030-yole-group-says/',
    kind: 'industry',
  },
};

/** Default third-party source keys per topic */
export const TOPIC_SOURCE_KEYS = {
  'nvidia-h200': [
    'trendforce_hbm',
    'semianalysis_h200',
    'semianalysis_h200_benchmark',
    'yole_advanced_packaging',
  ],
  'amd-mi325x': [
    'trendforce_hbm',
    'semianalysis_h200_benchmark',
    'semianalysis_mi325x',
    'amd_instinct_launch',
    'yole_advanced_packaging',
  ],
  'intel-gaudi-3': ['trendforce_hbm', 'semianalysis_h200_benchmark', 'yole_advanced_packaging'],
  'aws-trainium-2': ['trendforce_hbm', 'semianalysis_h200_benchmark', 'yole_advanced_packaging'],
  'aws-inferentia-2': ['trendforce_hbm', 'semianalysis_h200_benchmark', 'yole_advanced_packaging'],
  'microsoft-maia-100': ['trendforce_hbm', 'semianalysis_h200_benchmark', 'yole_advanced_packaging'],
  'google-tpu-v5p': ['trendforce_hbm', 'semianalysis_h200_benchmark', 'yole_advanced_packaging'],
  'google-tpu-v6': ['trendforce_hbm', 'semianalysis_h200_benchmark', 'yole_advanced_packaging'],
  'nvidia-b200': [
    'trendforce_hbm',
    'semianalysis_h200',
    'semianalysis_h200_benchmark',
    'yole_advanced_packaging',
  ],
  'amd-mi350x': [
    'trendforce_hbm',
    'semianalysis_h200_benchmark',
    'semianalysis_mi325x',
    'amd_instinct_launch',
    'yole_advanced_packaging',
  ],
  'intel-falcon-shores': ['trendforce_hbm', 'semianalysis_h200_benchmark', 'yole_advanced_packaging'],
  'aws-trainium-3': ['trendforce_hbm', 'semianalysis_h200_benchmark', 'yole_advanced_packaging'],
  'microsoft-maia-200': ['trendforce_hbm', 'semianalysis_h200_benchmark', 'yole_advanced_packaging'],
  'baidu-kunlun-2': ['trendforce_hbm', 'semianalysis_h200_benchmark', 'yole_advanced_packaging'],
  'sambanova-sn40': ['semianalysis_h200_benchmark', 'yole_advanced_packaging'],
  'tenstorrent-blackhole': ['semianalysis_h200_benchmark', 'yole_advanced_packaging'],
  'meta-mtia-v2': ['trendforce_hbm', 'semianalysis_h200_benchmark', 'yole_advanced_packaging'],
  'huawei-ascend-910c': ['trendforce_hbm', 'semianalysis_h200_benchmark', 'yole_advanced_packaging'],
  'groq-lpu': ['semianalysis_h200_benchmark', 'yole_advanced_packaging'],
  'cerebras-wse-3': ['semianalysis_h200_benchmark', 'yole_advanced_packaging'],
};

export function sourceFromKey(key) {
  const src = SOURCE_CATALOG[key];
  if (!src) return null;
  return { ...src };
}

export function buildMethodologySources(topicId, secFilings = []) {
  const keys = TOPIC_SOURCE_KEYS[topicId] ?? [];
  const sources = [
    sourceFromKey('sec_edgar'),
    sourceFromKey('sec_evidence'),
    ...keys.map(sourceFromKey).filter(Boolean),
  ];

  for (const filing of secFilings) {
    if (!filing?.filingUrl) continue;
    const form = filing.filing?.form ?? 'SEC filing';
    const date = filing.filing?.filingDate ?? '';
    sources.push({
      id: `sec_filing_${filing.ticker}`,
      label: `${filing.ticker} — ${filing.name ?? filing.ticker} ${form}${date ? ` (${date})` : ''}`,
      url: filing.filingUrl,
      kind: 'sec_filing',
      ticker: filing.ticker,
    });
  }

  return sources;
}

/** Normalize legacy string sources from older datasets */
export function normalizeSource(entry) {
  if (typeof entry === 'string') {
    const legacy = LEGACY_STRING_MAP[entry];
    if (legacy) return { ...legacy };
    return { id: entry, label: entry, url: null, kind: 'unknown' };
  }
  return entry;
}

const LEGACY_STRING_MAP = {
  'SEC 10-K / 20-F filings': SOURCE_CATALOG.sec_edgar,
  'SEC-grounded vendor catalog with verbatim filing snippets': SOURCE_CATALOG.sec_evidence,
  'TrendForce HBM market share': SOURCE_CATALOG.trendforce_hbm,
  'SemiAnalysis H200 BOM': SOURCE_CATALOG.semianalysis_h200,
  'Yole Group substrate analyses': SOURCE_CATALOG.yole_advanced_packaging,
};
