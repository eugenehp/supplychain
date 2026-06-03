import { RARE_EARTH_ELEMENTS } from './rare-earth-elements.mjs';
import { MINER_BY_TICKER } from './rare-earth-miners.mjs';
import { countCountriesInText, countryMeta } from './geo-resolve.mjs';

const GEO_LABEL_PATTERNS = [
  /\b(?:United States|U\.S\.|USA|China|PRC|Australia|Canada|Myanmar|Malaysia|Vietnam|India|Brazil|Chile|Greenland|Mongolia|South Africa|Namibia|Japan|South Korea|Taiwan|Western Australia|Kuantan)\b/gi,
  /\b(?:Mountain Pass|Bear Lodge|Round Top|White Mesa|Stillwater|Mt Weld|Mount Weld|Nolans|Bayan Obo|Kuantan|Lynas Malaysia|Kalgoorlie)\b/gi,
];

const COST_PATTERNS = [
  /\$[\d,.]+\s*(?:million|billion|M|B)?\s*(?:per\s+)?(?:ton|tonne|kg|metric ton|MT|lb|pound)/gi,
  /(?:all[- ]in sustaining cost|AISC|cash cost|production cost|cost of production|operating cost|C1 cost)[^.]{0,120}/gi,
  /(?:\d+(?:\.\d+)?)\s*(?:USD|US\$|A\$)?\s*(?:per|\/)\s*(?:ton|tonne|kg|MT)/gi,
  /(?:US\$|A\$)[\d,.]+\s*\/\s*kg/gi,
];

const PIPELINE_PATTERNS = [
  /(?:Stage\s+(?:I|II|III|1|2|3)|feasibility|pre-feasibility|construction|commissioning|ramp[- ]up|expansion|development|processing facility|separation|refining|concentrate|oxide|metal|magnet|cracking|leaching)/gi,
];

const SUPPLIER_PATTERNS = [
  /(?:supplier|vendor|customer|offtake|purchaser|distributor|partner|contract with|agreement with|JV with|joint venture)[^.]{0,100}/gi,
  /\b(?:Shenghe|Lynas|Jiangxi|China Northern Rare Earth|Chinalco|Solvay|Shin-Etsu|Hitachi Metals|Shin-Etsu|Sojitz)\b/gi,
];

const IMPACT_PATTERNS = [
  /(?:environmental|tailings|water|permitting|regulatory|reclamation|sustainability|ESG|carbon|emission|waste|community|indigenous)[^.]{0,120}/gi,
];

function snippetAround(text, index, len = 280) {
  const start = Math.max(0, index - 100);
  const end = Math.min(text.length, index + len);
  return text.slice(start, end).replace(/\s+/g, ' ').trim();
}

function isQualitySnippet(text) {
  if (!text || text.length < 50) return false;
  if (/xbrli:|iso4217:|http:\/\/fasb/i.test(text)) return false;
  if ((text.match(/[a-zA-Z]/g)?.length ?? 0) < text.length * 0.45) return false;
  return true;
}

function uniqueMatches(text, patterns, limit = 8) {
  const out = [];
  const seen = new Set();
  for (const re of patterns) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null && out.length < limit) {
      const snip = m[0].replace(/\s+/g, ' ').trim();
      const key = snip.slice(0, 60).toLowerCase();
      if (seen.has(key) || snip.length < 12) continue;
      seen.add(key);
      out.push(snip);
    }
  }
  return out;
}

function buildElementPatterns(element) {
  const patterns = [
    new RegExp(`\\b${element.name}\\b`, 'gi'),
    new RegExp(`\\b${element.symbol}(?![a-zA-Z])`, 'g'),
  ];
  for (const alias of element.aliases ?? []) {
    if (alias.length >= 3) patterns.push(new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'));
  }
  return patterns;
}

function geographyLabelsFromSnippets(snippets) {
  const joined = snippets.join(' ');
  const labels = uniqueMatches(joined, GEO_LABEL_PATTERNS, 10);
  const counts = countCountriesInText(joined);
  const countries = [...counts.entries()]
    .map(([code, hits]) => ({ ...countryMeta(code), hits }))
    .sort((a, b) => b.hits - a.hits);
  return { labels, countries };
}

export function extractFieldsFromSnippets(snippets) {
  const joined = snippets.join(' ');
  const { labels, countries } = geographyLabelsFromSnippets(snippets);
  return {
    geography: labels,
    countries,
    cost: uniqueMatches(joined, COST_PATTERNS, 6),
    pipeline: uniqueMatches(joined, PIPELINE_PATTERNS, 8),
    suppliers: uniqueMatches(joined, SUPPLIER_PATTERNS, 8),
    impact: uniqueMatches(joined, IMPACT_PATTERNS, 8),
  };
}

/**
 * @param {string} text
 * @param {{
 *   id: string,
 *   companyName: string,
 *   ticker?: string,
 *   role?: string,
 *   isRareEarthMiner?: boolean,
 *   filing?: object | null,
 *   filingUrl?: string | null,
 *   sourceRegime?: string,
 *   secCounterpart?: string | null,
 * }} meta
 */
export function extractRareEarthFromText(text, meta) {
  const miner = meta.ticker ? MINER_BY_TICKER[meta.ticker] : null;
  const elementHits = {};

  for (const element of RARE_EARTH_ELEMENTS) {
    const patterns = buildElementPatterns(element);
    const snippets = [];
    let count = 0;

    for (const re of patterns) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text)) !== null) {
        count++;
        if (snippets.length < 5) {
          const snip = snippetAround(text, m.index);
          if (isQualitySnippet(snip) && !snippets.some((s) => s.slice(0, 80) === snip.slice(0, 80))) {
            snippets.push(snip);
          }
        }
      }
    }

    if (count > 0) {
      const wideSnippets = [];
      for (const re of patterns) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(text)) !== null && wideSnippets.length < 12) {
          const wide = snippetAround(text, m.index, 520);
          if (isQualitySnippet(wide) && !wideSnippets.some((s) => s.slice(0, 80) === wide.slice(0, 80))) {
            wideSnippets.push(wide);
          }
        }
      }
      elementHits[element.symbol] = {
        mentionCount: count,
        snippets,
        wideSnippets,
        extracted: extractFieldsFromSnippets(wideSnippets.length ? wideSnippets : snippets),
      };
    }
  }

  const generalRe = /rare\s+earth(?:\s+element)?s?|REE\b|NdPr|critical\s+mineral/gi;
  const generalSnippets = [];
  let generalCount = 0;
  let gm;
  while ((gm = generalRe.exec(text)) !== null) {
    generalCount++;
    if (generalSnippets.length < 6) {
      const snip = snippetAround(text, gm.index);
      if (isQualitySnippet(snip)) generalSnippets.push(snip);
    }
  }

  return {
    id: meta.id,
    ticker: meta.ticker ?? meta.id,
    companyName: meta.companyName,
    role: meta.role ?? miner?.role ?? 'other',
    filing: meta.filing ?? null,
    filingUrl: meta.filingUrl ?? null,
    sourceRegime: meta.sourceRegime ?? 'US-SEC',
    secCounterpart: meta.secCounterpart ?? null,
    isRareEarthMiner: meta.isRareEarthMiner ?? Boolean(miner),
    generalMentions: generalCount,
    generalSnippets,
    elementHits,
    portfolioExtracted: extractFieldsFromSnippets([
      ...generalSnippets,
      ...Object.values(elementHits).flatMap((h) => h.snippets),
    ]),
  };
}
