/** Curated supply-chain shocks merged with structured policy/price data at index build. */

/** @type {Array<{ id: string, year: number, month?: number, category: string, title: string, summary: string, elements?: string[], sourceUrl?: string, sourceId?: string }>} */
export const CURATED_TIMELINE_EVENTS = [
  {
    id: 'CN-QUOTA-2010',
    year: 2010,
    month: 7,
    category: 'policy',
    title: 'China rare-earth export quota cut',
    summary:
      'PRC reduced export quotas ~40% vs 2009, triggering global price spike and WTO case — watershed moment for REE supply-chain awareness.',
    elements: ['Nd', 'Pr', 'Dy', 'Tb', 'La', 'Ce'],
    sourceUrl: 'https://www.usgs.gov/publications/mineral-commodity-summaries-2011',
  },
  {
    id: 'WTO-2014',
    year: 2014,
    month: 3,
    category: 'policy',
    title: 'WTO rules against China REE export restrictions',
    summary: 'WTO panel found export quotas and duties inconsistent with trade rules; China later reformed quota system.',
    elements: ['Nd', 'Pr', 'Dy', 'Tb'],
    sourceUrl: 'https://www.wto.org/',
  },
  {
    id: 'MP-RESTART-2018',
    year: 2018,
    category: 'supply',
    title: 'Mountain Pass restarts at scale',
    summary: 'MP Materials recommissioned Mountain Pass — first major non-Chinese mine output in years.',
    elements: ['Nd', 'Pr', 'Ce', 'La'],
    sourceId: 'MP',
  },
  {
    id: 'MYANMAR-2021',
    year: 2021,
    category: 'supply',
    title: 'Myanmar ionic-clay disruption',
    summary: 'Political instability reduced heavy-REE clay feedstock crossing into China — Dy/Tb supply risk highlighted.',
    elements: ['Dy', 'Tb', 'Y'],
    sourceId: 'MYANMAR-REE-USGS-2024',
  },
  {
    id: 'EU-CRMA-2024',
    year: 2024,
    month: 5,
    category: 'policy',
    title: 'EU Critical Raw Materials Act enters force',
    summary: 'CRMA sets 34 CRMs (17 strategic), domestic processing targets, and strategic project designation.',
    elements: ['Nd', 'Pr', 'Dy', 'Tb', 'Y'],
    sourceId: 'EU-CRMA-2024',
  },
  {
    id: 'US-IRA-2022',
    year: 2022,
    month: 8,
    category: 'policy',
    title: 'U.S. Inflation Reduction Act — domestic content',
    summary: 'IRA EV tax credits tied to North American assembly and critical-mineral sourcing rules.',
    elements: ['Nd', 'Pr', 'Dy', 'Tb'],
    sourceId: 'DOE-CMA-2023',
  },
  {
    id: 'LYC-MALAYSIA-2023',
    year: 2023,
    category: 'supply',
    title: 'Lynas Malaysia separation continues',
    summary: 'LAMP remains largest ex-China separation hub; license renewals watched by magnet supply chain.',
    elements: ['Nd', 'Pr', 'Dy', 'Tb'],
    sourceId: 'LYC',
  },
];

/**
 * @param {{ chinaPolicy?: object, usgsHistorical?: object, myanmarSupply?: object }} structured
 */
export function buildSupplyTimeline(structured = {}) {
  /** @type {typeof CURATED_TIMELINE_EVENTS[number][]} */
  const events = [...CURATED_TIMELINE_EVENTS];

  for (const ev of structured.chinaPolicy?.events ?? []) {
    events.push({
      id: ev.id ?? `CN-${ev.year}`,
      year: ev.year,
      category: 'policy',
      title: ev.title,
      summary: ev.summary,
      elements: ev.elements,
      sourceUrl: ev.sourceUrl,
      sourceId: 'CHINA-MOFcom-EXPORT-2023',
    });
  }

  if (structured.myanmarSupply?.summary) {
    const existing = events.find((e) => e.id === 'MYANMAR-2021');
    if (existing && structured.myanmarSupply.notes) {
      existing.summary = `${existing.summary} ${structured.myanmarSupply.notes}`.trim();
    }
  }

  const prices = structured.usgsHistorical?.prices ?? [];
  if (prices.length >= 2) {
    const latest = prices[prices.length - 1];
    const prev = prices[prices.length - 2];
    if (latest.Nd2O3UsdPerKg && prev.Nd2O3UsdPerKg) {
      const pct = ((latest.Nd2O3UsdPerKg - prev.Nd2O3UsdPerKg) / prev.Nd2O3UsdPerKg) * 100;
      if (Math.abs(pct) >= 15) {
        events.push({
          id: `PRICE-ND-${latest.year}`,
          year: latest.year,
          category: 'price',
          title: `Nd₂O₃ price ${pct > 0 ? 'up' : 'down'} ${Math.abs(pct).toFixed(0)}% YoY (USGS dealer)`,
          summary: `USGS MCS salient data: Nd oxide ~$${latest.Nd2O3UsdPerKg}/kg vs $${prev.Nd2O3UsdPerKg}/kg prior year.`,
          elements: ['Nd', 'Pr'],
          sourceId: 'USGS-PRICE-REFERENCE-2025',
        });
      }
    }
  }

  events.sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return (b.month ?? 6) - (a.month ?? 6);
  });

  return {
    events,
    categories: [
      { id: 'policy', label: 'Policy & trade', color: '#f59e0b' },
      { id: 'supply', label: 'Mine & processing', color: '#22c55e' },
      { id: 'price', label: 'Price shock', color: '#ef4444' },
    ],
    methodology:
      'Curated milestones plus China MOFCOM/MIIT events and USGS MCS YoY Nd price moves ≥15%. Click an event to jump to linked source excerpts.',
  };
}
