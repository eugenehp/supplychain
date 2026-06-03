/** Rare-earth value chain stages: mine → concentrate → separation → metal → magnet → OEM. */

export const VALUE_CHAIN_STAGES = [
  {
    id: 'mine',
    label: 'Mine / deposit',
    shortLabel: 'Mine',
    description: 'Hard-rock or clay REE ore extraction (bastnaesite, monazite, ion-adsorption clay).',
    order: 0,
  },
  {
    id: 'concentrate',
    label: 'Beneficiation / concentrate',
    shortLabel: 'Concentrate',
    description: 'Crushing, flotation, or leach to produce REE mineral concentrate before separation.',
    order: 1,
  },
  {
    id: 'separation',
    label: 'Separation / SX',
    shortLabel: 'Separation',
    description: 'Solvent extraction and cracking to split mixed REE into individual oxides (NdPr, Dy, Tb, etc.).',
    order: 2,
  },
  {
    id: 'metal',
    label: 'Metal / alloy / oxide',
    shortLabel: 'Metal',
    description: 'Reduction to REE metal, NdFeB alloy strip casting, or specialty oxide products.',
    order: 3,
  },
  {
    id: 'magnet',
    label: 'Magnet manufacturing',
    shortLabel: 'Magnet',
    description: 'Sintered NdFeB or bonded magnet production for motors, generators, and actuators.',
    order: 4,
  },
  {
    id: 'oem',
    label: 'OEM / end use',
    shortLabel: 'OEM',
    description: 'Automotive, wind, defense, and electronics manufacturers consuming magnets or REE risk language.',
    order: 5,
  },
];

export const CHAIN_STAGE_BY_ID = Object.fromEntries(VALUE_CHAIN_STAGES.map((s) => [s.id, s]));

/** Explicit chain stage for curated mining sites. */
export const SITE_CHAIN_STAGE = {
  'mountain-pass': 'mine',
  'white-mesa': 'separation',
  'round-top': 'mine',
  'bear-lodge': 'mine',
  'stillwater-ree': 'separation',
  'mt-weld': 'mine',
  'kalgoorlie-ree': 'concentrate',
  'lynas-malaysia': 'separation',
  'yangibana': 'mine',
  'ngualla': 'mine',
  'nolans': 'mine',
  'songwe': 'mine',
  'bayan-obo': 'mine',
  'southern-ionics': 'separation',
  'mountain-weld-cn': 'separation',
  'eneabba': 'concentrate',
  'steenkampskraal': 'mine',
  kvanefjeld: 'mine',
  dubbo: 'mine',
  makuutu: 'mine',
  nechalacho: 'mine',
  brockman: 'mine',
  'browns-range': 'mine',
  'mount-weld-cn-alt': 'separation',
  mianning: 'separation',
  'dong-pao': 'separation',
  'strange-lake': 'mine',
  lovozero: 'mine',
  tomtor: 'mine',
  araxa: 'mine',
  goias: 'mine',
  longonjo: 'mine',
  lofdal: 'mine',
  'norra-karr': 'mine',
  'halleck-creek': 'mine',
  bokan: 'mine',
  strathmore: 'mine',
  'phosphate-florida': 'concentrate',
  'saskatchewan-ree': 'separation',
  'madagascar-tantalus': 'mine',
  'india-chavara': 'concentrate',
  'malaysia-lynas-alt': 'separation',
  'sierra-rutile': 'concentrate',
};

/** @param {{ id?: string, status?: string, notes?: string }} site */
export function chainStageForSite(site) {
  if (site?.id && SITE_CHAIN_STAGE[site.id]) return SITE_CHAIN_STAGE[site.id];
  if (site?.status === 'processing') return 'separation';
  if (site?.status === 'operating' && /mill|plant|separation|LAMP/i.test(site.notes ?? '')) return 'separation';
  if (site?.status === 'development' || site?.status === 'deposit') return 'mine';
  return 'mine';
}

/** @param {{ role?: string, ticker?: string, chainStage?: string }} entity */
export function chainStageForCompany(entity) {
  if (entity?.chainStage) return entity.chainStage;
  if (entity?.role === 'downstream') return 'oem';
  if (entity?.role === 'developer') return 'mine';
  if (entity?.role === 'miner') return 'mine';
  if (entity?.role === 'processor') return 'separation';
  return 'separation';
}

/** Nd walkthrough linking stages to example sites/companies. */
export const ND_CHAIN_WALKTHROUGH = [
  {
    stage: 'mine',
    label: 'Mountain Pass, CA',
    entity: 'MP Materials',
    ticker: 'MP',
    siteId: 'mountain-pass',
    note: 'Bastnaesite ore — only scaled U.S. REE mine.',
  },
  {
    stage: 'concentrate',
    label: 'Mt Weld → concentrate',
    entity: 'Lynas Rare Earths',
    ticker: 'LYC.AX',
    siteId: 'mt-weld',
    note: 'Australian ore concentrated before export to Malaysia separation.',
  },
  {
    stage: 'separation',
    label: 'Kuantan LAMP / White Mesa',
    entity: 'Lynas / Energy Fuels',
    ticker: 'LYC.AX / UUUU',
    siteId: 'lynas-malaysia',
    note: 'Solvent extraction splits NdPr from La/Ce and heavy REE.',
  },
  {
    stage: 'metal',
    label: 'NdPr metal / alloy',
    entity: 'Shenghe / CNRE (China)',
    ticker: '600392.SS',
    siteId: 'bayan-obo',
    note: 'Most global NdPr oxide and metal capacity remains in China.',
  },
  {
    stage: 'magnet',
    label: 'Sintered NdFeB',
    entity: 'JL MAG / Proterial / TDK',
    ticker: '300748.SZ',
    siteId: null,
    note: 'Magnet makers source separated oxides; Japan/Korea/China dominate capacity.',
  },
  {
    stage: 'oem',
    label: 'EV traction motor',
    entity: 'Tesla / GM / Ford',
    ticker: 'TSLA',
    siteId: null,
    note: 'OEMs disclose REE supply risk in 10-K — rarely name mines directly.',
  },
];

export function buildValueChainIndex({ sites = [], companies = [] }) {
  const byStage = Object.fromEntries(VALUE_CHAIN_STAGES.map((s) => [s.id, { ...s, sites: [], companies: [] }]));

  for (const site of sites) {
    const stage = chainStageForSite(site);
    byStage[stage]?.sites.push({ ...site, chainStage: stage });
  }

  for (const co of companies) {
    const stage = chainStageForCompany(co);
    byStage[stage]?.companies.push({ ...co, chainStage: stage });
  }

  return {
    stages: VALUE_CHAIN_STAGES,
    byStage: Object.values(byStage).sort((a, b) => a.order - b.order),
    walkthrough: ND_CHAIN_WALKTHROUGH,
    methodology:
      'Chain stage tags are curated for known sites and inferred from operating status (processing → separation). Company stage maps role: miner→mine, processor→separation, downstream SEC filers→OEM.',
  };
}
