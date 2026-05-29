/**
 * Curated plain-language definitions for abbreviations found in SEC filing RAG chunks.
 * Keys are uppercase; export script also matches mixed-case forms (CoWoS, SoC).
 */

export const GLOSSARY_CATEGORIES = {
  memory: 'Memory & storage',
  packaging: 'Advanced packaging',
  lithography: 'Lithography & patterning',
  manufacturing: 'Manufacturing & fabs',
  materials: 'Materials & wafer types',
  design: 'Design, EDA & IP',
  products: 'Products & compute',
  equipment: 'Semiconductor equipment',
  companies: 'Companies & sites',
  sustainability: 'Sustainability & ESG',
  regulations: 'Trade & regulation',
  accounting: 'Accounting & filings',
  general: 'General',
};

/** @type {Record<string, { name: string, definition: string, category?: keyof typeof GLOSSARY_CATEGORIES }>} */
export const GLOSSARY_DEFINITIONS = {
  // Memory & storage
  HBM: {
    name: 'High Bandwidth Memory',
    definition: 'Stacked DRAM placed next to the compute die for very high data bandwidth — a major cost on AI GPUs.',
    category: 'memory',
  },
  HBM3E: {
    name: 'High Bandwidth Memory 3 extended',
    definition: 'Latest HBM generation on NVIDIA H200 — faster and higher capacity than HBM3.',
    category: 'memory',
  },
  DRAM: {
    name: 'Dynamic Random Access Memory',
    definition: 'Standard volatile system memory. HBM is a specialized stacked form used on accelerators.',
    category: 'memory',
  },
  NAND: {
    name: 'NAND flash',
    definition: 'Non-volatile storage memory used in SSDs and phones — separate from DRAM/HBM on GPUs.',
    category: 'memory',
  },
  SSD: {
    name: 'Solid State Drive',
    definition: 'Storage device built from NAND flash chips.',
    category: 'memory',
  },
  DDR: {
    name: 'Double Data Rate memory',
    definition: 'Standard off-chip memory interface used in PCs and servers (e.g. DDR5).',
    category: 'memory',
  },

  // Packaging
  COWOS: {
    name: 'Chip on Wafer on Substrate',
    definition: 'TSMC advanced packaging: GPU die + HBM on a silicon interposer, mounted on a package substrate.',
    category: 'packaging',
  },
  'COWOS-S': {
    name: 'CoWoS-S (silicon interposer variant)',
    definition: 'CoWoS version using a silicon interposer — used for large AI accelerators with HBM.',
    category: 'packaging',
  },
  OSAT: {
    name: 'Outsourced Assembly, Test & Packaging',
    definition: 'Contractors that assemble, test, and pack finished chips (Foxconn, Amkor, etc.).',
    category: 'packaging',
  },
  SMT: {
    name: 'Surface Mount Technology',
    definition: 'Method of mounting components directly on PCB surfaces — used in module assembly.',
    category: 'packaging',
  },
  PCB: {
    name: 'Printed Circuit Board',
    definition: 'Board that connects and supports electronic components in a module or system.',
    category: 'packaging',
  },
  PLP: {
    name: 'Panel-Level Packaging',
    definition: 'Packaging many chips at panel scale rather than one die at a time — improves throughput.',
    category: 'packaging',
  },
  WLP: {
    name: 'Wafer-Level Packaging',
    definition: 'Packaging chips while still on the wafer, before singulation into individual dies.',
    category: 'packaging',
  },
  SIP: {
    name: 'System in Package',
    definition: 'Multiple dies or components integrated into one package (often with HBM + logic).',
    category: 'packaging',
  },
  TSV: {
    name: 'Through-Silicon Via',
    definition: 'Vertical electrical connection through a silicon die — key to 3D stacking and HBM.',
    category: 'packaging',
  },

  // Lithography
  EUV: {
    name: 'Extreme Ultraviolet lithography',
    definition: '13.5 nm light for printing the finest chip features. ASML is the sole commercial supplier.',
    category: 'lithography',
  },
  DUV: {
    name: 'Deep Ultraviolet lithography',
    definition: 'Older-generation lithography (193 nm) still used for many chip layers.',
    category: 'lithography',
  },
  TWINSCAN: {
    name: 'TWINSCAN',
    definition: 'ASML’s family of lithography scanner products (DUV and EUV systems).',
    category: 'lithography',
  },
  NXE: {
    name: 'NXE (EUV platform)',
    definition: 'ASML EUV scanner product line (e.g. NXE:3600) used at leading-edge fabs.',
    category: 'lithography',
  },
  NXT: {
    name: 'NXT (DUV platform)',
    definition: 'ASML immersion DUV scanner product line for advanced nodes.',
    category: 'lithography',
  },
  ARF: {
    name: 'Argon Fluoride laser',
    definition: '193 nm DUV light source used in immersion lithography scanners.',
    category: 'lithography',
  },
  OPC: {
    name: 'Optical Proximity Correction',
    definition: 'Software that pre-distorts mask patterns so printed shapes match design intent.',
    category: 'lithography',
  },
  RETICLE: {
    name: 'Reticle (photomask)',
    definition: 'Glass plate with chip layer pattern — projected onto wafers by lithography tools.',
    category: 'lithography',
  },

  // Manufacturing
  TSMC: {
    name: 'Taiwan Semiconductor Manufacturing Company',
    definition: 'World’s largest contract foundry; fabricates NVIDIA GPU dies and CoWoS packaging.',
    category: 'manufacturing',
  },
  FAB: {
    name: 'Fabrication plant',
    definition: 'Clean-room factory where wafers are processed into chips.',
    category: 'manufacturing',
  },
  FOUNDRY: {
    name: 'Contract chip manufacturer',
    definition: 'Makes chips designed by others (fabless companies). TSMC is the dominant foundry here.',
    category: 'manufacturing',
  },
  WAFER: {
    name: 'Silicon wafer',
    definition: 'Thin disk of silicon — the base substrate on which chips are built.',
    category: 'manufacturing',
  },
  NODE: {
    name: 'Process node',
    definition: 'Fab technology generation (e.g. 3 nm, 5 nm) describing transistor size and density.',
    category: 'manufacturing',
  },
  BEOL: {
    name: 'Back End of Line',
    definition: 'Fab steps that build metal wiring layers connecting transistors.',
    category: 'manufacturing',
  },
  FEOL: {
    name: 'Front End of Line',
    definition: 'Fab steps that form transistors and devices on the wafer.',
    category: 'manufacturing',
  },
  CMP: {
    name: 'Chemical Mechanical Polishing',
    definition: 'Process that planarizes wafer surfaces between fabrication steps.',
    category: 'manufacturing',
  },
  CVD: {
    name: 'Chemical Vapor Deposition',
    definition: 'Deposits thin films on wafers from gas-phase reactions.',
    category: 'manufacturing',
  },
  PVD: {
    name: 'Physical Vapor Deposition',
    definition: 'Deposits metal or material layers by physical sputtering or evaporation.',
    category: 'manufacturing',
  },
  ALD: {
    name: 'Atomic Layer Deposition',
    definition: 'Ultra-thin, highly uniform film deposition — critical at advanced nodes.',
    category: 'manufacturing',
  },
  ETCH: {
    name: 'Etch (plasma etch)',
    definition: 'Removes material selectively to carve transistor and wiring shapes.',
    category: 'manufacturing',
  },
  RTP: {
    name: 'Rapid Thermal Processing',
    definition: 'Fast high-temperature wafer treatment for annealing and activation.',
    category: 'manufacturing',
  },
  JASM: {
    name: 'Japan Advanced Semiconductor Manufacturing',
    definition: 'TSMC joint-venture fab in Kumamoto, Japan (with Sony and Denso).',
    category: 'manufacturing',
  },
  SSMC: {
    name: 'Systems on Silicon Manufacturing Company',
    definition: 'TSMC-affiliated wafer fab in Singapore.',
    category: 'manufacturing',
  },

  // Materials
  GAN: {
    name: 'Gallium Nitride',
    definition: 'Wide-bandgap semiconductor for power electronics and some specialty wafers.',
    category: 'materials',
  },
  SIC: {
    name: 'Silicon Carbide',
    definition: 'Wide-bandgap material for high-power and high-temperature devices.',
    category: 'materials',
  },
  SOI: {
    name: 'Silicon on Insulator',
    definition: 'Wafer with thin silicon on an insulating layer — used in RF and low-power chips.',
    category: 'materials',
  },
  EPI: {
    name: 'Epitaxial silicon',
    definition: 'High-quality crystal layer grown on a wafer for advanced device structures.',
    category: 'materials',
  },
  MEMS: {
    name: 'Micro-Electro-Mechanical Systems',
    definition: 'Microscopic mechanical structures on silicon (sensors, actuators).',
    category: 'materials',
  },
  RF: {
    name: 'Radio Frequency',
    definition: 'Chip domains handling wireless and high-frequency analog signals.',
    category: 'materials',
  },
  PHOTORESIST: {
    name: 'Photoresist',
    definition: 'Light-sensitive coating on wafers — patterned during lithography.',
    category: 'materials',
  },
  SLURRY: {
    name: 'CMP slurry',
    definition: 'Chemical mixture used in polishing to planarize wafer surfaces.',
    category: 'materials',
  },

  // Design & EDA
  EDA: {
    name: 'Electronic Design Automation',
    definition: 'Software to design, simulate, and verify chips before manufacturing (Synopsys, Cadence).',
    category: 'design',
  },
  IP: {
    name: 'Semiconductor intellectual property',
    definition: 'Licensed design blocks (CPU cores, interfaces) integrated into a chip.',
    category: 'design',
  },
  RTL: {
    name: 'Register Transfer Level',
    definition: 'Digital chip description level used before gate-level synthesis.',
    category: 'design',
  },
  SOC: {
    name: 'System on Chip',
    definition: 'Single chip integrating CPU, GPU, memory controllers, and other blocks.',
    category: 'design',
  },
  FPGA: {
    name: 'Field Programmable Gate Array',
    definition: 'Reconfigurable chip that can be reprogrammed after manufacturing.',
    category: 'design',
  },
  ASIC: {
    name: 'Application-Specific Integrated Circuit',
    definition: 'Custom chip designed for one application (vs. general-purpose CPU/GPU).',
    category: 'design',
  },
  DRC: {
    name: 'Design Rule Check',
    definition: 'Automated verification that layout meets fab manufacturing rules.',
    category: 'design',
  },
  LVS: {
    name: 'Layout vs. Schematic',
    definition: 'Verification that physical layout matches the intended circuit design.',
    category: 'design',
  },
  CFD: {
    name: 'Computational Fluid Dynamics',
    definition: 'Simulation of fluid/thermal behavior — used in chip and system cooling analysis.',
    category: 'design',
  },
  EM: {
    name: 'Electromigration',
    definition: 'Metal wire degradation under current — a reliability concern in advanced chips.',
    category: 'design',
  },

  // Products
  GPU: {
    name: 'Graphics Processing Unit',
    definition: 'Parallel processor for AI and graphics. H200 is NVIDIA’s data-center GPU in this report.',
    category: 'products',
  },
  GPUS: {
    name: 'Graphics Processing Units',
    definition: 'Plural of GPU — parallel accelerators used for AI training and inference.',
    category: 'products',
  },
  CPU: {
    name: 'Central Processing Unit',
    definition: 'General-purpose processor core — often combined with accelerators in a system.',
    category: 'products',
  },
  AI: {
    name: 'Artificial Intelligence',
    definition: 'Machine learning workloads driving demand for GPUs, HBM, and advanced packaging.',
    category: 'products',
  },
  ML: {
    name: 'Machine Learning',
    definition: 'Algorithms that learn from data — primary workload on NVIDIA data-center GPUs.',
    category: 'products',
  },
  HPC: {
    name: 'High Performance Computing',
    definition: 'Large-scale scientific and AI supercomputing — major GPU market segment.',
    category: 'products',
  },
  IC: {
    name: 'Integrated Circuit',
    definition: 'Complete electronic circuit on a single chip.',
    category: 'products',
  },
  ICS: {
    name: 'Integrated Circuits',
    definition: 'Plural of IC — chips fabricated on silicon wafers.',
    category: 'products',
  },
  DATACENTER: {
    name: 'Data center',
    definition: 'Facilities housing servers and AI clusters — primary market for H200 GPUs.',
    category: 'products',
  },
  BOM: {
    name: 'Bill of Materials',
    definition: 'Estimated dollar cost of components per finished product.',
    category: 'products',
  },
  VR: {
    name: 'Virtual Reality',
    definition: 'Immersive display/compute market segment referenced in some filings.',
    category: 'products',
  },
  AR: {
    name: 'Augmented Reality',
    definition: 'Overlay digital content on the real world — adjacent compute market.',
    category: 'products',
  },

  // Equipment
  ASML: {
    name: 'ASML Holding',
    definition: 'Dutch company — monopoly supplier of EUV lithography systems.',
    category: 'equipment',
  },
  AMAT: {
    name: 'Applied Materials',
    definition: 'Largest semiconductor equipment maker (deposition, etch, inspection).',
    category: 'equipment',
  },
  LRCX: {
    name: 'Lam Research',
    definition: 'Major supplier of etch and deposition equipment for fabs.',
    category: 'equipment',
  },
  KLAC: {
    name: 'KLA Corporation',
    definition: 'Leading process control and inspection equipment supplier (formerly KLA-Tencor).',
    category: 'equipment',
  },
  KLA: {
    name: 'KLA (inspection & metrology)',
    definition: 'Shorthand for KLA Corporation — wafer defect inspection and measurement tools.',
    category: 'equipment',
  },
  TEL: {
    name: 'Tokyo Electron',
    definition: 'Major Japanese fab equipment supplier (coater/developer, etch, deposition).',
    category: 'equipment',
  },
  SEMI: {
    name: 'Semiconductor Equipment and Materials International',
    definition: 'Industry association for chip supply chain; also used for equipment/materials sector.',
    category: 'equipment',
  },
  METROLOGY: {
    name: 'Metrology',
    definition: 'Precision measurement of wafer features — critical for yield at advanced nodes.',
    category: 'equipment',
  },
  INSPECTION: {
    name: 'Wafer inspection',
    definition: 'Finding defects on wafers and reticles during manufacturing.',
    category: 'equipment',
  },

  // Companies & sites
  NVIDIA: {
    name: 'NVIDIA Corporation',
    definition: 'Designer of GPUs and AI accelerators (NVDA) — anchor company of this supply chain map.',
    category: 'companies',
  },
  NVDA: {
    name: 'NVIDIA (ticker)',
    definition: 'NASDAQ ticker symbol for NVIDIA Corporation.',
    category: 'companies',
  },
  SNPS: {
    name: 'Synopsys',
    definition: 'Major EDA and semiconductor IP vendor.',
    category: 'companies',
  },
  CDNS: {
    name: 'Cadence Design Systems',
    definition: 'Major EDA and verification software vendor.',
    category: 'companies',
  },
  MU: {
    name: 'Micron Technology',
    definition: 'Memory manufacturer (DRAM and NAND).',
    category: 'companies',
  },
  SK: {
    name: 'SK Group / SK Hynix',
    definition: 'Korean conglomerate; SK Hynix is a primary HBM supplier in this chain.',
    category: 'companies',
  },
  YMTC: {
    name: 'Yangtze Memory Technologies Corp',
    definition: 'Chinese NAND flash manufacturer — cited in trade and supply-chain risk disclosures.',
    category: 'companies',
  },
  TSM: {
    name: 'TSMC (ticker)',
    definition: 'NYSE ticker for Taiwan Semiconductor Manufacturing Company.',
    category: 'companies',
  },
  VIS: {
    name: 'VIS (Vanguard International Semiconductor)',
    definition: 'Taiwanese specialty foundry (mature nodes, MEMS, power).',
    category: 'companies',
  },
  AEBU: {
    name: 'Advanced Edge Business Unit',
    definition: 'Internal business segment referenced in equipment company filings.',
    category: 'companies',
  },
  MCBU: {
    name: 'Metrology and Inspection Business Unit',
    definition: 'KLA segment for process control and inspection products.',
    category: 'companies',
  },
  CMBU: {
    name: 'Component Inspection Business Unit',
    definition: 'KLA segment focused on component and reticle inspection.',
    category: 'companies',
  },
  CDBU: {
    name: 'Chip Data Business Unit',
    definition: 'Business unit referenced in semiconductor equipment filings.',
    category: 'companies',
  },

  // Sustainability & ESG
  ESG: {
    name: 'Environmental, Social, and Governance',
    definition: 'Non-financial reporting on climate, workforce, and corporate governance.',
    category: 'sustainability',
  },
  GHG: {
    name: 'Greenhouse Gas',
    definition: 'Emissions (CO₂ equivalent) tracked for climate reporting (Scope 1/2/3).',
    category: 'sustainability',
  },
  ESRS: {
    name: 'European Sustainability Reporting Standards',
    definition: 'EU mandatory sustainability disclosure framework.',
    category: 'sustainability',
  },
  SBTI: {
    name: 'Science Based Targets initiative',
    definition: 'Framework for corporate emissions reduction targets aligned with climate science.',
    category: 'sustainability',
  },
  SCC: {
    name: 'Semiconductor Climate Consortium',
    definition: 'Industry group working on semiconductor supply-chain emissions reduction.',
    category: 'sustainability',
  },
  CCM: {
    name: 'Climate Change Mitigation',
    definition: 'EU taxonomy category for activities that reduce greenhouse gas emissions.',
    category: 'sustainability',
  },
  CCA: {
    name: 'Climate Change Adaptation',
    definition: 'EU taxonomy category for adapting to climate impacts.',
    category: 'sustainability',
  },
  EHS: {
    name: 'Environment, Health & Safety',
    definition: 'Workplace and environmental safety programs in fabs and factories.',
    category: 'sustainability',
  },
  RBA: {
    name: 'Responsible Business Alliance',
    definition: 'Industry coalition setting labor and ethics standards for electronics supply chains.',
    category: 'sustainability',
  },
  ILO: {
    name: 'International Labour Organization',
    definition: 'UN agency whose labor standards are referenced in supplier codes of conduct.',
    category: 'sustainability',
  },
  OECD: {
    name: 'Organisation for Economic Co-operation and Development',
    definition: 'Intergovernmental forum — OECD guidelines cited in responsible sourcing policies.',
    category: 'sustainability',
  },
  UNGC: {
    name: 'UN Global Compact',
    definition: 'UN corporate sustainability initiative referenced in ESG disclosures.',
    category: 'sustainability',
  },

  // Regulations & trade
  SEC: {
    name: 'U.S. Securities and Exchange Commission',
    definition: 'Regulator publishing public company filings used as evidence in this report.',
    category: 'regulations',
  },
  BIS: {
    name: 'Bureau of Industry and Security',
    definition: 'U.S. agency administering export controls on advanced semiconductors and tools.',
    category: 'regulations',
  },
  CHIPS: {
    name: 'CHIPS Act',
    definition: 'U.S. law providing incentives for domestic semiconductor manufacturing.',
    category: 'regulations',
  },
  ITAR: {
    name: 'International Traffic in Arms Regulations',
    definition: 'U.S. rules controlling export of defense-related technology.',
    category: 'regulations',
  },
  EAR: {
    name: 'Export Administration Regulations',
    definition: 'U.S. Commerce Department rules governing dual-use technology exports.',
    category: 'regulations',
  },
  EU: {
    name: 'European Union',
    definition: 'Regional bloc whose regulations (CSRD, taxonomy) appear in sustainability filings.',
    category: 'regulations',
  },
  EEA: {
    name: 'European Economic Area',
    definition: 'EU plus Iceland, Liechtenstein, Norway — referenced in geographic disclosures.',
    category: 'regulations',
  },
  PFIC: {
    name: 'Passive Foreign Investment Company',
    definition: 'U.S. tax classification affecting foreign company shareholders.',
    category: 'regulations',
  },

  // Accounting & filings
  GAAP: {
    name: 'Generally Accepted Accounting Principles',
    definition: 'U.S. accounting standards used in 10-K financial statements.',
    category: 'accounting',
  },
  IFRS: {
    name: 'International Financial Reporting Standards',
    definition: 'Global accounting standards used by many non-U.S. filers (e.g. ASML, TSMC).',
    category: 'accounting',
  },
  FASB: {
    name: 'Financial Accounting Standards Board',
    definition: 'U.S. body that sets GAAP accounting rules.',
    category: 'accounting',
  },
  ASC: {
    name: 'Accounting Standards Codification',
    definition: 'Structured collection of U.S. GAAP rules referenced in filings.',
    category: 'accounting',
  },
  SOX: {
    name: 'Sarbanes-Oxley Act',
    definition: 'U.S. law requiring internal controls over financial reporting (Section 404).',
    category: 'accounting',
  },
  COSO: {
    name: 'Committee of Sponsoring Organizations',
    definition: 'Framework for internal control over financial reporting (COSO framework).',
    category: 'accounting',
  },
  PCAOB: {
    name: 'Public Company Accounting Oversight Board',
    definition: 'U.S. body overseeing audits of public companies.',
    category: 'accounting',
  },
  XBRL: {
    name: 'eXtensible Business Reporting Language',
    definition: 'Machine-readable format for SEC financial filings.',
    category: 'accounting',
  },
  RSU: {
    name: 'Restricted Stock Unit',
    definition: 'Employee equity grant that vests over time — common in tech company comp.',
    category: 'accounting',
  },
  RSUS: {
    name: 'Restricted Stock Units',
    definition: 'Plural of RSU — stock-based compensation awards.',
    category: 'accounting',
  },
  RSA: {
    name: 'Restricted Stock Award',
    definition: 'Stock grant with vesting restrictions.',
    category: 'accounting',
  },
  RSAS: {
    name: 'Restricted Stock Awards',
    definition: 'Plural of RSA.',
    category: 'accounting',
  },
  ESPP: {
    name: 'Employee Stock Purchase Plan',
    definition: 'Program letting employees buy company stock at a discount.',
    category: 'accounting',
  },
  LTI: {
    name: 'Long-Term Incentive',
    definition: 'Multi-year executive compensation tied to performance or stock.',
    category: 'accounting',
  },
  STI: {
    name: 'Short-Term Incentive',
    definition: 'Annual bonus or performance pay for executives and employees.',
    category: 'accounting',
  },
  TSR: {
    name: 'Total Shareholder Return',
    definition: 'Stock price change plus dividends — common executive comp metric.',
    category: 'accounting',
  },
  EPS: {
    name: 'Earnings Per Share',
    definition: 'Net income divided by shares outstanding — key profitability metric.',
    category: 'accounting',
  },
  FVTOCI: {
    name: 'Fair Value Through Other Comprehensive Income',
    definition: 'IFRS accounting category for certain financial assets.',
    category: 'accounting',
  },
  AOCI: {
    name: 'Accumulated Other Comprehensive Income',
    definition: 'Balance-sheet account for unrealized gains/losses outside net income.',
    category: 'accounting',
  },
  CODM: {
    name: 'Chief Operating Decision Maker',
    definition: 'Executive who allocates resources — defines reportable business segments.',
    category: 'accounting',
  },
  ADS: {
    name: 'American Depositary Share',
    definition: 'U.S.-traded receipt representing shares of a foreign company.',
    category: 'accounting',
  },
  ADSS: {
    name: 'American Depositary Shares',
    definition: 'Plural of ADS — how foreign stocks often trade on U.S. exchanges.',
    category: 'accounting',
  },
  FTE: {
    name: 'Full-Time Equivalent',
    definition: 'Standardized headcount measure (one full-time employee = one FTE).',
    category: 'accounting',
  },
  FTES: {
    name: 'Full-Time Equivalents',
    definition: 'Plural of FTE — workforce size metric in filings.',
    category: 'accounting',
  },
  NYSE: {
    name: 'New York Stock Exchange',
    definition: 'U.S. stock exchange where some issuers in this dataset are listed.',
    category: 'accounting',
  },
  '10-K': {
    name: 'SEC annual report (U.S.)',
    definition: 'Yearly U.S. filing with business description, risks, and suppliers.',
    category: 'accounting',
  },
  '20-F': {
    name: 'SEC annual report (foreign issuers)',
    definition: 'Annual filing for non-U.S. companies (TSMC, ASML).',
    category: 'accounting',
  },
  KPI: {
    name: 'Key Performance Indicator',
    definition: 'Metric used to track business or sustainability goals.',
    category: 'accounting',
  },
  KPIS: {
    name: 'Key Performance Indicators',
    definition: 'Plural of KPI.',
    category: 'accounting',
  },
  ERP: {
    name: 'Enterprise Resource Planning',
    definition: 'Integrated software for finance, supply chain, and operations.',
    category: 'accounting',
  },
  ERM: {
    name: 'Enterprise Risk Management',
    definition: 'Process for identifying and managing company-wide risks.',
    category: 'accounting',
  },
  ISO: {
    name: 'International Organization for Standardization',
    definition: 'Body issuing standards (e.g. ISO 14001 environmental management).',
    category: 'accounting',
  },
  KPMG: {
    name: 'KPMG',
    definition: 'Global audit and advisory firm — external auditor named in filings.',
    category: 'accounting',
  },
  ASU: {
    name: 'Accounting Standards Update',
    definition: 'FASB document proposing or amending GAAP rules.',
    category: 'accounting',
  },
  AGM: {
    name: 'Annual General Meeting',
    definition: 'Yearly shareholder meeting.',
    category: 'accounting',
  },
  SAQ: {
    name: 'Self-Assessment Questionnaire',
    definition: 'Supplier audit questionnaire (often RBA-based) for supply-chain compliance.',
    category: 'accounting',
  },
  SOFR: {
    name: 'Secured Overnight Financing Rate',
    definition: 'U.S. benchmark interest rate used in loan agreements.',
    category: 'accounting',
  },
  IRS: {
    name: 'Internal Revenue Service',
    definition: 'U.S. tax authority referenced in tax footnotes.',
    category: 'accounting',
  },
  OBBBA: {
    name: 'One Big Beautiful Bill Act',
    definition: 'U.S. legislation referenced in recent tax and incentive disclosures.',
    category: 'accounting',
  },
  SSP: {
    name: 'Standalone Selling Price',
    definition: 'Revenue-recognition input for bundled hardware/software contracts.',
    category: 'accounting',
  },
  DMA: {
    name: 'Double Materiality Assessment',
    definition: 'ESG process assessing impact on business and on society/environment.',
    category: 'accounting',
  },
  USG: {
    name: 'U.S. Government',
    definition: 'Shorthand for U.S. federal agencies, contracts, or regulations in filings.',
    category: 'accounting',
  },
  TJ: {
    name: 'Tianjin (site reference)',
    definition: 'Chinese city — manufacturing or sales site referenced in regional disclosures.',
    category: 'companies',
  },
  NT: {
    name: 'New Taiwan Dollar',
    definition: 'Currency (TWD) used in TSMC and other Taiwanese company filings.',
    category: 'accounting',
  },
  CEO: {
    name: 'Chief Executive Officer',
    definition: 'Top executive leading company strategy and operations.',
    category: 'general',
  },
  CFO: {
    name: 'Chief Financial Officer',
    definition: 'Executive responsible for finance, accounting, and investor relations.',
    category: 'general',
  },
  COO: {
    name: 'Chief Operating Officer',
    definition: 'Executive overseeing day-to-day operations.',
    category: 'general',
  },
  CTO: {
    name: 'Chief Technology Officer',
    definition: 'Executive leading technology strategy and R&D direction.',
    category: 'general',
  },
};

export function lookupDefinition(abbr) {
  const key = abbr.toUpperCase().replace(/\s+/g, '');
  if (GLOSSARY_DEFINITIONS[key]) return { ...GLOSSARY_DEFINITIONS[key], abbr };
  if (GLOSSARY_DEFINITIONS[abbr]) return { ...GLOSSARY_DEFINITIONS[abbr], abbr };
  return null;
}
