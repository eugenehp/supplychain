/**
 * Side-by-side metrics table for the space-economy watchlist.
 *
 * Pulls:
 *   1. XBRL facts already cached in data/raw/sec/<TICKER>/companyfacts.json
 *      — revenue, R&D, COGS, gross profit, assets, cash, capex, opcf.
 *   2. Numeric captures from research-answers.json — gov-revenue %, top-customer %.
 *
 * Output: static/space-economy/metrics/companies.json
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PATHS, topicStaticDir, companyRawDir } from '../paths.mjs';
import { extractLatestFact } from '../edgar-client.mjs';

const FACT_QUERIES = {
  revenue: ['Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'SalesRevenueNet'],
  costOfRevenue: ['CostOfRevenue', 'CostOfGoodsAndServicesSold'],
  grossProfit: ['GrossProfit'],
  rd: ['ResearchAndDevelopmentExpense'],
  assets: ['Assets'],
  cash: ['CashAndCashEquivalentsAtCarryingValue', 'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents'],
  capex: ['PaymentsToAcquirePropertyPlantAndEquipment'],
  operatingCashFlow: ['NetCashProvidedByUsedInOperatingActivities'],
  netIncome: ['NetIncomeLoss'],
  backlog: ['RemainingPerformanceObligation', 'BacklogAmount'],
};

function loadCompanyFacts(ticker) {
  const path = join(companyRawDir(ticker), 'companyfacts.json');
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function loadMeta(ticker) {
  const path = join(companyRawDir(ticker), 'metadata.json');
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function loadAnswers(topicId) {
  const path = join(topicStaticDir(topicId), 'research', 'answers.json');
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function firstFact(companyFacts, tags) {
  for (const tag of tags) {
    const fact = extractLatestFact(companyFacts, tag);
    if (fact?.val != null) {
      return { value: fact.val, end: fact.end, filed: fact.filed, form: fact.form, tag };
    }
  }
  return null;
}

function pct(numerator, denominator) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return null;
  return (numerator / denominator) * 100;
}

function topNumericForQuestion(answers, questionId, ticker) {
  const q = answers?.questions?.find((qq) => qq.id === questionId);
  if (!q) return null;
  const cards = q.answers.filter((c) => c.ticker === ticker && c.numericValue);
  if (!cards.length) return null;
  cards.sort((a, b) => b.score - a.score);
  const top = cards[0];
  return {
    raw: top.numericValue.raw,
    value: top.numericValue.value,
    unit: top.numericValue.unit,
    excerpt: top.excerpt,
    sectionId: top.sectionId,
    sectionHeader: top.sectionHeader,
    charOffset: top.charOffset,
  };
}

export function extractMetricsForTopic({ tickers, topicId }) {
  const answers = loadAnswers(topicId);

  const companies = tickers.map((ticker) => {
    const meta = loadMeta(ticker) ?? {};
    const facts = loadCompanyFacts(ticker);
    /** @type {Record<string, any>} */
    const m = { ticker, name: meta.name ?? null, filing: meta.filing ?? null, filingUrl: meta.filingUrl ?? null };

    if (facts) {
      for (const [key, tags] of Object.entries(FACT_QUERIES)) {
        m[key] = firstFact(facts, tags);
      }
    } else {
      // Fall back to whatever was already in metadata.json.
      const flat = meta.facts ?? {};
      for (const [key, tags] of Object.entries(FACT_QUERIES)) {
        const tag = tags.find((t) => flat[t]?.value != null);
        if (tag) m[key] = { value: flat[tag].value, end: flat[tag].end, filed: flat[tag].filed, form: flat[tag].form, tag };
      }
    }

    m.rdPctRevenue = m.rd?.value != null && m.revenue?.value != null
      ? pct(m.rd.value, m.revenue.value)
      : null;
    m.grossMargin = m.grossProfit?.value != null && m.revenue?.value != null
      ? pct(m.grossProfit.value, m.revenue.value)
      : null;
    m.capexPctRevenue = m.capex?.value != null && m.revenue?.value != null
      ? pct(m.capex.value, m.revenue.value)
      : null;
    m.cashRunwayYears = m.cash?.value != null && m.operatingCashFlow?.value != null && m.operatingCashFlow.value < 0
      ? m.cash.value / Math.abs(m.operatingCashFlow.value)
      : null;

    // Narrative captures from the Q&A panel.
    m.govRevenuePct = topNumericForQuestion(answers, 'gov-revenue-share', ticker);
    m.topCustomerPct = topNumericForQuestion(answers, 'top-customer-concentration', ticker);

    return m;
  });

  return {
    generatedAt: new Date().toISOString(),
    topicId,
    columns: [
      { key: 'revenue', label: 'Revenue', kind: 'currency' },
      { key: 'grossMargin', label: 'Gross margin', kind: 'percent' },
      { key: 'rdPctRevenue', label: 'R&D / revenue', kind: 'percent' },
      { key: 'capex', label: 'Capex', kind: 'currency' },
      { key: 'capexPctRevenue', label: 'Capex / revenue', kind: 'percent' },
      { key: 'cash', label: 'Cash', kind: 'currency' },
      { key: 'operatingCashFlow', label: 'Operating cash flow', kind: 'currency-signed' },
      { key: 'cashRunwayYears', label: 'Cash runway (yr)', kind: 'number', precision: 1 },
      { key: 'netIncome', label: 'Net income', kind: 'currency-signed' },
      { key: 'govRevenuePct', label: 'US Gov %', kind: 'percent-narrative' },
      { key: 'topCustomerPct', label: 'Top customer %', kind: 'percent-narrative' },
    ],
    companies,
  };
}

export function writeMetrics({ topicId, tickers }) {
  const result = extractMetricsForTopic({ tickers, topicId });
  const outDir = join(topicStaticDir(topicId), 'metrics');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'companies.json'), JSON.stringify(result, null, 2));
  return result;
}
