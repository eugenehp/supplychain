/**
 * SEC EDGAR REST API client.
 * Requires User-Agent per https://www.sec.gov/os/accessing-edgar-data
 */

const USER_AGENT = 'SupplyChainSankey research@example.com';
const BASE = 'https://data.sec.gov';
const TICKERS_URL = 'https://www.sec.gov/files/company_tickers.json';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let lastRequest = 0;
async function rateLimitedFetch(url, options = {}) {
  const elapsed = Date.now() - lastRequest;
  if (elapsed < 120) await sleep(120 - elapsed);
  lastRequest = Date.now();

  const res = await fetch(url, {
    ...options,
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`SEC API ${res.status}: ${url}`);
  }
  return res;
}

export async function loadTickerMap() {
  const res = await rateLimitedFetch(TICKERS_URL);
  const raw = await res.json();
  const byTicker = {};
  const byName = {};
  for (const entry of Object.values(raw)) {
    const cik = String(entry.cik_str).padStart(10, '0');
    byTicker[entry.ticker.toUpperCase()] = { cik, name: entry.title, ticker: entry.ticker };
    byName[entry.title.toLowerCase()] = byTicker[entry.ticker.toUpperCase()];
  }
  return { byTicker, byName };
}

export function padCik(cik) {
  return String(cik).replace(/\D/g, '').padStart(10, '0');
}

export async function getSubmissions(cik) {
  const padded = padCik(cik);
  const res = await rateLimitedFetch(`${BASE}/submissions/CIK${padded}.json`);
  return res.json();
}

export async function getCompanyFacts(cik) {
  const padded = padCik(cik);
  const res = await rateLimitedFetch(`${BASE}/api/xbrl/companyfacts/CIK${padded}.json`);
  return res.json();
}

export function findLatestFiling(submissions, forms = ['10-K', '20-F', '40-F']) {
  const recent = submissions.filings?.recent;
  if (!recent) return null;

  for (let i = 0; i < recent.form.length; i++) {
    if (forms.includes(recent.form[i])) {
      return {
        form: recent.form[i],
        filingDate: recent.filingDate[i],
        accessionNumber: recent.accessionNumber[i],
        primaryDocument: recent.primaryDocument[i],
        reportDate: recent.reportDate[i],
      };
    }
  }
  return null;
}

export async function fetchFilingDocument(cik, filing) {
  const padded = padCik(cik);
  const accPlain = filing.accessionNumber.replace(/-/g, '');
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${parseInt(padded, 10)}/${accPlain}/${filing.primaryDocument}`;

  const res = await rateLimitedFetch(indexUrl, { headers: { Accept: 'text/html,*/*' } });
  const html = await res.text();
  return { url: indexUrl, html, filing };
}

/** Extract latest annual fact for a US-GAAP or IFRS tag from company facts JSON. */
export function extractLatestFact(companyFacts, tag, forms = ['10-K', '20-F', '40-F']) {
  for (const taxonomy of ['us-gaap', 'ifrs-full', 'dei']) {
    const concept = companyFacts.facts?.[taxonomy]?.[tag];
    if (!concept?.units) continue;

    const unit = concept.units.USD ?? concept.units['USD/shares'] ?? Object.values(concept.units)[0];
    if (!unit) continue;

    const annual = unit
      .filter((f) => forms.includes(f.form) && f.end)
      .sort((a, b) => b.end.localeCompare(a.end) || b.filed.localeCompare(a.filed));

    if (annual[0]) return annual[0];
  }
  return null;
}

export const REVENUE_TAGS = [
  'Revenues',
  'RevenueFromContractWithCustomerExcludingAssessedTax',
  'Revenue',
  'RevenueFromContractsWithCustomers',
  'SalesRevenueNet',
];

export function extractTextSections(html) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

  return text;
}

/** Pull supplier/customer concentration and named suppliers from 10-K prose. */
export function extractSupplierSignals(text, companyName) {
  const signals = {
    company: companyName,
    supplierMentions: [],
    customerConcentration: [],
    supplierConcentration: [],
    capexMentions: [],
    segmentRevenue: [],
  };

  const supplierPatterns = [
    /(?:rely|depend|source|purchase|obtain).{0,80}(?:from|through)\s+([A-Z][A-Za-z\s&,\.]+(?:Inc\.|Corp\.|Ltd\.|Co\.|B\.V\.|N\.V\.|AG|SE|Corporation))/gi,
    /(?:supplier|vendor|subcontractor)s?\s+(?:include|such as|like)\s+([^.]{10,200})/gi,
  ];

  for (const pattern of supplierPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      signals.supplierMentions.push(match[1].trim().slice(0, 120));
    }
  }

  const concPattern = /(\d{1,3})\s*%\s*of\s*(?:our\s+)?(?:total\s+)?(?:net\s+)?(?:revenue|sales)[^.]{0,60}(?:from|to| attributable to)\s+([^.]{5,80})/gi;
  let m;
  while ((m = concPattern.exec(text)) !== null) {
    signals.customerConcentration.push({ pct: parseInt(m[1], 10), entity: m[2].trim() });
  }

  const supplierConc = /(\d{1,3})\s*%\s*of\s*(?:our\s+)?(?:components|materials|products)[^.]{0,80}(?:from|supplied by)\s+([^.]{5,80})/gi;
  while ((m = supplierConc.exec(text)) !== null) {
    signals.supplierConcentration.push({ pct: parseInt(m[1], 10), entity: m[2].trim() });
  }

  const capexPattern = /capital expenditures[^.]{0,40}\$([0-9,.]+)\s*(billion|million)/gi;
  while ((m = capexPattern.exec(text)) !== null) {
    const num = parseFloat(m[1].replace(/,/g, ''));
    const scale = m[2].toLowerCase() === 'billion' ? 1e9 : 1e6;
    signals.capexMentions.push(num * scale);
  }

  signals.supplierMentions = [...new Set(signals.supplierMentions)].slice(0, 15);
  signals.customerConcentration = signals.customerConcentration.slice(0, 10);
  signals.supplierConcentration = signals.supplierConcentration.slice(0, 10);

  return signals;
}

export async function scrapeCompany(ticker, tickerMap) {
  const meta = tickerMap.byTicker[ticker.toUpperCase()];
  if (!meta) {
    return { ticker, error: 'Ticker not found in SEC database' };
  }

  const result = {
    ticker,
    cik: meta.cik,
    name: meta.name,
    filing: null,
    facts: {},
    signals: null,
    filingUrl: null,
  };

  try {
    const [submissions, companyFacts] = await Promise.all([
      getSubmissions(meta.cik),
      getCompanyFacts(meta.cik),
    ]);

    result.filing = findLatestFiling(submissions);

    for (const tag of ['Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'ResearchAndDevelopmentExpense', 'CapitalExpendituresIncurredButNotYetPaid']) {
      const fact = extractLatestFact(companyFacts, tag);
      if (fact) result.facts[tag] = { value: fact.val, end: fact.end, filed: fact.filed };
    }

    if (result.filing) {
      const doc = await fetchFilingDocument(meta.cik, result.filing);
      result.filingUrl = doc.url;
      const text = extractTextSections(doc.html);
      result.signals = extractSupplierSignals(text, meta.name);
    }
  } catch (err) {
    result.error = err.message;
  }

  return result;
}
