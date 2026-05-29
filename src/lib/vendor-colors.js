/**
 * Single source of truth for company / vendor brand colors (charts, logos, badges).
 * @typedef {{ name?: string, ticker?: string, color: string, bg: string, text?: string, initials?: string }} VendorBrand
 */

/** Fallback when a node has no mapped company brand. */
export const DEFAULT_BRAND_COLOR = '#76B900';

export const GROUP_COLORS = {
  product: DEFAULT_BRAND_COLOR,
  foundry: '#E50012',
  memory: '#E60012',
  osat: '#003087',
  eda: '#5C2D91',
  equipment: '#0085CA',
  materials: '#006272',
  subcomponent: '#0071C5',
  raw: '#E35205',
  commodity: '#8D6E63',
  other: '#ADB5BD',
};

/** @type {Record<string, VendorBrand>} */
export const TICKER_BRANDS = {
  NVDA: { name: 'NVIDIA', color: '#76B900', bg: '#1A1A1A', text: '#76B900' },
  AMD: { name: 'AMD', color: '#ED1C24', bg: '#000000', text: '#FFFFFF' },
  INTC: { name: 'Intel', color: '#0071C5', bg: '#0071C5', text: '#FFFFFF' },
  AMZN: { name: 'Amazon', color: '#FF9900', bg: '#131921', text: '#FF9900' },
  MSFT: { name: 'Microsoft', color: '#0078D4', bg: '#0078D4', text: '#FFFFFF' },
  GOOGL: { name: 'Alphabet', color: '#4285F4', bg: '#4285F4', text: '#FFFFFF' },
  META: { name: 'Meta', color: '#0081FB', bg: '#0081FB', text: '#FFFFFF' },
  BIDU: { name: 'Baidu', color: '#2932E1', bg: '#2932E1', text: '#FFFFFF' },
  TSM: { name: 'TSMC', color: '#E50012', bg: '#E50012', text: '#FFFFFF' },
  ASML: { name: 'ASML', color: '#0085CA', bg: '#0085CA', text: '#FFFFFF' },
  AMAT: { name: 'Applied Materials', color: '#00629B', bg: '#00629B', text: '#FFFFFF' },
  LRCX: { name: 'Lam Research', color: '#003087', bg: '#003087', text: '#FFFFFF' },
  KLAC: { name: 'KLA', color: '#006272', bg: '#006272', text: '#FFFFFF' },
  SNPS: { name: 'Synopsys', color: '#5C2D91', bg: '#5C2D91', text: '#FFFFFF' },
  CDNS: { name: 'Cadence', color: '#DA1F38', bg: '#DA1F38', text: '#FFFFFF' },
  MU: { name: 'Micron', color: '#0077C8', bg: '#0077C8', text: '#FFFFFF' },
  AMKR: { name: 'Amkor', color: '#003087', bg: '#003087', text: '#FFFFFF' },
  GFS: { name: 'GlobalFoundries', color: '#E35205', bg: '#E35205', text: '#FFFFFF' },
};

/** Sankey / pack node id → SEC ticker (when applicable). */
export const NODE_TO_TICKER = {
  'Nvidia H200': 'NVDA',
  'AMD MI325X': 'AMD',
  'Intel Gaudi 3': 'INTC',
  'AWS Trainium 2': 'AMZN',
  'AWS Inferentia 2': 'AMZN',
  'Microsoft Maia 100': 'MSFT',
  'Google TPU v5p': 'GOOGL',
  'Nvidia B200': 'NVDA',
  'AMD MI350X': 'AMD',
  'Intel Falcon Shores': 'INTC',
  'AWS Trainium 3': 'AMZN',
  'Google TPU v6': 'GOOGL',
  'Meta MTIA v2': 'META',
  'Microsoft Maia 200': 'MSFT',
  'Baidu Kunlun 2': 'BIDU',
  NVDA: 'NVDA',
  AMD: 'AMD',
  INTC: 'INTC',
  Intel: 'INTC',
  AMZN: 'AMZN',
  MSFT: 'MSFT',
  GOOGL: 'GOOGL',
  META: 'META',
  BIDU: 'BIDU',
  TSMC: 'TSM',
  TSM: 'TSM',
  Micron: 'MU',
  MU: 'MU',
  Synopsys: 'SNPS',
  SNPS: 'SNPS',
  Cadence: 'CDNS',
  CDNS: 'CDNS',
  ASML: 'ASML',
  'Applied Materials': 'AMAT',
  AMAT: 'AMAT',
  'Lam Research': 'LRCX',
  LRCX: 'LRCX',
  KLA: 'KLAC',
  KLAC: 'KLAC',
  Amkor: 'AMKR',
  AMKR: 'AMKR',
  GlobalFoundries: 'GFS',
  GFS: 'GFS',
};

/** @param {VendorBrand} brand @param {string} id */
function withId(brand, id) {
  return { ...brand, name: brand.name ?? id };
}

/** @type {Record<string, VendorBrand>} */
export const VENDOR_BRANDS = {
  'Nvidia H200': withId(TICKER_BRANDS.NVDA, 'Nvidia H200'),
  'AMD MI325X': withId(TICKER_BRANDS.AMD, 'AMD MI325X'),
  'Intel Gaudi 3': withId(TICKER_BRANDS.INTC, 'Intel Gaudi 3'),
  'AWS Trainium 2': withId(TICKER_BRANDS.AMZN, 'AWS Trainium 2'),
  'AWS Inferentia 2': withId(TICKER_BRANDS.AMZN, 'AWS Inferentia 2'),
  'Microsoft Maia 100': withId(TICKER_BRANDS.MSFT, 'Microsoft Maia 100'),
  'Google TPU v5p': withId(TICKER_BRANDS.GOOGL, 'Google TPU v5p'),
  'Nvidia B200': withId(TICKER_BRANDS.NVDA, 'Nvidia B200'),
  'AMD MI350X': withId(TICKER_BRANDS.AMD, 'AMD MI350X'),
  'Intel Falcon Shores': withId(TICKER_BRANDS.INTC, 'Intel Falcon Shores'),
  'AWS Trainium 3': withId(TICKER_BRANDS.AMZN, 'AWS Trainium 3'),
  'Google TPU v6': withId(TICKER_BRANDS.GOOGL, 'Google TPU v6'),
  'Microsoft Maia 200': withId(TICKER_BRANDS.MSFT, 'Microsoft Maia 200'),
  'Baidu Kunlun 2': withId(TICKER_BRANDS.BIDU, 'Baidu Kunlun 2'),
  'Huawei Ascend 910C': { name: 'Huawei', color: '#CF0A2C', bg: '#CF0A2C', text: '#FFFFFF', initials: 'HW' },
  'Meta MTIA v2': withId(TICKER_BRANDS.META, 'Meta MTIA v2'),
  'SambaNova SN40': { name: 'SambaNova', color: '#6B2D5B', bg: '#6B2D5B', text: '#FFFFFF', initials: 'SN' },
  'Tenstorrent Blackhole': { name: 'Tenstorrent', color: '#1E3A5F', bg: '#1E3A5F', text: '#FFFFFF', initials: 'TT' },
  'Groq LPU': { name: 'Groq', color: '#F55036', bg: '#1A1A1A', text: '#F55036', initials: 'GQ' },
  'Cerebras WSE-3': { name: 'Cerebras', color: '#FF6B00', bg: '#1A1A1A', text: '#FF6B00', initials: 'CB' },
  TSMC: withId(TICKER_BRANDS.TSM, 'TSMC'),
  Intel: withId(TICKER_BRANDS.INTC, 'Intel'),
  Samsung: { color: '#1428A0', bg: '#1428A0', text: '#FFFFFF', initials: 'SS' },
  'SK Hynix': { color: '#E60012', bg: '#E60012', text: '#FFFFFF', initials: 'SK' },
  Micron: withId(TICKER_BRANDS.MU, 'Micron'),
  Amkor: withId(TICKER_BRANDS.AMKR, 'Amkor'),
  GlobalFoundries: withId(TICKER_BRANDS.GFS, 'GlobalFoundries'),
  'Hon Hai (Foxconn)': { color: '#003087', bg: '#003087', text: '#FFFFFF', initials: 'HH' },
  Wistron: { color: '#0054A6', bg: '#0054A6', text: '#FFFFFF', initials: 'WI' },
  Fabrinet: { color: '#006272', bg: '#006272', text: '#FFFFFF', initials: 'FN' },
  'ASE Technology': { color: '#C41230', bg: '#C41230', text: '#FFFFFF', initials: 'AS' },
  Synopsys: withId(TICKER_BRANDS.SNPS, 'Synopsys'),
  Cadence: withId(TICKER_BRANDS.CDNS, 'Cadence'),
  'Siemens EDA': { color: '#009999', bg: '#009999', text: '#FFFFFF', initials: 'SE' },
  Ansys: { color: '#FFB71B', bg: '#FFB71B', text: '#1A1A1A', initials: 'AN' },
  Arm: { color: '#0091BD', bg: '#0091BD', text: '#FFFFFF', initials: 'AR' },
  ASML: withId(TICKER_BRANDS.ASML, 'ASML'),
  'Applied Materials': withId(TICKER_BRANDS.AMAT, 'Applied Materials'),
  'Lam Research': withId(TICKER_BRANDS.LRCX, 'Lam Research'),
  KLA: withId(TICKER_BRANDS.KLAC, 'KLA'),
  'Tokyo Electron': { color: '#004098', bg: '#004098', text: '#FFFFFF', initials: 'TE' },
  'Hitachi High-Tech': { color: '#E60027', bg: '#E60027', text: '#FFFFFF', initials: 'HT' },
  'Onto Innovation': { color: '#006272', bg: '#006272', text: '#FFFFFF', initials: 'ON' },
  'ASM International': { color: '#003366', bg: '#003366', text: '#FFFFFF', initials: 'AI' },
  'Wonik IPS': { color: '#0054A6', bg: '#0054A6', text: '#FFFFFF', initials: 'WI' },
  Lasertec: { color: '#333333', bg: '#333333', text: '#FFFFFF', initials: 'LT' },
  Nikon: { color: '#FFCC00', bg: '#FFCC00', text: '#1A1A1A', initials: 'NK' },
  Canon: { color: '#CC0000', bg: '#CC0000', text: '#FFFFFF', initials: 'CA' },
  JSR: { color: '#005BAC', bg: '#005BAC', text: '#FFFFFF', initials: 'JS' },
  'Shin-Etsu (PR)': { color: '#006633', bg: '#006633', text: '#FFFFFF', initials: 'SE' },
  'Shin-Etsu (Wafers)': { color: '#006633', bg: '#006633', text: '#FFFFFF', initials: 'SE' },
  Linde: { color: '#0066B3', bg: '#0066B3', text: '#FFFFFF', initials: 'LI' },
  Ibiden: { color: '#004080', bg: '#004080', text: '#FFFFFF', initials: 'IB' },
  Zeiss: { color: '#0066CC', bg: '#0066CC', text: '#FFFFFF', initials: 'ZE' },
  'Carl Zeiss SMT': { color: '#0066CC', bg: '#0066CC', text: '#FFFFFF', initials: 'ZE' },
  Cymer: { color: '#0085CA', bg: '#0085CA', text: '#FFFFFF', initials: 'CY' },
  Trumpf: { color: '#005A8C', bg: '#005A8C', text: '#FFFFFF', initials: 'TR' },
  'VAT Group': { color: '#E30613', bg: '#E30613', text: '#FFFFFF', initials: 'VA' },
  TOTO: { color: '#003366', bg: '#003366', text: '#FFFFFF', initials: 'TO' },
  Schott: { color: '#005596', bg: '#005596', text: '#FFFFFF', initials: 'SC' },
  Hoya: { color: '#006633', bg: '#006633', text: '#FFFFFF', initials: 'HO' },
  Corning: { color: '#0072CE', bg: '#0072CE', text: '#FFFFFF', initials: 'CO' },
  'Pfeiffer Vacuum': { color: '#003366', bg: '#003366', text: '#FFFFFF', initials: 'PV' },
  Ferrotec: { color: '#006272', bg: '#006272', text: '#FFFFFF', initials: 'FE' },
  'IPG Photonics': { color: '#CC0000', bg: '#CC0000', text: '#FFFFFF', initials: 'IP' },
  'SGL Carbon': { color: '#333333', bg: '#333333', text: '#FFFFFF', initials: 'SG' },
  'Morgan Advanced Materials': { color: '#003366', bg: '#003366', text: '#FFFFFF', initials: 'MA' },
  Materion: { color: '#006272', bg: '#006272', text: '#FFFFFF', initials: 'MT' },
  Sibelco: { color: '#005596', bg: '#005596', text: '#FFFFFF', initials: 'SI' },
  'Sumitomo Metal Mining': { color: '#004080', bg: '#004080', text: '#FFFFFF', initials: 'SM' },
};

/** @param {string | null | undefined} ticker */
export function brandForTicker(ticker) {
  if (!ticker) return null;
  const brand = TICKER_BRANDS[ticker.toUpperCase()];
  if (!brand) return null;
  return { ...brand, ticker: ticker.toUpperCase() };
}

/** @param {{ id?: string, name?: string, group?: string } | string} nodeOrId */
export function brandForNode(nodeOrId) {
  const id = typeof nodeOrId === 'string' ? nodeOrId : nodeOrId?.id ?? nodeOrId?.name ?? '';
  if (!id) return null;

  if (VENDOR_BRANDS[id]) {
    const b = VENDOR_BRANDS[id];
    return { ...b, name: b.name ?? id };
  }

  const ticker = NODE_TO_TICKER[id];
  if (ticker) {
    const b = brandForTicker(ticker);
    if (b) return { ...b, name: b.name ?? id };
  }

  if (TICKER_BRANDS[id.toUpperCase()]) {
    return brandForTicker(id);
  }

  return null;
}

/** @param {{ id?: string, name?: string, group?: string }} node */
export function nodeFillColor(node) {
  return brandForNode(node)?.color ?? GROUP_COLORS[node?.group ?? 'other'] ?? GROUP_COLORS.other;
}

/** @param {{ source?: { id?: string, name?: string, group?: string } }} link */
export function linkFillColor(link) {
  if (link?.source) return nodeFillColor(link.source);
  return GROUP_COLORS.other;
}

/** @param {string} group */
export function groupColor(group) {
  return GROUP_COLORS[group] ?? GROUP_COLORS.other;
}
