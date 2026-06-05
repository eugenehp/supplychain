/**
 * Declarative research questions scanned against per-ticker SEC filings.
 *
 * Each entry produces one row in the Research Q&A panel. Patterns scan
 * `filing.txt` directly; the extractor pulls a context window around each
 * match, resolves the containing section, scores, and keeps the top
 * `maxPerTicker` per ticker.
 *
 * Categories ordered by how often researchers ask about them.
 */

/** @typedef {{
 *   id: string,
 *   category: string,
 *   question: string,
 *   hint: string,
 *   patterns: RegExp[],
 *   contextChars?: number,
 *   maxPerTicker?: number,
 *   sectionBoost?: Record<string, number>,
 *   defaultQuery: string,
 *   defaultMode?: 'hybrid' | 'bm25' | 'semantic' | 'exact',
 *   numericCapture?: RegExp,
 *   numericUnit?: string,
 * }} ResearchQuestion */

const DEFAULT_SECTION_BOOST = {
  risk_factors: 1.25,
  business: 1.10,
  suppliers: 1.30,
  mda: 1.05,
};

/** @type {ResearchQuestion[]} */
export const RESEARCH_QUESTIONS = [
  // ─── Revenue & customer concentration ───────────────────────────────────
  {
    id: 'gov-revenue-share',
    category: 'Revenue & customer concentration',
    question: 'What share of revenue comes from US government / DoD / NASA?',
    hint: 'Government concentration shapes program-risk and budget cycle exposure.',
    patterns: [
      /\b(?:U\.?S\.?|United States|federal)\s+government[^.]{0,200}(?:revenue|customer|sales|contracts?)/i,
      /(?:NASA|Department of Defense|Space Force|U\.?S\.?\s+Air Force|U\.?S\.?\s+Space Force)[^.]{0,200}(?:revenue|customer|contract)/i,
      /\b\d{1,3}\s*%[^.]{0,120}(?:government|federal|U\.?S\.?\s+Government)/i,
    ],
    numericCapture: /(\d{1,3})\s*%[^.]{0,120}(?:government|federal|U\.?S\.?\s+Government)/i,
    numericUnit: '% of revenue',
    defaultQuery: 'government customer revenue concentration',
    defaultMode: 'hybrid',
  },
  {
    id: 'top-customer-concentration',
    category: 'Revenue & customer concentration',
    question: 'How concentrated is revenue in the top customer or contract?',
    hint: 'A single customer >10% of revenue is a disclosable risk.',
    patterns: [
      /(\d{1,3})\s*%[^.]{0,160}(?:customer|of\s+(?:our\s+)?(?:total\s+)?(?:net\s+)?(?:revenue|sales))/i,
      /\b(?:largest|major|significant|principal)\s+customer[s]?\b[^.]{0,200}/i,
      /\b(?:customer\s+concentration|concentration\s+of\s+(?:credit|revenue))/i,
    ],
    numericCapture: /(\d{1,3})\s*%[^.]{0,160}(?:customer|revenue)/i,
    numericUnit: '% from top customer',
    defaultQuery: 'customer concentration largest customer',
    defaultMode: 'hybrid',
  },
  {
    id: 'backlog-book-to-bill',
    category: 'Revenue & customer concentration',
    question: 'What is the backlog and book-to-bill profile?',
    hint: 'Backlog signals revenue visibility; book-to-bill above 1 means growing.',
    patterns: [
      /\bbacklog[^.]{0,200}\$\s?[\d,.]+\s*(?:billion|million)/i,
      /\b(?:firm|funded|unfunded)\s+backlog\b[^.]{0,200}/i,
      /\bbook[- ]to[- ]bill\b[^.]{0,160}/i,
      /\bunbilled\s+revenue\b[^.]{0,160}/i,
    ],
    defaultQuery: 'backlog firm contract',
    defaultMode: 'hybrid',
  },
  {
    id: 'anchor-program-risk',
    category: 'Revenue & customer concentration',
    question: 'Which anchor government programs drive revenue?',
    hint: 'Programs like Artemis, NSSL, NRO contracts concentrate execution risk.',
    patterns: [
      /\bArtemis\b[^.]{0,240}/i,
      /\b(?:National Security Space Launch|NSSL)\b[^.]{0,240}/i,
      /\b(?:NRO|National Reconnaissance Office)\b[^.]{0,240}/i,
      /\bSpace Development Agency\b[^.]{0,240}/i,
      /\bCommercial\s+(?:Crew|Resupply|LEO|Lunar)[^.]{0,200}/i,
    ],
    defaultQuery: 'Artemis Space Force NSSL program',
    defaultMode: 'hybrid',
  },

  // ─── Unit economics ─────────────────────────────────────────────────────
  {
    id: 'launch-cadence-success',
    category: 'Unit economics',
    question: 'How often do they launch and at what success rate?',
    hint: 'Cadence × success rate sets the revenue ceiling for launch businesses.',
    patterns: [
      /\b(?:we|the company)\s+(?:conducted|completed|achieved|launched)[^.]{0,160}(?:launch|missions?|flights?)/i,
      /\b(?:mission|launch)\s+success\s+rate[^.]{0,160}/i,
      /\bsuccessful(?:ly)?\s+launch[^.]{0,200}/i,
      /\b(?:\d+|[a-z]+)\s+(?:successful\s+)?launches?\s+(?:in|during|conducted)/i,
    ],
    defaultQuery: 'launches conducted mission success',
    defaultMode: 'hybrid',
  },
  {
    id: 'reusability-economics',
    category: 'Unit economics',
    question: 'How does reusability and refurbishment affect cost?',
    hint: 'Booster reuse is the single largest cost lever in modern launch.',
    patterns: [
      /\breusab(?:le|ility)\b[^.]{0,240}/i,
      /\brefurbish(?:ed|ing|ment)?\b[^.]{0,240}/i,
      /\brecover(?:y|ed|able)\b[^.]{0,200}(?:booster|first stage|rocket|vehicle)/i,
      /\b(?:Neutron|Falcon|New Glenn)\b[^.]{0,200}(?:reusab|recovery|land)/i,
    ],
    defaultQuery: 'reusable refurbishment recovery booster',
    defaultMode: 'hybrid',
  },
  {
    id: 'segment-margin',
    category: 'Unit economics',
    question: 'What are gross margins by business segment?',
    hint: 'Space-systems vs launch vs services often have very different margin profiles.',
    patterns: [
      /\bgross\s+(?:profit\s+)?margin\b[^.]{0,200}/i,
      /\bsegment\s+(?:profit|loss|results|margin)\b[^.]{0,240}/i,
      /\b(?:Space Systems|Launch Services|Mission Solutions|Space Manufacturing|Imagery)\b[^.]{0,200}(?:revenue|margin|cost)/i,
    ],
    defaultQuery: 'gross margin segment results',
    defaultMode: 'hybrid',
  },

  // ─── Supply chain ───────────────────────────────────────────────────────
  {
    id: 'sole-source-suppliers',
    category: 'Supply chain',
    question: 'Which components are sourced from sole/single suppliers?',
    hint: 'Sole-source disclosures surface single-point failure risks.',
    patterns: [
      /\bsole[- ]source/i,
      /\bsingle[- ]source/i,
      /\bsole\s+supplier/i,
      /\bsingle\s+supplier/i,
      /\blimited\s+number\s+of\s+(?:suppliers|sources)/i,
      /\bqualified\s+(?:single|sole)?\s*suppliers?/i,
    ],
    sectionBoost: { ...DEFAULT_SECTION_BOOST, suppliers: 1.40 },
    defaultQuery: 'sole source single source supplier',
    defaultMode: 'hybrid',
  },
  {
    id: 'long-lead-time',
    category: 'Supply chain',
    question: 'Which inputs have long lead times or supply shortages?',
    hint: 'Long lead times constrain launch cadence and constellation replenishment.',
    patterns: [
      /\blong\s+lead[- ]time/i,
      /\blead[- ]times?\s+(?:of|exceed|range|are|have)/i,
      /\b(?:semiconductor|component)\s+shortage/i,
      /\bsupply\s+chain\s+(?:disruption|constraint|delay)/i,
    ],
    defaultQuery: 'long lead time supply shortage',
    defaultMode: 'hybrid',
  },
  {
    id: 'propulsion-suppliers',
    category: 'Supply chain',
    question: 'Who supplies propulsion (engines, turbopumps, thrusters)?',
    hint: 'Propulsion is the most-disclosed and most-concentrated subsystem.',
    patterns: [
      /\b(?:engine|propulsion|turbopump|thruster|nozzle)\b[^.]{0,200}(?:supplier|source|qualified|certified|provided\s+by|manufactured\s+by)/i,
      /\b(?:Rocketdyne|Aerojet|Blue Origin|BE-4|RD-180|RD-181|Vulcain|Raptor|Rutherford|Archimedes|HyImpulse)\b[^.]{0,200}/i,
      /\b(?:Hall[- ]effect|ion|electric|monopropellant|bipropellant)\s+(?:thruster|propulsion)/i,
    ],
    defaultQuery: 'propulsion engine supplier turbopump',
    defaultMode: 'hybrid',
  },
  {
    id: 'rad-hard-semiconductors',
    category: 'Supply chain',
    question: 'Where do radiation-hardened semiconductors come from?',
    hint: 'Rad-hard chips have very few qualified vendors — concentration risk and export-controlled.',
    patterns: [
      /\bradiation[- ]hardened/i,
      /\brad[- ]hard\b/i,
      /\bspace[- ]grade\s+(?:component|semiconductor|chip|FPGA)/i,
      /\b(?:RAD750|LEON|Vorago|BAE\s+Systems|Microchip|Renesas|Cobham|Frontgrade)\b[^.]{0,200}/i,
      /\b(?:ASIC|FPGA)\b[^.]{0,200}(?:rad|space|qualified|hardened)/i,
    ],
    defaultQuery: 'radiation hardened space grade semiconductor',
    defaultMode: 'hybrid',
  },
  {
    id: 'solar-photovoltaic',
    category: 'Supply chain',
    question: 'Who supplies solar cells and photovoltaic arrays?',
    hint: 'High-efficiency triple-junction GaAs cells are a concentrated input.',
    patterns: [
      /\bsolar\s+(?:cell|array|panel)/i,
      /\bphotovoltaic/i,
      /\b(?:triple[- ]junction|GaAs|gallium\s+arsenide)/i,
      /\b(?:Spectrolab|SolAero|Rocket Lab\s+SolAero|Azur\s+Space|CESI)\b[^.]{0,200}/i,
    ],
    defaultQuery: 'solar cell photovoltaic array',
    defaultMode: 'hybrid',
  },
  {
    id: 'structural-composites',
    category: 'Supply chain',
    question: 'Where do structural composites and specialty alloys come from?',
    hint: 'Carbon fiber, titanium, Inconel — long-lead, often dual-use export-controlled.',
    patterns: [
      /\b(?:carbon|composite|fiber|filament)\s+(?:fiber|wound|reinforced|prepreg)/i,
      /\b(?:Inconel|titanium|aluminum[- ]lithium|Haynes|stainless\s+steel)\b[^.]{0,200}/i,
      /\bcomposite\s+(?:overwrap|pressure|tank|structure|fairing)/i,
    ],
    defaultQuery: 'carbon composite titanium Inconel',
    defaultMode: 'hybrid',
  },

  // ─── Regulatory ─────────────────────────────────────────────────────────
  {
    id: 'faa-launch-licensing',
    category: 'Regulatory',
    question: 'How does FAA Part 450 licensing affect operations?',
    hint: 'New Part 450 rules are reshaping launch licensing timelines.',
    patterns: [
      /\bFAA\b[^.]{0,240}(?:license|licensing|Part 450|launch|reentry|operator)/i,
      /\bPart\s+450\b[^.]{0,200}/i,
      /\b(?:launch|reentry)\s+license/i,
      /\bOffice of Commercial Space Transportation/i,
    ],
    defaultQuery: 'FAA launch license Part 450',
    defaultMode: 'hybrid',
  },
  {
    id: 'fcc-spectrum-debris',
    category: 'Regulatory',
    question: 'What FCC spectrum allocations and orbital-debris rules apply?',
    hint: 'Spectrum coordination and 5-year deorbit rule directly affect constellations.',
    patterns: [
      /\bFCC\b[^.]{0,240}(?:spectrum|license|orbital|allocation|coordination)/i,
      /\borbital\s+debris/i,
      /\b(?:Ka|Ku|V|S|L|X|C)[- ]band\b[^.]{0,200}/i,
      /\b(?:deorbit|de-orbit|disposal|post[- ]mission)\b[^.]{0,200}/i,
      /\bspectrum\s+(?:license|allocation|coordination|interference)/i,
    ],
    defaultQuery: 'FCC spectrum orbital debris deorbit',
    defaultMode: 'hybrid',
  },
  {
    id: 'noaa-remote-sensing',
    category: 'Regulatory',
    question: 'What NOAA / remote-sensing licensing applies?',
    hint: 'EO/SAR companies need a NOAA license that limits resolution and tasking.',
    patterns: [
      /\bNOAA\b[^.]{0,240}(?:license|licensing|remote sensing|imagery)/i,
      /\bremote\s+sensing\s+(?:license|system|operator)/i,
      /\bCommercial Remote Sensing Regulatory Affairs/i,
    ],
    defaultQuery: 'NOAA remote sensing license',
    defaultMode: 'hybrid',
  },
  {
    id: 'itar-export-control',
    category: 'Regulatory',
    question: 'How does ITAR / EAR / export control constrain the business?',
    hint: 'Space hardware is heavily ITAR/EAR — affects suppliers, customers, and partnerships.',
    patterns: [
      /\bITAR\b[^.]{0,240}/i,
      /\b(?:Export Administration Regulations|EAR)\b[^.]{0,240}/i,
      /\b(?:U\.?S\.?\s+)?Munitions\s+List\b/i,
      /\bexport\s+control[^.]{0,240}/i,
      /\bdeemed\s+export/i,
    ],
    defaultQuery: 'ITAR export control munitions',
    defaultMode: 'hybrid',
  },
  {
    id: 'continuing-resolution-shutdown',
    category: 'Regulatory',
    question: 'How exposed are they to continuing resolutions and shutdowns?',
    hint: 'CR/shutdown risk hits anyone with a large federal customer mix.',
    patterns: [
      /\bcontinuing\s+resolution/i,
      /\bgovernment\s+shutdown/i,
      /\bsequestration/i,
      /\b(?:federal|appropriations?)\s+(?:funding|budget|delay|uncertainty)/i,
    ],
    defaultQuery: 'continuing resolution government shutdown',
    defaultMode: 'hybrid',
  },

  // ─── Capital structure ──────────────────────────────────────────────────
  {
    id: 'going-concern',
    category: 'Capital structure',
    question: 'Is there any going-concern language?',
    hint: '"Substantial doubt" is the auditor signal of material funding risk.',
    patterns: [
      /\bsubstantial\s+doubt\b[^.]{0,240}/i,
      /\bgoing\s+concern\b[^.]{0,240}/i,
      /\bability\s+to\s+continue\s+as\s+a\s+going\s+concern/i,
    ],
    sectionBoost: { ...DEFAULT_SECTION_BOOST, risk_factors: 1.45 },
    defaultQuery: 'substantial doubt going concern',
    defaultMode: 'exact',
  },
  {
    id: 'warrant-dilution',
    category: 'Capital structure',
    question: 'How much warrant overhang and PIPE dilution exists?',
    hint: 'Many space companies came public via SPAC — warrant + PIPE math drives float dilution.',
    patterns: [
      /\b(?:public|private)\s+warrants?\b[^.]{0,240}/i,
      /\bPIPE\s+(?:financing|investors|investment)/i,
      /\bdilution\b[^.]{0,200}(?:warrant|PIPE|convertible|equity)/i,
      /\b(?:Series\s+[A-Z]|convertible)\s+notes?\b[^.]{0,200}/i,
    ],
    defaultQuery: 'warrants PIPE dilution convertible',
    defaultMode: 'hybrid',
  },
  {
    id: 'rd-spending',
    category: 'Capital structure',
    question: 'How much is spent on R&D and what is it funding?',
    hint: 'R&D intensity differs sharply between mature primes and new-vehicle programs.',
    patterns: [
      /\b(?:research\s+and\s+development|R\s*&\s*D)\s+(?:expenses?|spending|costs?|investment)[^.]{0,240}/i,
      /\bproduct\s+development\s+(?:costs?|expenses?)/i,
      /\bcapitalized\s+software\s+development/i,
    ],
    numericCapture: /\$([\d,.]+)\s*(million|billion)[^.]{0,80}(?:research|R\s*&\s*D|product development)/i,
    numericUnit: 'R&D',
    defaultQuery: 'research and development expenses',
    defaultMode: 'hybrid',
  },
  {
    id: 'capex-facilities',
    category: 'Capital structure',
    question: 'What capex is going to factories and launch pads?',
    hint: 'Capex signals manufacturing scale-up and infrastructure commitments.',
    patterns: [
      /\bcapital\s+expenditures?\b[^.]{0,240}/i,
      /\b(?:factory|manufacturing|production)\s+(?:facility|capacity|expansion|build[- ]?out)/i,
      /\b(?:Megafactory|launch\s+(?:complex|pad|site)|integration\s+facility)/i,
      /\b(?:Cape Canaveral|Kennedy|Wallops|Vandenberg|Mahia|Kourou|M[Ɨ]hia)\b[^.]{0,200}/i,
    ],
    numericCapture: /\$([\d,.]+)\s*(million|billion)[^.]{0,80}(?:capital expenditures?|capex|facility|factory)/i,
    numericUnit: 'capex',
    defaultQuery: 'capital expenditures factory launch pad',
    defaultMode: 'hybrid',
  },

  // ─── Risk ───────────────────────────────────────────────────────────────
  {
    id: 'asat-jamming-cyber',
    category: 'Risk',
    question: 'What is the disclosed exposure to ASAT, jamming, and cyber threats?',
    hint: 'Counter-space threats now disclosed alongside cyber risk.',
    patterns: [
      /\b(?:ASAT|anti[- ]satellite|counter[- ]space)/i,
      /\b(?:jamming|spoofing|RF\s+interference|electronic\s+warfare)/i,
      /\bcyber(?:attack|security|incident)[^.]{0,200}(?:satellite|spacecraft|ground|network|constellation)/i,
    ],
    defaultQuery: 'ASAT jamming cyber attack',
    defaultMode: 'hybrid',
  },
  {
    id: 'insurance-availability',
    category: 'Risk',
    question: 'How available and expensive is launch / on-orbit insurance?',
    hint: 'Insurance market tightness directly affects net launch economics.',
    patterns: [
      /\b(?:launch|on[- ]orbit|in[- ]orbit|third[- ]party)\s+insurance/i,
      /\b(?:insurance\s+coverage|self[- ]insured|insurance\s+premium)/i,
      /\b(?:uninsured\s+loss|insurance\s+market)/i,
    ],
    defaultQuery: 'launch insurance uninsured loss',
    defaultMode: 'hybrid',
  },
  {
    id: 'geopolitical-russia-china',
    category: 'Risk',
    question: 'What Russia / China exposure or counter-party risk exists?',
    hint: 'RD-180 history, Soyuz dependence, Long March competition — all disclosed.',
    patterns: [
      /\b(?:Russia|Russian)\b[^.]{0,200}(?:supplier|engine|launch|sanction|component)/i,
      /\bRD[- ]?180\b[^.]{0,200}/i,
      /\bSoyuz\b[^.]{0,200}/i,
      /\b(?:China|Chinese|PRC)\b[^.]{0,200}(?:supplier|component|sanction|export|competit)/i,
      /\bLong\s+March\b[^.]{0,200}/i,
      /\bWassenaar\b/i,
    ],
    defaultQuery: 'Russia RD-180 China Long March',
    defaultMode: 'hybrid',
  },

  // ─── Constellation operations ───────────────────────────────────────────
  {
    id: 'replenishment-failures',
    category: 'Constellation operations',
    question: 'What is the constellation replenishment cadence and on-orbit failure rate?',
    hint: 'Replenishment economics drive constellation cost-of-service.',
    patterns: [
      /\breplenish(?:ment|ed|ing)\b[^.]{0,240}/i,
      /\bon[- ]orbit\s+(?:failure|anomal|loss)/i,
      /\bend[- ]of[- ]life|EOL\b[^.]{0,200}/i,
      /\bconstellation\s+(?:size|cadence|design\s+life|operational\s+life)/i,
    ],
    defaultQuery: 'replenishment on-orbit failure end of life',
    defaultMode: 'hybrid',
  },
  {
    id: 'spectrum-coordination-disputes',
    category: 'Constellation operations',
    question: 'Are there spectrum coordination disputes with other operators?',
    hint: 'Direct-to-device and NGSO/GSO overlap fights surface here.',
    patterns: [
      /\b(?:spectrum|frequency)\s+(?:coordination|interference|priority|dispute)/i,
      /\b(?:NGSO|GSO|MSS|terrestrial)\b[^.]{0,200}(?:interference|coordination|priority|incumbent)/i,
      /\b(?:Starlink|OneWeb|Kuiper|Globalstar|Iridium|ASTS)\b[^.]{0,200}(?:interference|coordination|spectrum)/i,
    ],
    defaultQuery: 'spectrum coordination interference NGSO',
    defaultMode: 'hybrid',
  },

  // ─── M&A / partnerships ────────────────────────────────────────────────
  {
    id: 'acquisitions',
    category: 'M&A & partnerships',
    question: 'What recent acquisitions or business combinations?',
    hint: 'Primes are rolling up small-sat and software companies.',
    patterns: [
      /\b(?:acquired|acquisition\s+of|business\s+combination)[^.]{0,240}/i,
      /\bpurchase\s+price\s+allocation/i,
      /\bgoodwill\b[^.]{0,200}acquisition/i,
    ],
    defaultQuery: 'acquisition business combination goodwill',
    defaultMode: 'hybrid',
  },
  {
    id: 'joint-ventures',
    category: 'M&A & partnerships',
    question: 'What joint ventures and strategic alliances are active?',
    hint: 'ULA, ArianeGroup, Sierra Space, hosted-payload deals all surface as JVs.',
    patterns: [
      /\bjoint\s+venture\b[^.]{0,240}/i,
      /\bstrategic\s+(?:alliance|partnership|agreement|relationship)\b[^.]{0,240}/i,
      /\b(?:United Launch Alliance|ULA|ArianeGroup|Sierra Space)\b[^.]{0,200}/i,
      /\bteaming\s+agreement\b/i,
    ],
    defaultQuery: 'joint venture strategic alliance',
    defaultMode: 'hybrid',
  },
];

export const CATEGORIES = [
  'Revenue & customer concentration',
  'Unit economics',
  'Supply chain',
  'Regulatory',
  'Capital structure',
  'Risk',
  'Constellation operations',
  'M&A & partnerships',
];

export { DEFAULT_SECTION_BOOST };
