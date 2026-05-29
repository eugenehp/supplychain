/** ISO 3166-1 alpha-2 → display name (HQ / primary operating jurisdiction). */
export const COUNTRY_NAMES = {
  US: 'United States',
  TW: 'Taiwan',
  KR: 'South Korea',
  JP: 'Japan',
  NL: 'Netherlands',
  DE: 'Germany',
  CH: 'Switzerland',
  GB: 'United Kingdom',
  BE: 'Belgium',
  FR: 'France',
  CN: 'China',
};

/** Fallback when supply-chain nodes omit `country` (synced from topic NODE_META). */
export const NODE_COUNTRIES = {
  'Nvidia H200': 'US',
  'AMD MI325X': 'US',
  'Intel Gaudi 3': 'US',
  'AWS Trainium 2': 'US',
  'AWS Inferentia 2': 'US',
  'Microsoft Maia 100': 'US',
  'Google TPU v5p': 'US',
  'Nvidia B200': 'US',
  'AMD MI350X': 'US',
  'Intel Falcon Shores': 'US',
  'AWS Trainium 3': 'US',
  'Google TPU v6': 'US',
  'Huawei Ascend 910C': 'CN',
  'Meta MTIA v2': 'US',
  'Microsoft Maia 200': 'US',
  'Baidu Kunlun 2': 'CN',
  'SambaNova SN40': 'US',
  'Tenstorrent Blackhole': 'US',
  'Groq LPU': 'US',
  'Cerebras WSE-3': 'US',
  Intel: 'US',
  TSMC: 'TW',
  Samsung: 'KR',
  'SK Hynix': 'KR',
  Micron: 'US',
  'Hon Hai (Foxconn)': 'TW',
  Wistron: 'TW',
  Fabrinet: 'US',
  Amkor: 'US',
  GlobalFoundries: 'US',
  'ASE Technology': 'TW',
  Synopsys: 'US',
  Cadence: 'US',
  'Siemens EDA': 'DE',
  Ansys: 'US',
  Arm: 'GB',
  ASML: 'NL',
  'Applied Materials': 'US',
  'Lam Research': 'US',
  KLA: 'US',
  'Tokyo Electron': 'JP',
  'Hitachi High-Tech': 'JP',
  'Onto Innovation': 'US',
  'ASM International': 'NL',
  'Wonik IPS': 'KR',
  Lasertec: 'JP',
  Nikon: 'JP',
  Canon: 'JP',
  JSR: 'JP',
  'Shin-Etsu (PR)': 'JP',
  'Shin-Etsu (Wafers)': 'JP',
  Linde: 'DE',
  Ibiden: 'JP',
  Zeiss: 'DE',
  'Carl Zeiss SMT': 'DE',
  Cymer: 'US',
  Trumpf: 'DE',
  'VAT Group': 'CH',
  TOTO: 'JP',
  Schott: 'DE',
  Hoya: 'JP',
  Corning: 'US',
  'Pfeiffer Vacuum': 'DE',
  Ferrotec: 'JP',
  'IPG Photonics': 'US',
  'SGL Carbon': 'DE',
  'Morgan Advanced Materials': 'GB',
  Materion: 'US',
  Sibelco: 'BE',
  'Sumitomo Metal Mining': 'JP',
};

/** @param {string | null | undefined} code */
export function countryCodeToFlag(code) {
  if (!code || code.length !== 2) return '';
  const upper = code.toUpperCase();
  return String.fromCodePoint(
    ...[...upper].map((c) => 0x1f1e6 - 65 + c.charCodeAt(0)),
  );
}

/** @param {{ id?: string, name?: string, country?: string } | string} nodeOrName */
export function countryForNode(nodeOrName) {
  if (typeof nodeOrName === 'string') {
    return NODE_COUNTRIES[nodeOrName] ?? null;
  }
  return nodeOrName?.country ?? NODE_COUNTRIES[nodeOrName?.id ?? nodeOrName?.name ?? ''] ?? null;
}

/** @param {{ id?: string, name?: string, country?: string } | string} nodeOrName */
export function geoLabelForNode(nodeOrName) {
  const code = countryForNode(nodeOrName);
  if (!code) return null;
  return {
    code,
    flag: countryCodeToFlag(code),
    name: COUNTRY_NAMES[code] ?? code,
  };
}

/** Unique countries present in a node list, sorted by name. */
export function countriesInGraph(nodes = []) {
  const seen = new Map();
  for (const node of nodes) {
    const geo = geoLabelForNode(node);
    if (geo && !seen.has(geo.code)) seen.set(geo.code, geo);
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
}
