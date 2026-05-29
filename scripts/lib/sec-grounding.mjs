import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { companyRawDir, topicDir } from './paths.mjs';
import { htmlToText } from './filing-processor.mjs';
import * as nvidiaH200 from './topics/nvidia-h200.mjs';

/** Regex patterns → canonical vendor name (shared across topics for now) */
export const SEC_VENDOR_PATTERNS = [
  { name: 'TSMC', re: /Taiwan Semiconductor Manufacturing Company(?: Limited)?(?:,|\s|\)|\.|\s+or\s+TSMC)/gi },
  { name: 'Samsung', re: /Samsung Electronics(?: Co\.?,?\s+Ltd\.?)?/gi },
  { name: 'SK Hynix', re: /SK\s+[Hh]ynix(?: Inc\.?)?/gi },
  { name: 'Micron', re: /Micron Technology(?:,?\s+Inc\.?)?/gi },
  { name: 'Hon Hai (Foxconn)', re: /Hon Hai Precision Industry(?: Co\.?,?\s+Ltd\.?)?/gi },
  { name: 'Wistron', re: /Wistron Corporation/gi },
  { name: 'Fabrinet', re: /Fabrinet/gi },
  { name: 'Carl Zeiss SMT', re: /Carl Zeiss SMT(?: Holding GmbH(?: & Co\.?)?| GmbH)?/gi },
  { name: 'Cymer', re: /\bCymer\b/gi },
  { name: 'Tokyo Electron', re: /Tokyo Electron(?:,?\s+Ltd\.?)?/gi },
  { name: 'Hitachi High-Tech', re: /Hitachi(?: High-Technologies Corporation|,?\s+Ltd\.?)/gi },
  { name: 'Onto Innovation', re: /Onto Innovation(?:,?\s+Inc\.?)?/gi },
  { name: 'ASM International', re: /ASM International/gi },
  { name: 'Wonik IPS', re: /Wonik IPS/gi },
  { name: 'Applied Materials', re: /Applied Materials(?:,?\s+Inc\.?)?/gi },
  { name: 'Lam Research', re: /Lam Research(?: Corporation)?/gi },
  { name: 'KLA', re: /KLA(?: Corporation|-Tencor Corporation)?/gi },
  { name: 'ASML', re: /ASML(?: Holding N\.V\.)?/gi },
  { name: 'Synopsys', re: /Synopsys(?:,?\s+Inc\.?)?/gi },
  { name: 'Cadence', re: /Cadence(?: Design Systems,?\s+Inc\.?)?/gi },
  { name: 'Siemens EDA', re: /Siemens EDA/gi },
  { name: 'Ansys', re: /Ansys(?:,?\s+Inc\.?)?/gi },
  { name: 'Arm', re: /Arm(?: Holdings| Limited)?/gi },
  { name: 'ASE Technology', re: /\bASE\b(?: Technology(?: Holding Co\.?,?\s+Ltd\.?)?)?/gi },
  { name: 'Lasertec', re: /Lasertec(?:,?\s+Inc\.?)?/gi },
  { name: 'VAT Group', re: /\bVAT\b(?: Group)?(?:\s+Group)?/gi },
  { name: 'Nikon', re: /\bNikon Corporation\b/gi },
  { name: 'Canon', re: /\bCanon Inc\.?\b/gi },
  { name: 'Corning', re: /\bCorning(?: Incorporated| Inc\.?)?\b/gi },
  { name: 'Schott', re: /\bSchott(?: AG)?\b/gi },
  { name: 'Amkor', re: /\bAmkor Technology(?:,?\s+Inc\.?)?\b/gi },
  { name: 'GlobalFoundries', re: /GlobalFoundries(?: Inc\.?)?/gi },
];

function snippetAround(text, index, len = 220) {
  const start = Math.max(0, index - 90);
  const end = Math.min(text.length, index + len);
  return text.slice(start, end).replace(/\s+/g, ' ').trim();
}

function isQualitySnippet(text) {
  if (!text || text.length < 40) return false;
  if (/xbrli:|iso4217:|http:\/\/fasb|asml:employee|utr:Rate/i.test(text)) return false;
  if ((text.match(/[a-zA-Z]/g)?.length ?? 0) < text.length * 0.5) return false;
  return true;
}

function cleanFilingText(text) {
  const markers = [
    /UNITED STATES\s+SECURITIES AND EXCHANGE COMMISSION/i,
    /Item\s+1\.\s*Business/i,
    /ITEM\s+1[\.\s\-–—]+BUSINESS/i,
    /FORM\s+10-K/i,
    /FORM\s+20-F/i,
  ];
  for (const m of markers) {
    const idx = text.search(m);
    if (idx >= 0 && idx < 80000) return text.slice(idx).trim();
  }
  return text.trim();
}

export function extractFromFilingText(text, ticker, form, filingDate) {
  const found = new Map();
  for (const { name, re } of SEC_VENDOR_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      const prev = found.get(name) ?? { name, count: 0, snippets: [], filings: [] };
      prev.count++;
      if (prev.snippets.length < 3) {
        const snip = snippetAround(text, m.index);
        if (isQualitySnippet(snip)) prev.snippets.push(snip);
      }
      prev.filings.push({ ticker, form, filingDate });
      found.set(name, prev);
    }
  }
  return [...found.values()];
}

export function extractSecGroundedVendors(tickers) {
  const all = new Map();
  for (const ticker of tickers) {
    const htmlPath = join(companyRawDir(ticker), 'filing.html');
    const metaPath = join(companyRawDir(ticker), 'metadata.json');
    if (!existsSync(htmlPath)) continue;
    const html = readFileSync(htmlPath, 'utf8');
    const meta = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, 'utf8')) : {};
    const text = cleanFilingText(htmlToText(html));
    for (const v of extractFromFilingText(text, ticker, meta.filing?.form, meta.filing?.filingDate)) {
      const prev = all.get(v.name) ?? { ...v, count: 0, snippets: [], filings: [] };
      prev.count += v.count;
      prev.snippets.push(...v.snippets);
      prev.filings.push(...v.filings);
      prev.snippets = [...new Set(prev.snippets)].slice(0, 5);
      all.set(v.name, prev);
    }
  }
  return [...all.values()].sort((a, b) => b.count - a.count);
}

export function writeSecGroundedCatalog(topicId, vendors) {
  const dir = topicDir(topicId);
  mkdirSync(dir, { recursive: true });
  const out = {
    generatedAt: new Date().toISOString(),
    topicId,
    source: 'SEC 10-K / 20-F filing text (verbatim snippets)',
    vendorCount: vendors.length,
    vendors,
  };
  writeFileSync(join(dir, 'sec-grounded-vendors.json'), JSON.stringify(out, null, 2));
  return out;
}

export function buildLinksFromSecRoles(secSupplyRoles, groundedVendors = [], materialsAllowlist = [], productNode = nvidiaH200.PRODUCT_NODE) {
  const groundedSet = new Set(groundedVendors.map((v) => v.name));
  const links = [];

  const equipBase = { ASML: 52, 'Applied Materials': 38, 'Lam Research': 32, KLA: 18, 'Tokyo Electron': 22 };
  const equipExtra = { 'Hitachi High-Tech': 8, 'Onto Innovation': 6, 'ASM International': 7, 'Wonik IPS': 5, Lasertec: 5, Nikon: 4, Canon: 3 };
  const matBase = { JSR: 8, 'Shin-Etsu (PR)': 6, 'Shin-Etsu (Wafers)': 12, Linde: 9, Ibiden: 15 };
  const tier3Base = { 'Carl Zeiss SMT': 22, Cymer: 10, Trumpf: 12, 'VAT Group': 4, TOTO: 6 };
  const tier4Base = { Schott: 8, Hoya: 6, Corning: 5, 'Pfeiffer Vacuum': 4, Ferrotec: 3, 'IPG Photonics': 5 };
  const tier5Base = { 'SGL Carbon': 3, 'Morgan Advanced Materials': 2, Materion: 2, Sibelco: 2, 'Sumitomo Metal Mining': 2 };

  for (const [name, role] of Object.entries(secSupplyRoles)) {
    if (groundedVendors.length && !groundedSet.has(name) && !materialsAllowlist.includes(name)) continue;

    if (role.tier === 1) {
      for (const target of role.targets) {
        links.push({ source: name, target, value: role.value ?? 10, tier: 1, origin: 'sec_grounded', note: role.note });
      }
      if (name === 'Samsung' && productNode === 'Nvidia H200') {
        links.push({ source: 'Samsung', target: productNode, value: 14, tier: 1, origin: 'sec_grounded', note: 'NVDA 10-K: secondary foundry' });
      }
      continue;
    }

    if (role.tier === 2 && equipBase[name]) {
      const share = { TSMC: 0.45, 'SK Hynix': 0.28, Samsung: 0.15, Micron: 0.12 };
      for (const target of role.targets) {
        links.push({ source: name, target, value: Math.round(equipBase[name] * (share[target] ?? 0.2) * 100) / 100, tier: 2, origin: 'sec_grounded' });
      }
    } else if (role.tier === 2 && equipExtra[name]) {
      for (const target of role.targets) {
        links.push({ source: name, target, value: equipExtra[name], tier: 2, origin: 'sec_grounded', note: role.note });
      }
    } else if (role.tier === 2 && matBase[name]) {
      const share = { TSMC: 0.55, 'SK Hynix': 0.35, Samsung: 0.1 };
      for (const target of role.targets) {
        links.push({ source: name, target, value: Math.round(matBase[name] * (share[target] ?? 0.3) * 100) / 100, tier: 2, origin: 'sec_grounded' });
      }
    }

    if (role.tier === 3 && tier3Base[name]) {
      for (const target of role.targets) {
        links.push({ source: name === 'Carl Zeiss SMT' ? 'Zeiss' : name, target, value: tier3Base[name], tier: 3, origin: 'sec_grounded', note: role.note });
      }
    }

    if (role.tier === 4 && (tier4Base[name] || role.value)) {
      for (const target of role.targets) {
        links.push({ source: name, target, value: role.value ?? tier4Base[name] ?? 5, tier: 4, origin: 'sec_grounded', note: role.note });
      }
    }

    if (role.tier === 5 && (tier5Base[name] || role.value)) {
      for (const target of role.targets) {
        links.push({ source: name, target, value: role.value ?? tier5Base[name] ?? 2, tier: 5, origin: 'sec_grounded', note: role.note });
      }
    }
  }

  return links;
}

/** @deprecated use buildLinksFromSecRoles with topic config */
export const SEC_SUPPLY_ROLES = nvidiaH200.SEC_SUPPLY_ROLES;

export function buildLinksForTopic(topicModule, groundedVendors) {
  return buildLinksFromSecRoles(
    topicModule.SEC_SUPPLY_ROLES,
    groundedVendors,
    topicModule.MATERIALS_ALLOWLIST ?? [],
    topicModule.PRODUCT_NODE,
  );
}
