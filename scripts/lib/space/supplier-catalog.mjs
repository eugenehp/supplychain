/**
 * Curated catalog of space-industry suppliers + subsystems.
 *
 * Each entry maps a supplier or subsystem to a tier in our 4-tier model:
 *   Tier 0  Product (per-ticker — the company itself)
 *   Tier 1  Subsystem category (e.g., Propulsion, Avionics)
 *   Tier 2  Named supplier (e.g., Aerojet Rocketdyne, BAE Systems)
 *   Tier 3  Raw input / equipment (e.g., Titanium, Carbon composite)
 *
 * The Sankey extractor scans each company's 10-K for these regex patterns
 * and emits {nodes, links} weighted by mention count.
 */

export const SUBSYSTEM_CATEGORIES = [
  { id: 'propulsion', label: 'Propulsion', tier: 1, color: 'rocket' },
  { id: 'avionics', label: 'Avionics & ASIC/FPGA', tier: 1, color: 'electronics' },
  { id: 'rf', label: 'RF & antenna', tier: 1, color: 'rf' },
  { id: 'optics', label: 'Optics & imaging', tier: 1, color: 'optics' },
  { id: 'power', label: 'Power & solar', tier: 1, color: 'power' },
  { id: 'gnc', label: 'GN&C / star trackers', tier: 1, color: 'gnc' },
  { id: 'structures', label: 'Structures & TPS', tier: 1, color: 'structures' },
  { id: 'integration', label: 'Integration & test', tier: 1, color: 'integration' },
  { id: 'launch', label: 'Launch services', tier: 1, color: 'launch' },
  { id: 'ground', label: 'Ground & comms', tier: 1, color: 'ground' },
];

const SUB = Object.fromEntries(SUBSYSTEM_CATEGORIES.map((c) => [c.id, c]));

/** @typedef {{
 *   id: string,
 *   label: string,
 *   tier: number,
 *   subsystem: string,
 *   pattern: RegExp,
 *   inputs?: string[],
 *   country?: string | null,
 *   note?: string
 * }} SupplierEntry */

/** @type {SupplierEntry[]} */
export const SUPPLIERS = [
  // ── Propulsion ─────────────────────────────────────────────────────────
  { id: 'aerojet-rocketdyne', label: 'Aerojet Rocketdyne', tier: 2, subsystem: 'propulsion', pattern: /\bAerojet(?:\s+Rocketdyne)?\b/g, inputs: ['inconel', 'titanium'], country: 'US' },
  { id: 'rd-180', label: 'RD-180 (NPO Energomash)', tier: 2, subsystem: 'propulsion', pattern: /\bRD[- ]?180\b/g, inputs: ['inconel'], country: 'RU' },
  { id: 'be-4', label: 'BE-4 (Blue Origin)', tier: 2, subsystem: 'propulsion', pattern: /\bBE[- ]?4\b/g, inputs: ['inconel', 'methane'], country: 'US' },
  { id: 'rutherford', label: 'Rutherford engine', tier: 2, subsystem: 'propulsion', pattern: /\bRutherford\b/g, inputs: ['inconel', 'carbon-composite'], country: 'US' },
  { id: 'archimedes', label: 'Archimedes engine', tier: 2, subsystem: 'propulsion', pattern: /\bArchimedes\b/g, inputs: ['inconel', 'methane'], country: 'US' },
  { id: 'hall-effect', label: 'Hall-effect thruster', tier: 2, subsystem: 'propulsion', pattern: /\bHall[- ]?effect\b|\bHall\s+thruster/g, inputs: ['xenon'], country: 'multi' },
  { id: 'busek', label: 'Busek', tier: 2, subsystem: 'propulsion', pattern: /\bBusek\b/g, inputs: ['xenon'], country: 'US' },
  { id: 'rl10', label: 'RL10 upper stage', tier: 2, subsystem: 'propulsion', pattern: /\bRL[- ]?10\b/g, inputs: ['hydrogen'], country: 'US' },
  { id: 'methane-propellant', label: 'LOX / methane', tier: 3, subsystem: 'propulsion', pattern: /\b(?:methane|methalox|LCH4)\b/gi, inputs: [], country: null },
  { id: 'hydrogen-propellant', label: 'Liquid hydrogen', tier: 3, subsystem: 'propulsion', pattern: /\b(?:liquid\s+hydrogen|LH2)\b/gi, inputs: [], country: null },
  { id: 'xenon-propellant', label: 'Xenon propellant', tier: 3, subsystem: 'propulsion', pattern: /\bxenon\b/gi, inputs: [], country: null },

  // ── Avionics, ASIC / FPGA ──────────────────────────────────────────────
  { id: 'bae-systems', label: 'BAE Systems', tier: 2, subsystem: 'avionics', pattern: /\bBAE\s+Systems\b/g, inputs: ['rad-hard-asic'], country: 'GB' },
  { id: 'microchip', label: 'Microchip Technology', tier: 2, subsystem: 'avionics', pattern: /\bMicrochip(?:\s+Technology)?\b/g, inputs: ['rad-hard-asic'], country: 'US' },
  { id: 'renesas', label: 'Renesas', tier: 2, subsystem: 'avionics', pattern: /\bRenesas\b/g, inputs: ['rad-hard-asic'], country: 'JP' },
  { id: 'cobham-frontgrade', label: 'Frontgrade (Cobham)', tier: 2, subsystem: 'avionics', pattern: /\b(?:Frontgrade|Cobham)\b/g, inputs: ['rad-hard-asic'], country: 'US' },
  { id: 'xilinx-fpga', label: 'AMD Xilinx (FPGA)', tier: 2, subsystem: 'avionics', pattern: /\b(?:Xilinx|Versal)\b/g, inputs: ['rad-hard-asic'], country: 'US' },
  { id: 'asic-fpga', label: 'Space-grade ASIC / FPGA', tier: 1, subsystem: 'avionics', pattern: /\b(?:radiation[- ]hardened|rad[- ]hard|space[- ]grade)\s+(?:ASIC|FPGA|chip|component)/gi, inputs: [], country: null },
  { id: 'rad-hard-asic', label: 'Radiation-hardened semiconductor', tier: 3, subsystem: 'avionics', pattern: /\b(?:radiation[- ]hardened|rad[- ]hard|RAD750)\b/gi, inputs: [], country: null },

  // ── RF & antenna ───────────────────────────────────────────────────────
  { id: 'phased-array', label: 'Phased-array antenna', tier: 2, subsystem: 'rf', pattern: /\bphased[- ]array\b/gi, inputs: ['gan-rfic'], country: null },
  { id: 'wolfspeed', label: 'Wolfspeed (GaN/SiC)', tier: 2, subsystem: 'rf', pattern: /\bWolfspeed\b/g, inputs: ['gan-rfic'], country: 'US' },
  { id: 'macom', label: 'MACOM', tier: 2, subsystem: 'rf', pattern: /\bMACOM\b/g, inputs: ['gan-rfic'], country: 'US' },
  { id: 'gan-rfic', label: 'GaN / GaAs RFIC', tier: 3, subsystem: 'rf', pattern: /\b(?:GaN|gallium\s+nitride|GaAs|gallium\s+arsenide)\b/g, inputs: [], country: null },
  { id: 'ka-ku-band', label: 'Ka / Ku band electronics', tier: 2, subsystem: 'rf', pattern: /\b(?:Ka|Ku|V)[- ]band\b/g, inputs: ['gan-rfic'], country: null },

  // ── Optics & imaging ───────────────────────────────────────────────────
  { id: 'sar-payload', label: 'SAR payload', tier: 2, subsystem: 'optics', pattern: /\b(?:synthetic\s+aperture\s+radar|SAR\s+payload|SAR\s+satellite)/gi, inputs: ['gan-rfic'], country: null },
  { id: 'eo-imager', label: 'EO imager', tier: 2, subsystem: 'optics', pattern: /\b(?:electro[- ]?optical|EO\s+imag|hyperspectral|multispectral)\b/gi, inputs: ['focal-plane'], country: null },
  { id: 'focal-plane', label: 'Focal-plane array', tier: 3, subsystem: 'optics', pattern: /\bfocal[- ]plane\b/gi, inputs: [], country: null },
  { id: 'leonardo-drs', label: 'Leonardo DRS / detectors', tier: 2, subsystem: 'optics', pattern: /\bLeonardo\s+DRS\b/g, inputs: ['focal-plane'], country: 'IT' },

  // ── Power & solar ──────────────────────────────────────────────────────
  { id: 'solar-array', label: 'Deployable solar array', tier: 1, subsystem: 'power', pattern: /\b(?:deployable\s+solar|solar\s+array|rollable\s+solar)/gi, inputs: ['solar-cell'], country: null },
  { id: 'rocket-lab-solaero', label: 'Rocket Lab SolAero', tier: 2, subsystem: 'power', pattern: /\b(?:SolAero|Rocket\s+Lab\s+Solar)\b/g, inputs: ['solar-cell'], country: 'US' },
  { id: 'spectrolab', label: 'Spectrolab (Boeing)', tier: 2, subsystem: 'power', pattern: /\bSpectrolab\b/g, inputs: ['solar-cell'], country: 'US' },
  { id: 'azur-space', label: 'Azur Space Solar Power', tier: 2, subsystem: 'power', pattern: /\bAzur\s+Space\b/g, inputs: ['solar-cell'], country: 'DE' },
  { id: 'solar-cell', label: 'Triple-junction solar cell', tier: 3, subsystem: 'power', pattern: /\b(?:triple[- ]junction|GaAs\s+solar|photovoltaic)\b/gi, inputs: ['gan-rfic'], country: null },

  // ── GN&C ───────────────────────────────────────────────────────────────
  { id: 'star-tracker', label: 'Star tracker', tier: 2, subsystem: 'gnc', pattern: /\bstar[- ]tracker\b/gi, inputs: [], country: null },
  { id: 'reaction-wheel', label: 'Reaction wheel', tier: 2, subsystem: 'gnc', pattern: /\breaction\s+wheel\b/gi, inputs: [], country: null },
  { id: 'sinclair-interplanetary', label: 'Sinclair Interplanetary', tier: 2, subsystem: 'gnc', pattern: /\bSinclair\s+Interplanetary\b/g, country: 'CA' },
  { id: 'honeywell-imu', label: 'Honeywell IMU', tier: 2, subsystem: 'gnc', pattern: /\bHoneywell\b[^.]{0,80}(?:IMU|attitude|guidance|inertial)/gi, country: 'US' },

  // ── Structures & TPS ───────────────────────────────────────────────────
  { id: 'carbon-composite', label: 'Carbon-fiber composite', tier: 2, subsystem: 'structures', pattern: /\b(?:carbon\s+(?:fiber|composite)|filament[- ]wound)\b/gi, inputs: [], country: null },
  { id: 'titanium', label: 'Titanium', tier: 3, subsystem: 'structures', pattern: /\btitanium\b/gi, inputs: [], country: null },
  { id: 'inconel', label: 'Inconel / Haynes', tier: 3, subsystem: 'structures', pattern: /\b(?:Inconel|Haynes\s+\d+)\b/gi, inputs: [], country: null },
  { id: 'aluminum-lithium', label: 'Aluminum-lithium alloy', tier: 3, subsystem: 'structures', pattern: /\baluminum[- ]lithium\b/gi, inputs: [], country: null },
  { id: 'composite-tank', label: 'Composite overwrap tank', tier: 2, subsystem: 'structures', pattern: /\bcomposite[- ]overwrap\b/gi, inputs: ['carbon-composite'], country: null },
  { id: 'tps', label: 'Thermal protection (TPS)', tier: 2, subsystem: 'structures', pattern: /\bthermal\s+protection\b/gi, inputs: [], country: null },

  // ── Integration & test ─────────────────────────────────────────────────
  { id: 'cleanroom', label: 'Cleanroom integration', tier: 2, subsystem: 'integration', pattern: /\b(?:cleanroom|clean\s+room|integration\s+facility)\b/gi, inputs: [], country: null },
  { id: 'thermal-vacuum', label: 'Thermal-vacuum testing', tier: 2, subsystem: 'integration', pattern: /\bthermal[- ]vacuum\b/gi, inputs: [], country: null },
  { id: 'vibration-test', label: 'Vibration / acoustic test', tier: 2, subsystem: 'integration', pattern: /\b(?:vibration|acoustic)\s+test/gi, inputs: [], country: null },

  // ── Launch services ────────────────────────────────────────────────────
  { id: 'spacex-falcon', label: 'SpaceX Falcon 9', tier: 2, subsystem: 'launch', pattern: /\bFalcon\s+(?:9|Heavy)\b/g, country: 'US' },
  { id: 'spacex-launch', label: 'SpaceX launch services', tier: 2, subsystem: 'launch', pattern: /\bSpaceX\b/g, country: 'US' },
  { id: 'ula', label: 'ULA (Vulcan / Atlas)', tier: 2, subsystem: 'launch', pattern: /\b(?:United Launch Alliance|ULA|Vulcan|Atlas\s+V)\b/g, country: 'US' },
  { id: 'arianespace', label: 'Arianespace', tier: 2, subsystem: 'launch', pattern: /\b(?:Arianespace|Ariane\s+(?:5|6))\b/g, country: 'FR' },

  // ── Ground & comms ─────────────────────────────────────────────────────
  { id: 'ksat', label: 'KSAT ground network', tier: 2, subsystem: 'ground', pattern: /\bKSAT\b/g, country: 'NO' },
  { id: 'aws-gs', label: 'AWS Ground Station', tier: 2, subsystem: 'ground', pattern: /\bAWS\s+Ground\s+Station\b/g, country: 'US' },
  { id: 'gateway', label: 'Gateway / teleport', tier: 2, subsystem: 'ground', pattern: /\b(?:gateway|teleport|earth\s+station)\b/gi },
  { id: 'viasat-network', label: 'Viasat global network', tier: 2, subsystem: 'ground', pattern: /\bViasat\b/g, country: 'US' },
  { id: 'inmarsat-network', label: 'Inmarsat ELERA', tier: 2, subsystem: 'ground', pattern: /\bInmarsat\b/g, country: 'GB' },

  // ── European primes & integrators ─────────────────────────────────────
  { id: 'airbus-ds', label: 'Airbus Defence & Space', tier: 2, subsystem: 'integration', pattern: /\bAirbus\s+(?:Defen[cs]e\s+(?:&|and)\s+Space|DS|Group)?\b/g, country: 'FR' },
  { id: 'thales-alenia', label: 'Thales Alenia Space', tier: 2, subsystem: 'integration', pattern: /\bThales\s+Alenia(?:\s+Space)?\b/g, country: 'FR' },
  { id: 'ohb', label: 'OHB System', tier: 2, subsystem: 'integration', pattern: /\bOHB(?:\s+System)?\b/g, country: 'DE' },
  { id: 'arianegroup', label: 'ArianeGroup', tier: 2, subsystem: 'launch', pattern: /\bArianeGroup\b/g, country: 'FR' },
  { id: 'avio', label: 'Avio Vega', tier: 2, subsystem: 'launch', pattern: /\b(?:Avio|Vega[- ]?C?)\b/g, country: 'IT' },
  { id: 'safran-aero-boosters', label: 'Safran (propulsion)', tier: 2, subsystem: 'propulsion', pattern: /\bSafran\b/g, country: 'FR' },
  { id: 'oneweb-eutelsat', label: 'Eutelsat OneWeb', tier: 2, subsystem: 'ground', pattern: /\bEutelsat(?:\s+OneWeb)?\b/g, country: 'FR' },
  { id: 'ses', label: 'SES network', tier: 2, subsystem: 'ground', pattern: /\bSES\s+(?:S\.?A\.?|Government|Networks)\b/g, country: 'LU' },

  // ── Japanese / Asian space industry ───────────────────────────────────
  { id: 'mitsubishi-electric', label: 'MELCO (Mitsubishi Electric)', tier: 2, subsystem: 'integration', pattern: /\b(?:Mitsubishi\s+Electric|MELCO)\b/g, country: 'JP' },
  { id: 'mhi', label: 'Mitsubishi Heavy Industries', tier: 2, subsystem: 'launch', pattern: /\bMitsubishi\s+Heavy(?:\s+Industries)?\b/g, country: 'JP' },
  { id: 'ihi-aerospace', label: 'IHI Aerospace', tier: 2, subsystem: 'propulsion', pattern: /\bIHI(?:\s+Aerospace)?\b/g, country: 'JP' },
  { id: 'nec-space', label: 'NEC Space Systems', tier: 2, subsystem: 'integration', pattern: /\bNEC\b[^.]{0,80}(?:space|satellite)/gi, country: 'JP' },
  { id: 'hal-india', label: 'HAL (Hindustan Aeronautics)', tier: 2, subsystem: 'launch', pattern: /\bHindustan\s+Aeronautics|\bHAL\b/g, country: 'IN' },

  // ── US new-space launch & integrators ─────────────────────────────────
  { id: 'sierra-space', label: 'Sierra Space', tier: 2, subsystem: 'launch', pattern: /\bSierra\s+(?:Space|Nevada)\b/g, country: 'US' },
  { id: 'relativity-space', label: 'Relativity Space', tier: 2, subsystem: 'launch', pattern: /\bRelativity\s+Space\b/g, country: 'US' },
  { id: 'firefly-aerospace', label: 'Firefly Aerospace', tier: 2, subsystem: 'launch', pattern: /\bFirefly\s+Aerospace\b/g, country: 'US' },
  { id: 'abl-space', label: 'ABL Space Systems', tier: 2, subsystem: 'launch', pattern: /\bABL\s+Space\b/g, country: 'US' },
  { id: 'astranis', label: 'Astranis', tier: 2, subsystem: 'integration', pattern: /\bAstranis\b/g, country: 'US' },

  // ── EO/SAR & component primes ─────────────────────────────────────────
  { id: 'maxar', label: 'Maxar Intelligence', tier: 2, subsystem: 'optics', pattern: /\bMaxar(?:\s+Intelligence|\s+Technologies|\s+Space\s+Robotics)?\b/g, country: 'US' },
  { id: 'maxar-psi', label: 'Maxar Space Infrastructure', tier: 2, subsystem: 'integration', pattern: /\bMaxar\s+Space\s+Infrastructure\b/g, country: 'US' },
  { id: 'mda-canada', label: 'MDA (Canada)', tier: 2, subsystem: 'optics', pattern: /\bMDA(?:\s+Space|\s+Ltd)?\b/g, country: 'CA' },
  { id: 'iceye', label: 'ICEYE SAR', tier: 2, subsystem: 'optics', pattern: /\bICEYE\b/g, country: 'FI' },
  { id: 'capella-space', label: 'Capella Space', tier: 2, subsystem: 'optics', pattern: /\bCapella\s+Space\b/g, country: 'US' },

  // ── Antenna & RF integrators ─────────────────────────────────────────
  { id: 'kratos', label: 'Kratos Defense', tier: 2, subsystem: 'rf', pattern: /\bKratos(?:\s+Defense)?\b/g, country: 'US' },
  { id: 'cesium-astro', label: 'CesiumAstro phased array', tier: 2, subsystem: 'rf', pattern: /\bCesiumAstro\b/g, country: 'US' },
  { id: 'comtech', label: 'Comtech Telecommunications', tier: 2, subsystem: 'rf', pattern: /\bComtech\b/g, country: 'US' },

  // ── ISAM / propulsion subsystem suppliers ──────────────────────────────
  { id: 'redwire', label: 'Redwire Space', tier: 2, subsystem: 'integration', pattern: /\bRedwire\b/g, country: 'US' },
  { id: 'voyager-space', label: 'Voyager Space', tier: 2, subsystem: 'integration', pattern: /\bVoyager\s+Space\b/g, country: 'US' },
  { id: 'astroscale', label: 'Astroscale', tier: 2, subsystem: 'integration', pattern: /\bAstroscale\b/g, country: 'JP' },
  { id: 'momentus-vigoride', label: 'Momentus Vigoride', tier: 2, subsystem: 'propulsion', pattern: /\bVigoride\b/g, country: 'US' },
  { id: 'phase-four', label: 'Phase Four RF thruster', tier: 2, subsystem: 'propulsion', pattern: /\bPhase\s+Four\b/g, country: 'US' },

  // ── Tier-3 raw inputs (more) ──────────────────────────────────────────
  { id: 'krypton-propellant', label: 'Krypton propellant', tier: 3, subsystem: 'propulsion', pattern: /\bkrypton\b/gi, country: null },
  { id: 'helium-pressurant', label: 'Helium pressurant', tier: 3, subsystem: 'propulsion', pattern: /\bhelium\b/gi, country: null },
  { id: 'lithium-ion', label: 'Li-ion battery cells', tier: 3, subsystem: 'power', pattern: /\b(?:lithium[- ]ion|Li[- ]?ion)\s+(?:batter|cell|pack)/gi, country: null },
  { id: 'beryllium', label: 'Beryllium structures', tier: 3, subsystem: 'structures', pattern: /\bberyllium\b/gi, country: null },
];

/**
 * Per-ticker product anchor — what the Sankey is rooted on for each filer.
 * For multi-program filers we pick the most distinctive product / segment.
 */
export const TICKER_PRODUCTS = {
  RKLB: { product: 'Rocket Lab — Electron / Neutron', segment: 'launch' },
  ASTS: { product: 'AST SpaceMobile BlueBird constellation', segment: 'downstream' },
  BA: { product: 'Boeing Defense, Space & Security', segment: 'satellites' },
  LMT: { product: 'Lockheed Martin Space segment', segment: 'satellites' },
  NOC: { product: 'Northrop Grumman Space Systems', segment: 'satellites' },
  RTX: { product: 'RTX Space programs', segment: 'propulsion' },
  LHX: { product: 'L3Harris / Aerojet Rocketdyne', segment: 'propulsion' },
  IRDM: { product: 'Iridium NEXT constellation', segment: 'ground' },
  VSAT: { product: 'Viasat satcom network', segment: 'ground' },
  GSAT: { product: 'Globalstar MSS', segment: 'downstream' },
  PL: { product: 'Planet EO constellation', segment: 'downstream' },
  BKSY: { product: 'BlackSky EO constellation', segment: 'downstream' },
  SPIR: { product: 'Spire LEMUR / weather satellites', segment: 'downstream' },
  MNTS: { product: 'Momentus Vigoride orbital transfer', segment: 'isam' },
  RDW: { product: 'Redwire ISAM & space components', segment: 'isam' },
};

export function getSupplierById(id) {
  return SUPPLIERS.find((s) => s.id === id);
}

export { SUB };
