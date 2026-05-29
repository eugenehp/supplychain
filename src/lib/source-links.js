/** Client-side source link helpers */

const LEGACY_STRING_MAP = {
  'SEC 10-K / 20-F filings': {
    label: 'SEC EDGAR — search U.S. company filings',
    url: 'https://www.sec.gov/search-filings',
    kind: 'registry',
  },
  'SEC-grounded vendor catalog with verbatim filing snippets': {
    label: 'SEC-grounded excerpts (bundled in this report)',
    url: '#sec-evidence',
    kind: 'report',
  },
  'TrendForce HBM market share': {
    label: 'TrendForce — HBM market share projections (2025)',
    url: 'https://www.trendforce.com/news/2025/08/18/news-nvidia-reportedly-drives-27-of-sk-hynix-revenue-in-1h25-cementing-ai-chip-partnership/',
    kind: 'industry',
  },
  'SemiAnalysis H200 BOM': {
    label: 'SemiAnalysis — H200 accelerator & HBM supply chain model',
    url: 'https://semianalysis.com/accelerator-hbm-model/',
    kind: 'industry',
  },
  'Yole Group substrate analyses': {
    label: 'Yole Group — advanced packaging & CoWoS substrate demand',
    url: 'https://www.yolegroup.com/pressrelease/advanced-packaging-market-expected-to-reach-us-89-4-billion-by-2030-yole-group-says/',
    kind: 'industry',
  },
};

export function normalizeSource(entry) {
  if (!entry) return null;
  if (typeof entry === 'string') {
    const legacy = LEGACY_STRING_MAP[entry];
    if (legacy) return { id: entry, ...legacy };
    return { id: entry, label: entry, url: null, kind: 'unknown' };
  }
  return entry;
}

export function isExternalUrl(url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url);
}

export function sourceLinkProps(source) {
  const s = normalizeSource(source);
  if (!s?.url) return { href: null, external: false };
  return {
    href: s.url,
    external: isExternalUrl(s.url),
  };
}

export function groupSourcesByKind(sources = []) {
  const groups = [
    { kind: 'registry', title: 'Primary registries', items: [] },
    { kind: 'report', title: 'This report', items: [] },
    { kind: 'industry', title: 'Industry & research', items: [] },
    { kind: 'sec_filing', title: 'Indexed SEC filings', items: [] },
    { kind: 'unknown', title: 'Other', items: [] },
  ];
  const map = new Map(groups.map((g) => [g.kind, g]));

  for (const raw of sources) {
    const s = normalizeSource(raw);
    if (!s) continue;
    const bucket = map.get(s.kind) ?? map.get('unknown');
    bucket.items.push(s);
  }

  return groups.filter((g) => g.items.length > 0);
}
