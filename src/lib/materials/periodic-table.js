/**
 * Full Mendeleev periodic table (Z 1–118) with standard grid placement.
 * SEC-enriched profiles are merged from the rare-earth pipeline index by symbol.
 */

import { ELEMENT_NOTES } from '@materials/element-notes-data.mjs';

/** @typedef {'alkali'|'alkaline'|'transition'|'post-transition'|'metalloid'|'nonmetal'|'halogen'|'noble'|'lanthanide'|'actinide'|'synthetic'} ElementCategory */

/** @param {number} z @param {string} symbol @param {string} name @param {number} period @param {number} group @param {ElementCategory} category */
function el(z, symbol, name, period, group, category) {
  return { atomicNumber: z, symbol, name, period, group, category };
}

/** @type {ReturnType<typeof el>[]} */
export const PERIODIC_ELEMENTS = [
  el(1, 'H', 'Hydrogen', 1, 1, 'nonmetal'),
  el(2, 'He', 'Helium', 1, 18, 'noble'),
  el(3, 'Li', 'Lithium', 2, 1, 'alkali'),
  el(4, 'Be', 'Beryllium', 2, 2, 'alkaline'),
  el(5, 'B', 'Boron', 2, 13, 'metalloid'),
  el(6, 'C', 'Carbon', 2, 14, 'nonmetal'),
  el(7, 'N', 'Nitrogen', 2, 15, 'nonmetal'),
  el(8, 'O', 'Oxygen', 2, 16, 'nonmetal'),
  el(9, 'F', 'Fluorine', 2, 17, 'halogen'),
  el(10, 'Ne', 'Neon', 2, 18, 'noble'),
  el(11, 'Na', 'Sodium', 3, 1, 'alkali'),
  el(12, 'Mg', 'Magnesium', 3, 2, 'alkaline'),
  el(13, 'Al', 'Aluminium', 3, 13, 'post-transition'),
  el(14, 'Si', 'Silicon', 3, 14, 'metalloid'),
  el(15, 'P', 'Phosphorus', 3, 15, 'nonmetal'),
  el(16, 'S', 'Sulfur', 3, 16, 'nonmetal'),
  el(17, 'Cl', 'Chlorine', 3, 17, 'halogen'),
  el(18, 'Ar', 'Argon', 3, 18, 'noble'),
  el(19, 'K', 'Potassium', 4, 1, 'alkali'),
  el(20, 'Ca', 'Calcium', 4, 2, 'alkaline'),
  el(21, 'Sc', 'Scandium', 4, 3, 'transition'),
  el(22, 'Ti', 'Titanium', 4, 4, 'transition'),
  el(23, 'V', 'Vanadium', 4, 5, 'transition'),
  el(24, 'Cr', 'Chromium', 4, 6, 'transition'),
  el(25, 'Mn', 'Manganese', 4, 7, 'transition'),
  el(26, 'Fe', 'Iron', 4, 8, 'transition'),
  el(27, 'Co', 'Cobalt', 4, 9, 'transition'),
  el(28, 'Ni', 'Nickel', 4, 10, 'transition'),
  el(29, 'Cu', 'Copper', 4, 11, 'transition'),
  el(30, 'Zn', 'Zinc', 4, 12, 'transition'),
  el(31, 'Ga', 'Gallium', 4, 13, 'post-transition'),
  el(32, 'Ge', 'Germanium', 4, 14, 'metalloid'),
  el(33, 'As', 'Arsenic', 4, 15, 'metalloid'),
  el(34, 'Se', 'Selenium', 4, 16, 'nonmetal'),
  el(35, 'Br', 'Bromine', 4, 17, 'halogen'),
  el(36, 'Kr', 'Krypton', 4, 18, 'noble'),
  el(37, 'Rb', 'Rubidium', 5, 1, 'alkali'),
  el(38, 'Sr', 'Strontium', 5, 2, 'alkaline'),
  el(39, 'Y', 'Yttrium', 5, 3, 'transition'),
  el(40, 'Zr', 'Zirconium', 5, 4, 'transition'),
  el(41, 'Nb', 'Niobium', 5, 5, 'transition'),
  el(42, 'Mo', 'Molybdenum', 5, 6, 'transition'),
  el(43, 'Tc', 'Technetium', 5, 7, 'transition'),
  el(44, 'Ru', 'Ruthenium', 5, 8, 'transition'),
  el(45, 'Rh', 'Rhodium', 5, 9, 'transition'),
  el(46, 'Pd', 'Palladium', 5, 10, 'transition'),
  el(47, 'Ag', 'Silver', 5, 11, 'transition'),
  el(48, 'Cd', 'Cadmium', 5, 12, 'transition'),
  el(49, 'In', 'Indium', 5, 13, 'post-transition'),
  el(50, 'Sn', 'Tin', 5, 14, 'post-transition'),
  el(51, 'Sb', 'Antimony', 5, 15, 'metalloid'),
  el(52, 'Te', 'Tellurium', 5, 16, 'metalloid'),
  el(53, 'I', 'Iodine', 5, 17, 'halogen'),
  el(54, 'Xe', 'Xenon', 5, 18, 'noble'),
  el(55, 'Cs', 'Caesium', 6, 1, 'alkali'),
  el(56, 'Ba', 'Barium', 6, 2, 'alkaline'),
  el(57, 'La', 'Lanthanum', 6, 3, 'lanthanide'),
  el(72, 'Hf', 'Hafnium', 6, 4, 'transition'),
  el(73, 'Ta', 'Tantalum', 6, 5, 'transition'),
  el(74, 'W', 'Tungsten', 6, 6, 'transition'),
  el(75, 'Re', 'Rhenium', 6, 7, 'transition'),
  el(76, 'Os', 'Osmium', 6, 8, 'transition'),
  el(77, 'Ir', 'Iridium', 6, 9, 'transition'),
  el(78, 'Pt', 'Platinum', 6, 10, 'transition'),
  el(79, 'Au', 'Gold', 6, 11, 'transition'),
  el(80, 'Hg', 'Mercury', 6, 12, 'transition'),
  el(81, 'Tl', 'Thallium', 6, 13, 'post-transition'),
  el(82, 'Pb', 'Lead', 6, 14, 'post-transition'),
  el(83, 'Bi', 'Bismuth', 6, 15, 'post-transition'),
  el(84, 'Po', 'Polonium', 6, 16, 'metalloid'),
  el(85, 'At', 'Astatine', 6, 17, 'halogen'),
  el(86, 'Rn', 'Radon', 6, 18, 'noble'),
  el(87, 'Fr', 'Francium', 7, 1, 'alkali'),
  el(88, 'Ra', 'Radium', 7, 2, 'alkaline'),
  el(89, 'Ac', 'Actinium', 7, 3, 'actinide'),
  el(104, 'Rf', 'Rutherfordium', 7, 4, 'synthetic'),
  el(105, 'Db', 'Dubnium', 7, 5, 'synthetic'),
  el(106, 'Sg', 'Seaborgium', 7, 6, 'synthetic'),
  el(107, 'Bh', 'Bohrium', 7, 7, 'synthetic'),
  el(108, 'Hs', 'Hassium', 7, 8, 'synthetic'),
  el(109, 'Mt', 'Meitnerium', 7, 9, 'synthetic'),
  el(110, 'Ds', 'Darmstadtium', 7, 10, 'synthetic'),
  el(111, 'Rg', 'Roentgenium', 7, 11, 'synthetic'),
  el(112, 'Cn', 'Copernicium', 7, 12, 'synthetic'),
  el(113, 'Nh', 'Nihonium', 7, 13, 'synthetic'),
  el(114, 'Fl', 'Flerovium', 7, 14, 'synthetic'),
  el(115, 'Mc', 'Moscovium', 7, 15, 'synthetic'),
  el(116, 'Lv', 'Livermorium', 7, 16, 'synthetic'),
  el(117, 'Ts', 'Tennessine', 7, 17, 'synthetic'),
  el(118, 'Og', 'Oganesson', 7, 18, 'synthetic'),
  // Lanthanides (f-block) — Ce–Lu also listed here for the dedicated row
  el(58, 'Ce', 'Cerium', 6, 3, 'lanthanide'),
  el(59, 'Pr', 'Praseodymium', 6, 3, 'lanthanide'),
  el(60, 'Nd', 'Neodymium', 6, 3, 'lanthanide'),
  el(61, 'Pm', 'Promethium', 6, 3, 'lanthanide'),
  el(62, 'Sm', 'Samarium', 6, 3, 'lanthanide'),
  el(63, 'Eu', 'Europium', 6, 3, 'lanthanide'),
  el(64, 'Gd', 'Gadolinium', 6, 3, 'lanthanide'),
  el(65, 'Tb', 'Terbium', 6, 3, 'lanthanide'),
  el(66, 'Dy', 'Dysprosium', 6, 3, 'lanthanide'),
  el(67, 'Ho', 'Holmium', 6, 3, 'lanthanide'),
  el(68, 'Er', 'Erbium', 6, 3, 'lanthanide'),
  el(69, 'Tm', 'Thulium', 6, 3, 'lanthanide'),
  el(70, 'Yb', 'Ytterbium', 6, 3, 'lanthanide'),
  el(71, 'Lu', 'Lutetium', 6, 3, 'lanthanide'),
  // Actinides (f-block)
  el(90, 'Th', 'Thorium', 7, 3, 'actinide'),
  el(91, 'Pa', 'Protactinium', 7, 3, 'actinide'),
  el(92, 'U', 'Uranium', 7, 3, 'actinide'),
  el(93, 'Np', 'Neptunium', 7, 3, 'actinide'),
  el(94, 'Pu', 'Plutonium', 7, 3, 'actinide'),
  el(95, 'Am', 'Americium', 7, 3, 'actinide'),
  el(96, 'Cm', 'Curium', 7, 3, 'actinide'),
  el(97, 'Bk', 'Berkelium', 7, 3, 'actinide'),
  el(98, 'Cf', 'Californium', 7, 3, 'actinide'),
  el(99, 'Es', 'Einsteinium', 7, 3, 'actinide'),
  el(100, 'Fm', 'Fermium', 7, 3, 'actinide'),
  el(101, 'Md', 'Mendelevium', 7, 3, 'actinide'),
  el(102, 'No', 'Nobelium', 7, 3, 'actinide'),
  el(103, 'Lr', 'Lawrencium', 7, 3, 'actinide'),
];

/** REE pipeline categories override lanthanide coloring for Sc/Y/La–Lu */
const REE_SYMBOLS = new Set([
  'Sc', 'Y', 'La', 'Ce', 'Pr', 'Nd', 'Pm', 'Sm', 'Eu', 'Gd', 'Tb', 'Dy', 'Ho', 'Er', 'Tm', 'Yb', 'Lu',
]);

/** @param {ReturnType<typeof el>} element */
export function isRareEarthElement(element) {
  return REE_SYMBOLS.has(element.symbol);
}

/**
 * Standard Mendeleev grid cell (1-indexed row/col, 18 columns, 9 rows).
 * @param {ReturnType<typeof el>} element
 */
export function mendeleevGridPos(element) {
  const { atomicNumber: z, period, group } = element;

  if (z === 1) return { row: 1, col: 1, fBlock: false };
  if (z === 2) return { row: 1, col: 18, fBlock: false };

  if (z >= 58 && z <= 71) return { row: 8, col: z - 58 + 3, fBlock: true };
  if (z >= 90 && z <= 103) return { row: 9, col: z - 90 + 3, fBlock: true };

  if (z === 57) return { row: 6, col: 3, fBlock: false };
  if (z === 89) return { row: 7, col: 3, fBlock: false };

  if (period >= 2 && period <= 3 && group >= 13) return { row: period, col: group, fBlock: false };
  if (period >= 2 && period <= 3 && group <= 2) return { row: period, col: group, fBlock: false };

  if (period >= 4 && period <= 7 && group >= 1 && group <= 18) {
    if (z >= 104) return { row: 7, col: group, fBlock: false };
    if (period === 6 && group === 3 && z !== 57) return null;
    if (period === 7 && group === 3 && z !== 89 && z < 104) return null;
    return { row: period, col: group, fBlock: false };
  }

  return null;
}

/** @param {object[]} secElements — from rare-earth index */
export function mergePeriodicWithSec(secElements = []) {
  const secBySymbol = new Map(secElements.map((e) => [e.symbol, e]));

  const seen = new Set();
  const cells = [];

  for (const base of PERIODIC_ELEMENTS) {
    if (seen.has(base.symbol)) continue;
    seen.add(base.symbol);

    const pos = mendeleevGridPos(base);
    if (!pos) continue;

    const sec = secBySymbol.get(base.symbol);
    const reeCategory = sec?.category;

    const notes = ELEMENT_NOTES[base.symbol];
    cells.push({
      ...base,
      gridRow: pos.row,
      gridCol: pos.col,
      fBlock: pos.fBlock,
      mentionCount: sec?.mentionCount ?? 0,
      hasSecProfile: Boolean(sec),
      categoryLabel: sec?.categoryLabel ?? categoryLabel(base.category),
      uses: sec?.uses ?? notes?.uses ?? criticalUses(base.symbol),
      industries: sec?.industries ?? notes?.industries ?? [],
      usesDetail: sec?.usesDetail ?? notes?.usesDetail ?? null,
      importance: sec?.importance ?? notes?.importance ?? null,
      miners: sec?.miners ?? [],
      aggregated: sec?.aggregated ?? null,
      reeCategory: reeCategory ?? null,
    });
  }

  return cells.sort((a, b) => a.atomicNumber - b.atomicNumber);
}

/** @param {ElementCategory} cat */
function categoryLabel(cat) {
  const labels = {
    alkali: 'Alkali metal',
    alkaline: 'Alkaline earth',
    transition: 'Transition metal',
    'post-transition': 'Post-transition metal',
    metalloid: 'Metalloid',
    nonmetal: 'Reactive nonmetal',
    halogen: 'Halogen',
    noble: 'Noble gas',
    lanthanide: 'Lanthanide',
    actinide: 'Actinide',
    synthetic: 'Synthetic',
  };
  return labels[cat] ?? cat;
}

/** Semiconductor / extractive relevance (static until broader SEC index). */
const CRITICAL_USES = {
  Cu: ['interconnects', 'packaging', 'PCB'],
  Au: ['bond wire', 'contacts'],
  Ag: ['contacts', 'paste'],
  Si: ['wafers', 'dies'],
  Ge: ['SiGe', 'IR optics'],
  Ga: ['GaAs', 'GaN RF'],
  As: ['III-V semiconductors'],
  In: ['solder', 'ITO', 'InP'],
  Sn: ['solder', 'barrier'],
  Ta: ['capacitors', 'barrier'],
  W: ['contacts', 'vias', 'EUV'],
  Co: ['magnetic media', 'contacts'],
  Ni: ['barrier', 'underbump'],
  Ti: ['barrier', 'nitride'],
  Al: ['metallization', 'interconnects'],
  Li: ['batteries'],
  B: ['doping', 'BN'],
  P: ['doping'],
  Sb: ['doping'],
  Hf: ['high-k gate'],
  Ru: ['electrodes'],
  Re: ['contacts'],
  Mo: ['barrier', 'mask'],
  Cr: ['adhesion'],
  Zn: ['galvanization'],
};

/** @param {string} symbol */
function criticalUses(symbol) {
  return CRITICAL_USES[symbol] ?? [];
}

export const PERIODIC_CATEGORY_COLORS = {
  alkali: '#f87171',
  alkaline: '#fb923c',
  transition: '#60a5fa',
  'post-transition': '#94a3b8',
  metalloid: '#2dd4bf',
  nonmetal: '#a3e635',
  halogen: '#facc15',
  noble: '#c084fc',
  lanthanide: '#4ade80',
  actinide: '#f472b6',
  synthetic: '#64748b',
  light: '#4ade80',
  middle: '#38bdf8',
  heavy: '#a78bfa',
  scandium: '#fbbf24',
};
