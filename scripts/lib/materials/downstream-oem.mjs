/** Downstream SEC filers indexed for REE supply-chain risk language. */

/** @typedef {{ ticker: string, name: string, sector: string, industries: string[], chainStage: 'oem' }} DownstreamOem */

/** @type {DownstreamOem[]} */
export const DOWNSTREAM_OEM = [
  { ticker: 'TSLA', name: 'Tesla', sector: 'Automotive', industries: ['EV & mobility', 'Clean energy'], chainStage: 'oem' },
  { ticker: 'GM', name: 'General Motors', sector: 'Automotive', industries: ['EV & mobility', 'Automotive'], chainStage: 'oem' },
  { ticker: 'F', name: 'Ford', sector: 'Automotive', industries: ['EV & mobility', 'Automotive'], chainStage: 'oem' },
  { ticker: 'RIVN', name: 'Rivian', sector: 'Automotive', industries: ['EV & mobility'], chainStage: 'oem' },
  { ticker: 'STLA', name: 'Stellantis', sector: 'Automotive', industries: ['EV & mobility', 'Automotive'], chainStage: 'oem' },
  { ticker: 'GEV', name: 'GE Vernova', sector: 'Wind / power', industries: ['Wind energy', 'Clean energy'], chainStage: 'oem' },
  { ticker: 'ENPH', name: 'Enphase', sector: 'Solar / power electronics', industries: ['Clean energy'], chainStage: 'oem' },
  { ticker: 'LMT', name: 'Lockheed Martin', sector: 'Defense', industries: ['Defense', 'Aerospace'], chainStage: 'oem' },
  { ticker: 'RTX', name: 'RTX (Raytheon)', sector: 'Defense', industries: ['Defense', 'Aerospace'], chainStage: 'oem' },
  { ticker: 'NOC', name: 'Northrop Grumman', sector: 'Defense', industries: ['Defense', 'Aerospace'], chainStage: 'oem' },
  { ticker: 'GD', name: 'General Dynamics', sector: 'Defense', industries: ['Defense'], chainStage: 'oem' },
  { ticker: 'NVDA', name: 'NVIDIA', sector: 'Semiconductor', industries: ['Semiconductor manufacturing', 'Consumer electronics'], chainStage: 'oem' },
  { ticker: 'INTC', name: 'Intel', sector: 'Semiconductor', industries: ['Semiconductor manufacturing'], chainStage: 'oem' },
  { ticker: 'AMD', name: 'AMD', sector: 'Semiconductor', industries: ['Semiconductor manufacturing', 'Consumer electronics'], chainStage: 'oem' },
  { ticker: 'MU', name: 'Micron', sector: 'Semiconductor', industries: ['Semiconductor manufacturing'], chainStage: 'oem' },
  { ticker: 'AAPL', name: 'Apple', sector: 'Consumer electronics', industries: ['Consumer electronics'], chainStage: 'oem' },
  { ticker: 'EMR', name: 'Emerson', sector: 'Industrial', industries: ['Industrial automation'], chainStage: 'oem' },
  { ticker: 'ROK', name: 'Rockwell Automation', sector: 'Industrial', industries: ['Industrial automation'], chainStage: 'oem' },
  { ticker: 'HON', name: 'Honeywell', sector: 'Industrial / aerospace', industries: ['Aerospace', 'Industrial automation'], chainStage: 'oem' },
  { ticker: 'PH', name: 'Parker-Hannifin', sector: 'Industrial', industries: ['Industrial automation', 'Aerospace'], chainStage: 'oem' },
];

export const DOWNSTREAM_BY_TICKER = Object.fromEntries(DOWNSTREAM_OEM.map((d) => [d.ticker, d]));

/**
 * @param {object[]} filingRows
 * @param {object[]} elements
 */
export function buildDownstreamIndex(filingRows, elements) {
  const rows = filingRows.filter((r) => r.role === 'downstream' || DOWNSTREAM_BY_TICKER[r.ticker]);

  const companies = rows.map((row) => {
    const meta = DOWNSTREAM_BY_TICKER[row.ticker] ?? {
      ticker: row.ticker,
      name: row.companyName,
      sector: 'Other',
      industries: [],
      chainStage: 'oem',
    };
    const elementMentions = Object.keys(row.elementHits ?? {});
    const topElements = elementMentions
      .map((sym) => ({
        symbol: sym,
        count: row.elementHits[sym]?.mentionCount ?? 0,
      }))
      .sort((a, b) => b.count - a.count);

    const snippets = [];
    for (const sym of topElements.slice(0, 3).map((e) => e.symbol)) {
      const hit = row.elementHits[sym];
      const refs = hit?.snippetRefs?.length ? hit.snippetRefs : (hit?.snippets ?? []).map((text) => ({ text }));
      for (const ref of refs.slice(0, 2)) {
        snippets.push({ symbol: sym, text: ref.text, charStart: ref.charStart, charEnd: ref.charEnd });
      }
    }

    return {
      ...meta,
      company: row.companyName,
      mentionCount: row.generalMentions ?? topElements.reduce((n, e) => n + e.count, 0),
      elementMentions: topElements,
      snippets,
      sourceId: row.id,
      filing: row.filing,
      filingUrl: row.filingUrl,
    };
  });

  const byElement = elements
    .filter((el) => el.mentionCount > 0)
    .map((el) => {
      const consumers = [];
      for (const row of rows) {
        const hit = row.elementHits[el.symbol];
        if (!hit) continue;
        const meta = DOWNSTREAM_BY_TICKER[row.ticker];
        consumers.push({
          ticker: row.ticker,
          name: meta?.name ?? row.companyName,
          sector: meta?.sector ?? 'Other',
          mentionCount: hit.mentionCount,
          snippets: (hit.snippetRefs ?? hit.snippets?.map((text) => ({ text })) ?? []).slice(0, 2),
          sourceId: row.id,
          filingUrl: row.filingUrl,
        });
      }
      return {
        symbol: el.symbol,
        name: el.name,
        industries: el.industries ?? [],
        consumers: consumers.sort((a, b) => b.mentionCount - a.mentionCount),
      };
    })
    .filter((e) => e.consumers.length > 0);

  return {
    companies: companies.sort((a, b) => b.mentionCount - a.mentionCount),
    byElement,
    methodology:
      'Downstream OEM excerpts from SEC 10-K risk factors and supply-chain disclosures — co-mention of REE elements, not bill-of-materials.',
  };
}
