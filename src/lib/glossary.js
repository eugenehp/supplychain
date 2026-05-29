/** Abbreviations used across filings, Sankey tiers, and search */

export const GLOSSARY_GROUPS = [
  {
    title: 'Memory & packaging',
    items: [
      {
        abbr: 'HBM',
        name: 'High Bandwidth Memory',
        definition: 'Stacked DRAM placed right next to the GPU die for very fast data access. On H200-class chips, memory can cost nearly as much as the compute die.',
      },
      {
        abbr: 'HBM3e',
        name: 'High Bandwidth Memory 3 extended',
        definition: 'The latest HBM generation used on NVIDIA H200 — higher speed and capacity than HBM3.',
      },
      {
        abbr: 'CoWoS',
        name: 'Chip on Wafer on Substrate',
        definition: 'TSMC’s advanced packaging that places the GPU die and HBM stacks on a silicon interposer, then mounts everything on a package substrate.',
      },
      {
        abbr: 'DRAM',
        name: 'Dynamic Random Access Memory',
        definition: 'Standard volatile memory used in PCs and servers. HBM is a specialized, stacked form of DRAM.',
      },
      {
        abbr: 'NAND',
        name: 'NAND flash',
        definition: 'Non-volatile storage memory (SSDs, phones). Different from the DRAM/HBM used on AI accelerators.',
      },
    ],
  },
  {
    title: 'Manufacturing',
    items: [
      {
        abbr: 'TSMC',
        name: 'Taiwan Semiconductor Manufacturing Company',
        definition: 'The world’s largest contract chip foundry. NVIDIA’s GPU dies are fabricated at TSMC.',
      },
      {
        abbr: 'Foundry',
        name: 'Contract chip factory',
        definition: 'A company that manufactures chips designed by others (fabless firms like NVIDIA). TSMC is the primary foundry in this map.',
      },
      {
        abbr: 'Fab',
        name: 'Fabrication plant',
        definition: 'A clean-room factory where silicon wafers are processed into finished chips.',
      },
      {
        abbr: 'OSAT',
        name: 'Outsourced Assembly, Test & Packaging',
        definition: 'Companies that assemble finished chips, test them, and pack them for shipment (e.g. Foxconn, Wistron).',
      },
      {
        abbr: 'EUV',
        name: 'Extreme Ultraviolet lithography',
        definition: 'Cutting-edge light used to print the smallest chip features. ASML is the sole commercial EUV tool supplier.',
      },
      {
        abbr: 'EDA',
        name: 'Electronic Design Automation',
        definition: 'Software used to design and verify chips before manufacturing (Synopsys, Cadence).',
      },
      {
        abbr: 'IP',
        name: 'Semiconductor intellectual property',
        definition: 'Reusable design blocks (CPU cores, interfaces) licensed into a chip design.',
      },
    ],
  },
  {
    title: 'Materials & wafer types',
    items: [
      {
        abbr: 'GaN',
        name: 'Gallium Nitride',
        definition: 'A wide-bandgap semiconductor used for power electronics and some specialized wafers — not the silicon used for most GPU logic.',
      },
      {
        abbr: 'SiC',
        name: 'Silicon Carbide',
        definition: 'Another wide-bandgap material for high-power and high-temperature applications.',
      },
      {
        abbr: 'SOI',
        name: 'Silicon on Insulator',
        definition: 'A wafer structure with a thin silicon layer on an insulating base, used for certain RF and low-power chips.',
      },
      {
        abbr: 'epi',
        name: 'Epitaxial silicon',
        definition: 'A high-quality crystal layer grown on top of a silicon wafer for advanced device structures.',
      },
      {
        abbr: 'MEMS',
        name: 'Micro-Electro-Mechanical Systems',
        definition: 'Tiny mechanical sensors and actuators built on silicon (accelerometers, microphones).',
      },
    ],
  },
  {
    title: 'Products & reports',
    items: [
      {
        abbr: 'GPU',
        name: 'Graphics Processing Unit',
        definition: 'Parallel processor used for AI training and inference. The H200 is NVIDIA’s data-center GPU in this report.',
      },
      {
        abbr: 'BOM',
        name: 'Bill of Materials',
        definition: 'Estimated dollar cost of physical components per finished chip — used here to compare foundry vs. memory spend.',
      },
      {
        abbr: 'SEC',
        name: 'U.S. Securities and Exchange Commission',
        definition: 'Regulator that publishes public company filings. This report extracts supply-chain clues from those documents.',
      },
      {
        abbr: '10-K',
        name: 'SEC annual report (U.S. companies)',
        definition: 'Yearly filing with business description, risks, and supplier relationships.',
      },
      {
        abbr: '20-F',
        name: 'SEC annual report (foreign companies)',
        definition: 'Equivalent annual filing for non-U.S. issuers such as TSMC and ASML.',
      },
      {
        abbr: 'IC',
        name: 'Integrated Circuit',
        definition: 'A complete electronic circuit fabricated on a single chip — the generic term for a semiconductor device.',
      },
    ],
  },
];

/** Flat list for search/filter */
export const ALL_GLOSSARY_ITEMS = GLOSSARY_GROUPS.flatMap((g) =>
  g.items.map((item) => ({ ...item, group: g.title })),
);
