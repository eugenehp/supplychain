/**
 * Declarative deep-dive case studies for the space-economy topic.
 *
 * Each deep-dive runs the same passage-extraction logic as the main research
 * panel but with a narrower ticker filter and topic-specific patterns.
 */

/** @typedef {{
 *   id: string,
 *   title: string,
 *   subtitle: string,
 *   tickerFilter?: string[] | null,   // restrict to these tickers (null = all)
 *   ignoreTickers?: string[],         // exclude these (used for competitor mentions)
 *   sections: Array<{
 *     id: string,
 *     title: string,
 *     hint: string,
 *     patterns: RegExp[],
 *     maxPerTicker?: number,
 *     maxTotal?: number,
 *     contextChars?: number,
 *   }>
 * }} DeepDive */

const SECTION_BOOST = {
  risk_factors: 1.20,
  business: 1.30,        // boosted — deep-dives lean on Item 1
  suppliers: 1.30,
  mda: 1.10,
};

/** @type {DeepDive[]} */
export const DEEP_DIVES = [
  {
    id: 'rocket-lab',
    title: 'Rocket Lab — Electron & Neutron',
    subtitle:
      'RKLB 10-K reverse-traced: sole-source propulsion, vertical integration via SolAero / Sinclair / Planetary Systems, ' +
      'and the Electron-to-Neutron transition.',
    anchorTicker: 'RKLB',
    tickerFilter: ['RKLB'],
    sections: [
      {
        id: 'electron-vehicle',
        title: 'Electron launch vehicle',
        hint: 'Small-lift workhorse — cadence, recovery, and Rutherford engine economics.',
        patterns: [/\bElectron\b[^.]{0,260}/g, /\bRutherford\b[^.]{0,260}/g, /\bturbopump\b[^.]{0,200}/g],
        maxPerTicker: 6,
      },
      {
        id: 'neutron-vehicle',
        title: 'Neutron program (medium-lift)',
        hint: 'Reusable medium-lift class — schedule risk, Archimedes engine, Wallops infrastructure.',
        patterns: [
          /\bNeutron\b[^.]{0,260}/g,
          /\bArchimedes\b[^.]{0,260}/g,
          /\bmedium[- ]lift\b[^.]{0,200}/g,
          /\bWallops\b[^.]{0,200}/g,
        ],
        maxPerTicker: 6,
      },
      {
        id: 'space-systems',
        title: 'Space Systems segment',
        hint: 'Photon bus, SolAero solar cells, Sinclair Interplanetary, Planetary Systems separation rings.',
        patterns: [
          /\bPhoton\b[^.]{0,240}/g,
          /\bSolAero\b[^.]{0,240}/g,
          /\bSinclair Interplanetary\b[^.]{0,240}/g,
          /\bPlanetary Systems\b[^.]{0,240}/g,
          /\bSpace Systems\s+segment\b[^.]{0,240}/g,
          /\bspacecraft component[s]?\b[^.]{0,220}/g,
        ],
        maxPerTicker: 6,
      },
      {
        id: 'cadence-success',
        title: 'Launch cadence & mission success',
        hint: 'Where the 10-K narrates cadence, success rate, and manifest.',
        patterns: [
          /\b(?:successful(?:ly)?\s+)?(?:conducted|completed|launched)[^.]{0,220}(?:launches?|missions?|flights?)/gi,
          /\b(?:launch|mission)\s+success\s+rate[^.]{0,180}/gi,
          /\b\d+\s+(?:successful\s+)?launches?\s+(?:in|during|to date)/gi,
        ],
        maxPerTicker: 5,
      },
      {
        id: 'vertical-integration',
        title: 'Vertical integration & supplier risk',
        hint: 'Rocket Lab pitches vertical integration — these excerpts show where they still depend on suppliers.',
        patterns: [
          /\bvertically\s+integrated\b[^.]{0,240}/gi,
          /\b(?:sole|single)[- ]source[^.]{0,240}/gi,
          /\binternally\s+(?:design|develop|manufactur)/gi,
        ],
        maxPerTicker: 5,
      },
    ],
  },
  {
    id: 'constellation-landscape',
    title: 'Constellation landscape',
    subtitle:
      'How public space companies discuss Starlink, OneWeb / Eutelsat, Project Kuiper, Iridium NEXT, and direct-to-device — ' +
      'aggregated across the watchlist of competitor disclosures.',
    tickerFilter: null,
    sections: [
      {
        id: 'starlink',
        title: 'Starlink',
        hint: 'SpaceX is private — Starlink only surfaces in competitor 10-Ks. Useful proxy for competitive intensity.',
        patterns: [/\bStarlink\b[^.]{0,300}/g, /\bSpaceX\b[^.]{0,260}/g],
        maxPerTicker: 2,
        maxTotal: 25,
      },
      {
        id: 'oneweb-eutelsat',
        title: 'OneWeb / Eutelsat',
        hint: 'OneWeb merged into Eutelsat (2023). Tracked through partner and competitor filings.',
        patterns: [/\bOneWeb\b[^.]{0,300}/g, /\bEutelsat\b[^.]{0,260}/g],
        maxPerTicker: 2,
        maxTotal: 20,
      },
      {
        id: 'kuiper',
        title: 'Project Kuiper (Amazon)',
        hint: 'Amazon Kuiper just deploying — already cited as competitive threat by satcom and EO companies.',
        patterns: [/\b(?:Project\s+)?Kuiper\b[^.]{0,300}/g],
        maxPerTicker: 2,
        maxTotal: 18,
      },
      {
        id: 'iridium-nxt',
        title: 'Iridium NEXT & Globalstar',
        hint: 'Existing LEO constellations — replenishment economics surface in IRDM/GSAT and competitor filings.',
        patterns: [
          /\bIridium\s+NEXT\b[^.]{0,260}/g,
          /\bIridium[^.\w]{0,3}[a-z]/g,
          /\bGlobalstar\b[^.]{0,260}/g,
        ],
        maxPerTicker: 2,
        maxTotal: 18,
      },
      {
        id: 'direct-to-device',
        title: 'Direct-to-device & supplemental coverage',
        hint: 'Spectrum war between MSS holders (GSAT, IRDM) and terrestrial-licensed entrants (ASTS, Starlink).',
        patterns: [
          /\bdirect[- ]to[- ]device\b[^.]{0,260}/gi,
          /\bD2D\b[^.]{0,220}/g,
          /\bsupplemental\s+coverage\b[^.]{0,220}/gi,
          /\bMobile\s+Satellite\s+Services\b[^.]{0,220}/gi,
        ],
        maxPerTicker: 2,
        maxTotal: 22,
      },
      {
        id: 'megaconstellation-risk',
        title: 'Megaconstellation policy & debris',
        hint: 'Coordination, conjunctions, deorbit — increasingly disclosed as orbital congestion rises.',
        patterns: [
          /\bmega[- ]?constellation\b[^.]{0,260}/gi,
          /\bcollision\s+(?:avoidance|risk|probability)\b[^.]{0,260}/gi,
          /\bconjunction\b[^.]{0,220}/gi,
          /\borbital\s+(?:debris|congestion|crowd)/gi,
        ],
        maxPerTicker: 2,
        maxTotal: 18,
      },
    ],
  },
];

export { SECTION_BOOST };
