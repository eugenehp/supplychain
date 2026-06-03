/** Normalize SEC geography tokens → ISO 3166-1 alpha-2 for materials distribution. */

export const MATERIALS_COUNTRY_NAMES = {
  US: 'United States',
  CN: 'China',
  JP: 'Japan',
  KR: 'South Korea',
  AU: 'Australia',
  CA: 'Canada',
  MM: 'Myanmar',
  TH: 'Thailand',
  NG: 'Nigeria',
  RU: 'Russia',
  TZ: 'Tanzania',
  MG: 'Madagascar',
  UG: 'Uganda',
  AO: 'Angola',
  MW: 'Malawi',
  SL: 'Sierra Leone',
  MY: 'Malaysia',
  VN: 'Vietnam',
  IN: 'India',
  BR: 'Brazil',
  CL: 'Chile',
  GL: 'Greenland',
  MN: 'Mongolia',
  ZA: 'South Africa',
  NA: 'Namibia',
  TW: 'Taiwan',
  DE: 'Germany',
  GB: 'United Kingdom',
  FR: 'France',
  NL: 'Netherlands',
};

/** @type {{ re: RegExp, code: keyof typeof MATERIALS_COUNTRY_NAMES }[]} */
export const GEO_TOKENS = [
  { re: /\bUnited States(?: of America)?\b|\bU\.S\.A?\.?\b|\bUSA\b/gi, code: 'US' },
  { re: /\bChina\b|\bPRC\b|\bChinese\b|\bInner Mongolia\b|\bBayan Obo\b/gi, code: 'CN' },
  { re: /\bJapan(?:ese)?\b/gi, code: 'JP' },
  { re: /\bSouth Korea\b|\bKorea\b/gi, code: 'KR' },
  { re: /\bAustralia(?:n)?\b/gi, code: 'AU' },
  { re: /\bCanada(?:ian)?\b/gi, code: 'CA' },
  { re: /\bMyanmar\b/gi, code: 'MM' },
  { re: /\bMalaysia(?:n)?\b/gi, code: 'MY' },
  { re: /\bVietnam(?:ese)?\b/gi, code: 'VN' },
  { re: /\bIndia(?:n)?\b/gi, code: 'IN' },
  { re: /\bBrazil(?:ian)?\b/gi, code: 'BR' },
  { re: /\bChile(?:an)?\b/gi, code: 'CL' },
  { re: /\bGreenland\b/gi, code: 'GL' },
  { re: /\bMongolia(?:n)?\b/gi, code: 'MN' },
  { re: /\bSouth Africa(?:n)?\b/gi, code: 'ZA' },
  { re: /\bNamibia(?:n)?\b/gi, code: 'NA' },
  { re: /\bTaiwan(?:ese)?\b/gi, code: 'TW' },
  { re: /\bGermany(?:n)?\b/gi, code: 'DE' },
  { re: /\bUnited Kingdom\b|\bUK\b/gi, code: 'GB' },
  { re: /\bFrance(?:n)?\b/gi, code: 'FR' },
  { re: /\bNetherlands(?:n)?\b|\bDutch\b/gi, code: 'NL' },
  // U.S. sites → US
  { re: /\bMountain Pass\b|\bBear Lodge\b|\bRound Top\b|\bWhite Mesa\b|\bStillwater\b/gi, code: 'US' },
  { re: /\bWyoming\b|\bCalifornia\b|\bTexas\b|\bUtah\b|\bNevada\b|\bOklahoma\b|\bColorado Plateau\b/gi, code: 'US' },
];

export function countryCodeToFlag(code) {
  if (!code || code.length !== 2) return '';
  const upper = code.toUpperCase();
  return String.fromCodePoint(...[...upper].map((c) => 0x1f1e6 - 65 + c.charCodeAt(0)));
}

export function countryMeta(code) {
  const c = code?.toUpperCase();
  return {
    code: c,
    name: MATERIALS_COUNTRY_NAMES[c] ?? c,
    flag: countryCodeToFlag(c),
  };
}

/** @param {string} text */
export function countCountriesInText(text) {
  /** @type {Map<string, number>} */
  const counts = new Map();
  if (!text) return counts;

  for (const { re, code } of GEO_TOKENS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      counts.set(code, (counts.get(code) ?? 0) + 1);
    }
  }
  return counts;
}

/** @param {Map<string, number>} a @param {Map<string, number>} b */
export function mergeCountryCounts(a, b) {
  for (const [code, n] of b) {
    a.set(code, (a.get(code) ?? 0) + n);
  }
  return a;
}
