/** Section ids for materials page TOC, tour, and scroll-spy. */
export const MATERIALS_SECTIONS = [
  { id: 'materials-overview', label: 'Overview' },
  { id: 'materials-tour', label: 'Tour' },
  { id: 'materials-search', label: 'Search' },
  { id: 'value-chain', label: 'Value chain' },
  { id: 'materials-stats', label: 'Metrics' },
  { id: 'mendeleev', label: 'Periodic table' },
  { id: 'element-detail', label: 'Element' },
  { id: 'geo-distribution', label: 'Geography' },
  { id: 'supply-timeline', label: 'Timeline' },
  { id: 'mining-sites-map', label: 'Sites map' },
  { id: 'downstream-oem', label: 'OEM demand' },
  { id: 'international-filings', label: 'Intl filings' },
  { id: 'asx-resources', label: 'Resources' },
  { id: 'public-reports', label: 'Reports' },
  { id: 'miners-watchlist', label: 'Miners' },
  { id: 'methodology', label: 'Methodology' },
];

export const MATERIALS_TOUR_STEPS = [
  {
    sectionId: 'value-chain',
    title: 'Ore to magnet',
    body: 'Follow six value-chain stages from mine through separation, magnets, and OEM end use.',
  },
  {
    sectionId: 'mendeleev',
    title: 'Pick an element',
    body: 'Select Nd, Dy, or any REE to see uses, industries, and SEC excerpts.',
  },
  {
    sectionId: 'geo-distribution',
    title: 'Compare geography modes',
    body: 'SEC co-occurrence ≠ USGS production. Use Compare to see both for one element.',
  },
  {
    sectionId: 'supply-timeline',
    title: 'Policy & price shocks',
    body: 'China quotas, Myanmar disruption, EU CRMA — events that moved supply chains.',
  },
  {
    sectionId: 'mining-sites-map',
    title: 'Where it happens',
    body: 'Zoom the map; filter by chain stage (mine vs separation vs concentrate).',
  },
  {
    sectionId: 'downstream-oem',
    title: 'Who depends on it',
    body: 'Auto, defense, and chip OEMs disclose REE risk in 10-K filings.',
  },
  {
    sectionId: 'materials-search',
    title: 'Search all sources',
    body: 'Query miners, international reports, and SEC RAG in one place.',
  },
];
