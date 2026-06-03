/** Government and industry reports — global production, reserves, trade (not company-specific). */

/** @typedef {{
 *   id: string,
 *   title: string,
 *   publisher: string,
 *   year: number,
 *   topics: string[],
 *   filingSources: { type: 'pdf' | 'html', url: string, label?: string }[],
 * }} PublicReport */

/** @type {PublicReport[]} */
export const PUBLIC_REPORTS = [
  {
    id: 'USGS-MCS-2024-REE',
    title: 'Mineral Commodity Summaries 2024 — Rare Earths',
    publisher: 'U.S. Geological Survey',
    year: 2024,
    topics: ['production', 'reserves', 'trade', 'prices', 'global'],
    filingSources: [
      {
        type: 'pdf',
        url: 'https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-rare-earths.pdf',
        label: 'USGS MCS 2024 REE chapter',
      },
    ],
  },
  {
    id: 'USGS-MCS-2024-FULL',
    title: 'Mineral Commodity Summaries 2024 (full volume)',
    publisher: 'U.S. Geological Survey',
    year: 2024,
    topics: ['critical-minerals', 'global'],
    filingSources: [
      {
        type: 'pdf',
        url: 'https://pubs.usgs.gov/periodicals/mcs2024/mcs2024.pdf',
        label: 'USGS MCS 2024 complete PDF',
      },
    ],
  },
  {
    id: 'USGS-MCS-2025-REE',
    title: 'Mineral Commodity Summaries 2025 — Rare Earths',
    publisher: 'U.S. Geological Survey',
    year: 2025,
    topics: ['production', 'reserves', 'trade', 'prices', 'global'],
    filingSources: [
      {
        type: 'pdf',
        url: 'https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-rare-earths.pdf',
        label: 'USGS MCS 2025 REE chapter',
      },
    ],
  },
  {
    id: 'USGS-MCS-2025-FULL',
    title: 'Mineral Commodity Summaries 2025 (full volume)',
    publisher: 'U.S. Geological Survey',
    year: 2025,
    topics: ['critical-minerals', 'global'],
    filingSources: [
      {
        type: 'pdf',
        url: 'https://pubs.usgs.gov/periodicals/mcs2025/mcs2025.pdf',
        label: 'USGS MCS 2025 complete PDF',
      },
    ],
  },
  {
    id: 'EU-CRMA-2024',
    title: 'EU Critical Raw Materials Act (Regulation EU 2024/1252)',
    publisher: 'European Union / EUR-Lex',
    year: 2024,
    topics: ['policy', 'strategic-materials', 'supply-chain', 'rare-earths'],
    filingSources: [
      {
        type: 'pdf',
        url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:32024R1252',
        label: 'CRMA official journal PDF (English)',
      },
      {
        type: 'html',
        url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32024R1252',
        label: 'CRMA official journal HTML (English)',
      },
    ],
  },
  {
    id: 'DOE-CMA-2023',
    title: 'DOE Critical Materials Assessment 2023',
    publisher: 'U.S. Department of Energy',
    year: 2023,
    topics: ['critical-minerals', 'magnets', 'supply-risk', 'Nd', 'Dy', 'Tb'],
    filingSources: [
      {
        type: 'pdf',
        url: 'https://www.energy.gov/sites/default/files/2023-07/doe-critical-material-assessment_07312023.pdf',
        label: 'DOE CMA 2023 full report',
      },
    ],
  },
  {
    id: 'IEA-GCMO-2024',
    title: 'IEA Global Critical Minerals Outlook 2024',
    publisher: 'International Energy Agency',
    year: 2024,
    topics: ['demand', 'supply', 'outlook', 'rare-earths', 'global'],
    filingSources: [
      {
        type: 'pdf',
        url: 'https://iea.blob.core.windows.net/assets/ee01701d-1d5c-4ba8-9df6-abeeac9de99a/GlobalCriticalMineralsOutlook2024.pdf',
        label: 'IEA GCMO 2024',
      },
    ],
  },
  {
    id: 'EU-CRMA-BRIEF-2024',
    title: 'Implementing the EU Critical Raw Materials Act (EPRS Briefing)',
    publisher: 'European Parliamentary Research Service',
    year: 2024,
    topics: ['policy', 'CRM', 'strategic-projects'],
    filingSources: [
      {
        type: 'html',
        url: 'https://www.europarl.europa.eu/thinktank/en/document/EPRS_BRI(2024)766253',
        label: 'EPRS briefing HTML',
      },
      {
        type: 'pdf',
        url: 'https://www.europarl.europa.eu/RegData/etudes/BRIE/2024/766253/EPRS_BRI(2024)766253_EN.pdf',
        label: 'EPRS implementation briefing PDF',
      },
    ],
  },
  {
    id: 'BGS-UK-CRITICALITY-2024',
    title: 'UK 2024 Criticality Assessment',
    publisher: 'British Geological Survey / UK CMIC',
    year: 2024,
    topics: ['critical-minerals', 'rare-earths', 'supply-risk', 'UK'],
    filingSources: [
      {
        type: 'pdf',
        url: 'https://nora.nerc.ac.uk/id/eprint/538471/1/OR24047_report.pdf',
        label: 'UK CMIC criticality assessment full report',
      },
    ],
  },
  {
    id: 'EU-CRMA-STRATEGIC-EU-2025',
    title: 'EU CRMA Strategic Projects — EU (Annex, March 2025)',
    publisher: 'European Commission',
    year: 2025,
    topics: ['policy', 'strategic-projects', 'rare-earths', 'EU'],
    filingSources: [
      {
        type: 'pdf',
        url: 'https://webgate.ec.europa.eu/circabc-ewpp/d/d/workspace/SpacesStore/d307a581-8530-493c-9efa-b2cd179d4677/file.bin',
        label: 'Commission Decision annex — EU strategic projects',
      },
    ],
  },
  {
    id: 'EU-CRMA-STRATEGIC-NON-EU-2025',
    title: 'EU CRMA Strategic Projects — non-EU (Annex, June 2025)',
    publisher: 'European Commission',
    year: 2025,
    topics: ['policy', 'strategic-projects', 'rare-earths', 'global'],
    filingSources: [
      {
        type: 'pdf',
        url: 'https://single-market-economy.ec.europa.eu/document/download/60c576a5-435e-43e6-83de-c81f3652259b_en?filename=C_2025_3491_1_EN_annexe_acte_autonome_part1_v3.pdf',
        label: 'Commission Decision annex — non-EU strategic projects',
      },
    ],
  },
  {
    id: 'NRCAN-CRM-STRATEGY-2022',
    title: 'Canadian Critical Minerals Strategy (2022)',
    publisher: 'Natural Resources Canada',
    year: 2022,
    topics: ['policy', 'critical-minerals', 'rare-earths', 'Canada'],
    filingSources: [
      {
        type: 'html',
        url: 'https://www.canada.ca/en/campaign/critical-minerals-in-canada/canadian-critical-minerals-strategy.html',
        label: 'NRCan strategy page (HTML)',
      },
      {
        type: 'pdf',
        url: 'https://www.canada.ca/content/dam/nrcan-rncan/site/critical-minerals/Critical-minerals-strategyDec09.pdf',
        label: 'NRCan strategy PDF',
      },
    ],
  },
  {
    id: 'NRCAN-CRM-ANNUAL-2024',
    title: 'Canadian Critical Minerals Strategy — Annual Report 2024',
    publisher: 'Natural Resources Canada',
    year: 2024,
    topics: ['policy', 'critical-minerals', 'Canada', 'mining'],
    filingSources: [
      {
        type: 'html',
        url: 'https://www.canada.ca/en/campaign/critical-minerals-in-canada/canadas-critical-minerals-strategy/canadian-critical-minerals-strategy-annual-report-2024.html',
        label: 'NRCan 2024 annual report (HTML)',
      },
    ],
  },
  {
    id: 'GA-AIMR-2024-REE',
    title: "Australia's Identified Mineral Resources 2024 — Rare Earth Elements",
    publisher: 'Geoscience Australia',
    year: 2024,
    topics: ['reserves', 'production', 'Australia', 'rare-earths'],
    filingSources: [
      {
        type: 'html',
        url: 'https://www.ga.gov.au/aimr2024/commodity-summaries',
        label: 'GA AIMR 2024 commodity summaries (REE section)',
      },
    ],
  },
  {
    id: 'GA-CRITICAL-MINERALS-2024',
    title: 'Critical minerals at Geoscience Australia',
    publisher: 'Geoscience Australia',
    year: 2024,
    topics: ['critical-minerals', 'Australia', 'rare-earths', 'reserves'],
    filingSources: [
      {
        type: 'html',
        url: 'https://www.ga.gov.au/scientific-topics/minerals/critical-minerals',
        label: 'GA critical minerals overview',
      },
    ],
  },
  {
    id: 'EU-JRC-CRM-2023',
    title: 'Study on Critical Raw Materials for the EU (2023)',
    publisher: 'European Commission / JRC',
    year: 2023,
    topics: ['critical-minerals', 'supply-risk', 'rare-earths', 'EU'],
    filingSources: [
      {
        type: 'pdf',
        url: 'https://www.eunews.it/wp-content/uploads/2023/10/study-on-the-critical-raw-materials-for-the-eu-2023-ET0723116ENN.pdf',
        label: 'JRC CRM 2023 final report PDF',
      },
      {
        type: 'html',
        url: 'https://op.europa.eu/en/publication-detail/-/publication/57318397-fdd4-11ed-a05c-01aa75ed71a1',
        label: 'Publications Office landing page',
      },
    ],
  },
  {
    id: 'USGS-MIS-REE-2024',
    title: 'USGS Mineral Industry Surveys — Rare Earths (quarterly index)',
    publisher: 'U.S. Geological Survey',
    year: 2024,
    topics: ['production', 'trade', 'quarterly', 'US'],
    filingSources: [
      {
        type: 'html',
        url: 'https://www.usgs.gov/centers/national-minerals-information-center/mineral-industry-surveys',
        label: 'NMIC Mineral Industry Surveys index',
      },
    ],
  },
  {
    id: 'CHINA-MOFcom-EXPORT-2023',
    title: 'China export controls & REE quota context (MOFCOM/MIIT)',
    publisher: 'MOFCOM / MIIT (curated via USGS MCS)',
    year: 2023,
    topics: ['policy', 'China', 'export-controls', 'quotas'],
    filingSources: [
      {
        type: 'html',
        url: 'https://www.mofcom.gov.cn/',
        label: 'MOFCOM portal',
      },
      {
        type: 'pdf',
        url: 'https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-rare-earths.pdf',
        label: 'USGS MCS 2024 REE (China quota language)',
      },
    ],
  },
  {
    id: 'MYANMAR-REE-USGS-2024',
    title: 'Myanmar ionic-clay REE supply (USGS MCS context)',
    publisher: 'U.S. Geological Survey',
    year: 2024,
    topics: ['Myanmar', 'heavy-REE', 'Dy', 'Tb', 'supply-chain'],
    filingSources: [
      {
        type: 'pdf',
        url: 'https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-rare-earths.pdf',
        label: 'USGS MCS 2024 REE (Burma/Myanmar production)',
      },
    ],
  },
  {
    id: 'USGS-PRICE-REFERENCE-2025',
    title: 'USGS MCS oxide price reference (Ce, Nd, Dy, Tb)',
    publisher: 'U.S. Geological Survey',
    year: 2025,
    topics: ['prices', 'oxides', 'reference'],
    filingSources: [
      {
        type: 'pdf',
        url: 'https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-rare-earths.pdf',
        label: 'USGS MCS 2025 REE salient prices',
      },
    ],
  },
  {
    id: 'IEA-MYANMAR-HEAVY-REE',
    title: 'IEA GCMO — Myanmar heavy REE supply chain',
    publisher: 'International Energy Agency',
    year: 2024,
    topics: ['Myanmar', 'heavy-REE', 'Dy', 'Tb', 'outlook'],
    filingSources: [
      {
        type: 'pdf',
        url: 'https://iea.blob.core.windows.net/assets/ee01701d-1d5c-4ba8-9df6-abeeac9de99a/GlobalCriticalMineralsOutlook2024.pdf',
        label: 'IEA GCMO 2024 (Myanmar/clay sections)',
      },
    ],
  },
];

export const PUBLIC_REPORT_BY_ID = Object.fromEntries(PUBLIC_REPORTS.map((r) => [r.id, r]));

export function publicReportIds() {
  return PUBLIC_REPORTS.map((r) => r.id);
}
