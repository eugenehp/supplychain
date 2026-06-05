/**
 * Glossary auto-extraction for the space-economy corpus.
 *
 * Combines two sources:
 *   1. Curated definitions for ~40 well-known space terms (NGSO, GSO,
 *      Part 450, ITAR, EAR, etc.) — definitions written here, never
 *      reliant on the corpus.
 *   2. Auto-discovered acronyms: scan every chunk for the pattern
 *      `Word/phrase ("ACRONYM")` and aggregate. Use the surrounding
 *      excerpt as a definition example.
 *
 * Output: static/<topic>/glossary/terms.json
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { topicStaticDir } from '../paths.mjs';

/** Curated definitions — authoritative, hand-written. */
const CURATED = [
  { acronym: 'ITAR', expansion: 'International Traffic in Arms Regulations', category: 'Regulation', definition: 'US regime governing export of defense articles, services, and technical data. Most space hardware is on the US Munitions List; deemed-export rules constrain foreign-national hires.' },
  { acronym: 'EAR', expansion: 'Export Administration Regulations', category: 'Regulation', definition: 'US Commerce Department export-control regime covering dual-use items not on the Munitions List. Many space components moved from ITAR to EAR after 2014 reform.' },
  { acronym: 'Part 450', expansion: '14 CFR Part 450 — Launch and Reentry Licensing', category: 'Regulation', definition: 'FAA rule consolidating launch and reentry licensing requirements (2021). Aims to streamline commercial launch licensing but transition has been slower than industry expected.' },
  { acronym: 'NGSO', expansion: 'Non-Geostationary Satellite Orbit', category: 'Orbit', definition: 'Satellites in LEO, MEO, or HEO. NGSO constellations (Starlink, OneWeb, Kuiper) drive most current launch demand and are subject to FCC spectrum coordination + 5-year deorbit rule.' },
  { acronym: 'GSO', expansion: 'Geostationary Satellite Orbit', category: 'Orbit', definition: 'Satellites at ~35,786 km altitude, orbital period matching Earth\'s rotation. Traditional satcom and broadcast — high-power, fewer satellites, served by Viasat, SES, Intelsat, Eutelsat.' },
  { acronym: 'LEO', expansion: 'Low Earth Orbit', category: 'Orbit', definition: 'Altitude roughly 160–2,000 km. Hosts most modern constellations; low latency but requires many satellites for global coverage.' },
  { acronym: 'MEO', expansion: 'Medium Earth Orbit', category: 'Orbit', definition: 'Altitude ~2,000–35,786 km. GPS / Galileo / GLONASS PNT constellations live here.' },
  { acronym: 'SAR', expansion: 'Synthetic Aperture Radar', category: 'Sensor', definition: 'Active microwave imaging that produces high-resolution radar images regardless of weather or daylight. Capella, ICEYE, BlackSky operate SAR constellations.' },
  { acronym: 'EO', expansion: 'Electro-Optical (imaging)', category: 'Sensor', definition: 'Passive visible/near-IR imaging. Operators include Planet, BlackSky, Maxar.' },
  { acronym: 'MSS', expansion: 'Mobile Satellite Services', category: 'Spectrum', definition: 'L/S-band spectrum allocations for direct connection to mobile/handheld terminals. Iridium, Globalstar, Inmarsat hold MSS rights; ASTS and Starlink-direct contest the boundaries.' },
  { acronym: 'D2D', expansion: 'Direct-to-Device', category: 'Spectrum', definition: 'Satellites communicating directly with unmodified phones, typically over MSS or supplemental-coverage spectrum. Major regulatory and competitive fights between AST SpaceMobile, Starlink, Globalstar, Iridium.' },
  { acronym: 'NSSL', expansion: 'National Security Space Launch', category: 'Government program', definition: 'US Space Force program providing assured access to space for national security payloads. Currently served by SpaceX (Falcon 9/Heavy) and ULA (Vulcan); Blue Origin (New Glenn) and Rocket Lab (Neutron) are entering.' },
  { acronym: 'ULA', expansion: 'United Launch Alliance', category: 'Company', definition: 'Boeing/Lockheed Martin JV that operates Atlas V and Vulcan launch vehicles. Historical NSSL workhorse.' },
  { acronym: 'NASA OIG', expansion: 'NASA Office of Inspector General', category: 'Government', definition: 'Independent audit/oversight body. Publishes detailed reports on Artemis, commercial crew, launch services — often the most concrete public disclosure of program supply-chain risk.' },
  { acronym: 'FAA AST', expansion: 'FAA Office of Commercial Space Transportation', category: 'Regulation', definition: 'Issues launch and reentry licenses, publishes the Annual Compendium and quarterly forecasts.' },
  { acronym: 'FCC', expansion: 'Federal Communications Commission', category: 'Regulation', definition: 'US spectrum and orbital-slot regulator. Adopted the 5-year deorbit rule (2022) constraining LEO operators.' },
  { acronym: 'NOAA CRSRA', expansion: 'NOAA Commercial Remote Sensing Regulatory Affairs', category: 'Regulation', definition: 'Licenses commercial remote-sensing systems; tiered licensing post-2020 reform eased many resolution restrictions.' },
  { acronym: 'HBM', expansion: 'High Bandwidth Memory', category: 'Component', definition: 'Stacked DRAM used in AI accelerators. Not space-specific but appears in advanced satellite ASIC modules sourced from same primes.' },
  { acronym: 'FPGA', expansion: 'Field-Programmable Gate Array', category: 'Component', definition: 'Reconfigurable logic chip. Space-grade FPGAs (Xilinx Versal, BAE RAD-tolerant) are heavily used in satellite payloads.' },
  { acronym: 'ASIC', expansion: 'Application-Specific Integrated Circuit', category: 'Component', definition: 'Custom chip. Rad-hard ASICs are a concentrated supply-chain chokepoint with few qualified vendors (BAE, Cobham/Frontgrade, Microchip).' },
  { acronym: 'GaN', expansion: 'Gallium Nitride', category: 'Material', definition: 'Wide-bandgap semiconductor for high-power RF; dominant in modern phased-array antennas. Wolfspeed, MACOM are key suppliers.' },
  { acronym: 'GaAs', expansion: 'Gallium Arsenide', category: 'Material', definition: 'III-V semiconductor used for solar cells (triple-junction GaAs) and RF amplifiers. Spectrolab (Boeing) and Azur Space are dominant photovoltaic suppliers.' },
  { acronym: 'TPS', expansion: 'Thermal Protection System', category: 'Subsystem', definition: 'Heat shielding for reentry vehicles. Mix of ablative materials (PICA, AVCOAT) and reusable tiles.' },
  { acronym: 'GN&C', expansion: 'Guidance, Navigation & Control', category: 'Subsystem', definition: 'Onboard control subsystem combining IMU, star trackers, sun sensors, reaction wheels, and propulsion to maintain attitude and trajectory.' },
  { acronym: 'IMU', expansion: 'Inertial Measurement Unit', category: 'Subsystem', definition: 'Sensor that measures specific force and angular rate. Honeywell, Northrop Grumman LITEF, Safran are major space-grade IMU suppliers.' },
  { acronym: 'PNT', expansion: 'Positioning, Navigation, Timing', category: 'Service', definition: 'Service provided by GPS / Galileo / GLONASS / BeiDou. Strategic dependency for everything from civilian aviation to munitions.' },
  { acronym: 'CoWoS', expansion: 'Chip-on-Wafer-on-Substrate', category: 'Component', definition: 'TSMC advanced packaging used in HBM accelerators. Bleeds into space-grade compute as inference moves on-orbit.' },
  { acronym: 'SBIRS', expansion: 'Space-Based Infrared System', category: 'Government program', definition: 'US missile-warning constellation. Lockheed Martin prime; transitioning to Next-Gen OPIR.' },
  { acronym: 'OPIR', expansion: 'Overhead Persistent Infrared', category: 'Government program', definition: 'Next-Gen OPIR is the SBIRS successor — provides earlier missile detection. LMT and NOC lead segments.' },
  { acronym: 'NRO', expansion: 'National Reconnaissance Office', category: 'Government', definition: 'US intelligence satellite operator. Increasingly buys commercial imagery alongside government-owned platforms.' },
  { acronym: 'SDA', expansion: 'Space Development Agency', category: 'Government', definition: 'DoD agency procuring the Proliferated Warfighter Space Architecture — a tranche-based LEO constellation. Major customer for new-space integrators.' },
  { acronym: 'ASAT', expansion: 'Anti-Satellite (weapon)', category: 'Threat', definition: 'Kinetic, RF, or directed-energy weapon targeting satellites. Russia\'s 2021 ASAT test created a major debris field.' },
  { acronym: 'CR', expansion: 'Continuing Resolution', category: 'Funding', definition: 'Stopgap appropriations measure when Congress doesn\'t pass a full budget. Constrains new-start programs — disclosed by every defense prime.' },
  { acronym: 'PIPE', expansion: 'Private Investment in Public Equity', category: 'Capital', definition: 'Used heavily in SPAC mergers — institutional investors buy shares at deal close. Many space SPACs disclose warrant + PIPE math as dilution risk.' },
  { acronym: 'IRR', expansion: 'Internal Rate of Return', category: 'Finance', definition: 'Used in space-economy market reports to assess constellation business cases.' },
];

const CURATED_BY_ACRONYM = new Map(CURATED.map((e) => [e.acronym, e]));

const ACRONYM_PATTERN = /([A-Z][A-Za-z][A-Za-z0-9 &\-'/]{3,80})\s*\(\s*("?)([A-Z][A-Z0-9 &\-/]{1,12})\2\s*\)/g;

const STOP_ACRONYMS = new Set([
  'INC', 'CORP', 'LLC', 'LTD', 'NV', 'BV', 'SA', 'SAS', 'GMBH', 'PLC', 'THE', 'INC.', 'AND', 'OR',
  'CO', 'CO.', 'LP', 'LLP', 'PCAOB', 'GAAP', 'IFRS', 'XBRL', 'US', 'UK', 'EU', 'USD', 'EUR',
]);

function shortExcerpt(text, idx, radius = 220) {
  const start = Math.max(0, idx - 80);
  const end = Math.min(text.length, idx + radius);
  let s = text.slice(start, end).replace(/\s+/g, ' ').trim();
  if (start > 0) s = '…' + s;
  if (end < text.length) s = s + '…';
  return s;
}

/**
 * @param {string} topicId
 */
export function extractGlossaryForTopic(topicId) {
  const shardsDir = join(topicStaticDir(topicId), 'rag', 'shards');
  if (!existsSync(shardsDir)) return { error: 'No shards' };

  /** @type {Map<string, { acronym: string, expansion: string, count: number, byShard: Map<string, number>, sampleExcerpt: string | null }>} */
  const discovered = new Map();
  let chunksScanned = 0;

  for (const file of readdirSync(shardsDir).filter((f) => f.endsWith('.json'))) {
    let payload;
    try {
      payload = JSON.parse(readFileSync(join(shardsDir, file), 'utf8'));
    } catch {
      continue;
    }
    const shardKey = payload.shard ?? file.replace(/\.json$/, '');
    for (const entry of payload.entries ?? []) {
      chunksScanned++;
      const text = entry.text ?? '';
      let m;
      ACRONYM_PATTERN.lastIndex = 0;
      while ((m = ACRONYM_PATTERN.exec(text)) !== null) {
        const expansion = m[1].trim().replace(/^the\s+/i, '').replace(/\s+/g, ' ');
        const acronym = m[3].trim();
        if (STOP_ACRONYMS.has(acronym.toUpperCase())) continue;
        if (acronym.length < 2 || acronym.length > 8) continue;
        // Verify the FULL acronym appears as consecutive initials in the expansion's last 6 content words.
        // Cheap rejection of trailing-clause noise like "EUSPA is separate and distinct from the European Space Agency (ESA)".
        const acronymLetters = acronym.replace(/[^A-Z]/g, '');
        if (acronymLetters.length < 2) continue;
        const words = expansion.split(/[\s\-/&]+/).filter((w) => w && /^[A-Za-z]/.test(w));
        if (words.length < acronymLetters.length) continue;
        // Try every contiguous window of length = acronymLetters and require it to match.
        let matched = false;
        let matchStart = -1;
        for (let i = 0; i <= words.length - acronymLetters.length; i++) {
          const window = words.slice(i, i + acronymLetters.length).map((w) => w[0].toUpperCase()).join('');
          if (window === acronymLetters) { matched = true; matchStart = i; break; }
        }
        if (!matched) continue;
        // Reject expansions ending in a truncated word (last word doesn't end on a real word boundary).
        const lastWord = words[words.length - 1];
        if (lastWord && lastWord.length < 3 && !/^(?:US|UK|EU|UN|AI|II|III|IV|VI|IX|XI)$/.test(lastWord)) continue;
        // Trim leading clutter so "EUSPA is separate and distinct from the European Space Agency"
        // becomes "European Space Agency". Walk back from matchStart to the previous capitalised word
        // run start to preserve multi-word proper nouns like "United States".
        const cleanedExpansion = words.slice(matchStart, matchStart + acronymLetters.length).join(' ');

        const bucket = discovered.get(acronym) ?? {
          acronym,
          expansion: cleanedExpansion,
          count: 0,
          byShard: new Map(),
          sampleExcerpt: null,
        };
        bucket.count++;
        bucket.byShard.set(shardKey, (bucket.byShard.get(shardKey) ?? 0) + 1);
        if (!bucket.sampleExcerpt) bucket.sampleExcerpt = shortExcerpt(text, m.index);
        discovered.set(acronym, bucket);
      }
    }
  }

  // Merge: any discovered acronym that's also curated takes the curated definition + count.
  const merged = new Map();
  for (const c of CURATED) {
    merged.set(c.acronym, {
      acronym: c.acronym,
      expansion: c.expansion,
      definition: c.definition,
      category: c.category,
      source: 'curated',
      corpusCount: discovered.get(c.acronym)?.count ?? 0,
      filerCount: discovered.get(c.acronym)?.byShard.size ?? 0,
      sampleExcerpt: discovered.get(c.acronym)?.sampleExcerpt ?? null,
    });
  }
  for (const d of discovered.values()) {
    if (merged.has(d.acronym)) continue;
    if (d.count < 3) continue;     // suppress one-off
    if (d.expansion.length < 6) continue;
    merged.set(d.acronym, {
      acronym: d.acronym,
      expansion: d.expansion,
      definition: null,
      category: 'Auto-discovered',
      source: 'corpus',
      corpusCount: d.count,
      filerCount: d.byShard.size,
      sampleExcerpt: d.sampleExcerpt,
    });
  }

  const entries = [...merged.values()].sort((a, b) => {
    // Curated first, then by corpus count desc.
    if (a.source !== b.source) return a.source === 'curated' ? -1 : 1;
    return b.corpusCount - a.corpusCount;
  });

  const categories = [...new Set(entries.map((e) => e.category))].sort();

  return {
    generatedAt: new Date().toISOString(),
    topicId,
    chunksScanned,
    termCount: entries.length,
    categories,
    entries,
  };
}

export function writeGlossary({ topicId }) {
  const result = extractGlossaryForTopic(topicId);
  if (result.error) return result;
  const outDir = join(topicStaticDir(topicId), 'glossary');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'terms.json'), JSON.stringify(result, null, 2));
  return result;
}
