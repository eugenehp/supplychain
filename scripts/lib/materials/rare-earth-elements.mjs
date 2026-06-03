/**
 * Rare earth elements (REE) — 15 lanthanides + scandium + yttrium.
 * Used for Mendeleev-style table layout and SEC mention extraction.
 */

import { ELEMENT_NOTES } from './element-notes-data.mjs';

/** @typedef {'light' | 'middle' | 'heavy' | 'scandium'} ReeCategory */

const BASE_ELEMENTS = [
  { symbol: 'Sc', name: 'Scandium', atomicNumber: 21, period: 4, group: 3, category: 'scandium', mendeleevRow: 0, mendeleevCol: 0, aliases: ['scandium'] },
  { symbol: 'Y', name: 'Yttrium', atomicNumber: 39, period: 5, group: 3, category: 'heavy', mendeleevRow: 1, mendeleevCol: 0, aliases: ['yttrium'] },
  { symbol: 'La', name: 'Lanthanum', atomicNumber: 57, period: 6, group: null, category: 'light', mendeleevRow: 2, mendeleevCol: 0, aliases: ['lanthanum'] },
  { symbol: 'Ce', name: 'Cerium', atomicNumber: 58, period: 6, group: null, category: 'light', mendeleevRow: 2, mendeleevCol: 1, aliases: ['cerium'] },
  { symbol: 'Pr', name: 'Praseodymium', atomicNumber: 59, period: 6, group: null, category: 'light', mendeleevRow: 2, mendeleevCol: 2, aliases: ['praseodymium'] },
  { symbol: 'Nd', name: 'Neodymium', atomicNumber: 60, period: 6, group: null, category: 'light', mendeleevRow: 2, mendeleevCol: 3, aliases: ['neodymium', 'NdFeB', 'NdPr'] },
  { symbol: 'Pm', name: 'Promethium', atomicNumber: 61, period: 6, group: null, category: 'light', mendeleevRow: 2, mendeleevCol: 4, aliases: ['promethium'] },
  { symbol: 'Sm', name: 'Samarium', atomicNumber: 62, period: 6, group: null, category: 'light', mendeleevRow: 2, mendeleevCol: 5, aliases: ['samarium', 'SmCo'] },
  { symbol: 'Eu', name: 'Europium', atomicNumber: 63, period: 6, group: null, category: 'middle', mendeleevRow: 2, mendeleevCol: 6, aliases: ['europium'] },
  { symbol: 'Gd', name: 'Gadolinium', atomicNumber: 64, period: 6, group: null, category: 'middle', mendeleevRow: 2, mendeleevCol: 7, aliases: ['gadolinium'] },
  { symbol: 'Tb', name: 'Terbium', atomicNumber: 65, period: 6, group: null, category: 'heavy', mendeleevRow: 2, mendeleevCol: 8, aliases: ['terbium'] },
  { symbol: 'Dy', name: 'Dysprosium', atomicNumber: 66, period: 6, group: null, category: 'heavy', mendeleevRow: 2, mendeleevCol: 9, aliases: ['dysprosium'] },
  { symbol: 'Ho', name: 'Holmium', atomicNumber: 67, period: 6, group: null, category: 'heavy', mendeleevRow: 2, mendeleevCol: 10, aliases: ['holmium'] },
  { symbol: 'Er', name: 'Erbium', atomicNumber: 68, period: 6, group: null, category: 'heavy', mendeleevRow: 2, mendeleevCol: 11, aliases: ['erbium'] },
  { symbol: 'Tm', name: 'Thulium', atomicNumber: 69, period: 6, group: null, category: 'heavy', mendeleevRow: 2, mendeleevCol: 12, aliases: ['thulium'] },
  { symbol: 'Yb', name: 'Ytterbium', atomicNumber: 70, period: 6, group: null, category: 'heavy', mendeleevRow: 2, mendeleevCol: 13, aliases: ['ytterbium'] },
  { symbol: 'Lu', name: 'Lutetium', atomicNumber: 71, period: 6, group: null, category: 'heavy', mendeleevRow: 2, mendeleevCol: 14, aliases: ['lutetium'] },
];

export const RARE_EARTH_ELEMENTS = BASE_ELEMENTS.map((el) => ({
  ...el,
  ...ELEMENT_NOTES[el.symbol],
}));

export const ELEMENT_BY_SYMBOL = Object.fromEntries(RARE_EARTH_ELEMENTS.map((e) => [e.symbol, e]));

export const CATEGORY_LABELS = {
  light: 'Light REE',
  middle: 'Middle REE',
  heavy: 'Heavy REE',
  scandium: 'Scandium',
};
