/**
 * Human-readable uses, industries, and strategic importance for each rare earth element.
 * Shown in the materials UI and merged into the pipeline index.
 */

/** Canonical industry tags used for filtering and search. */
export const MATERIALS_INDUSTRIES = [
  'Aerospace',
  'Automotive',
  'Clean energy',
  'Consumer electronics',
  'Defense',
  'Displays & lighting',
  'EV & mobility',
  'Industrial automation',
  'Industrial lasers',
  'Industrial manufacturing',
  'Medical imaging',
  'Nuclear energy',
  'Oil refining',
  'Security printing',
  'Semiconductor manufacturing',
  'Telecommunications',
  'Wind energy',
];

/** @type {Record<string, { uses: string[], industries: string[], usesDetail: string, importance: string }>} */
export const ELEMENT_NOTES = {
  Sc: {
    uses: ['Al-Sc alloys', 'solid oxide fuel cells', 'aerospace structures', 'stadium lighting'],
    industries: ['Aerospace', 'Clean energy', 'Industrial manufacturing'],
    usesDetail:
      'Scandium is added in small amounts to aluminum alloys to improve strength, weldability, and corrosion resistance without much weight penalty. It appears in high-performance aerospace and sports equipment, and in scandium-stabilized zirconia for solid oxide fuel cells.',
    importance:
      'It is the lightest rare earth and scarce in concentrated deposits, so supply is limited. Growing interest in lightweight transport and clean energy keeps scandium on critical-minerals watchlists even though volumes are small compared with Nd or Dy.',
  },
  Y: {
    uses: ['LED phosphors', 'YAG lasers', 'yttria ceramics', 'high-temperature superconductors (R&D)'],
    industries: ['Displays & lighting', 'Industrial lasers', 'Semiconductor manufacturing'],
    usesDetail:
      'Yttrium is not a lanthanide but is grouped with heavy REE because it occurs in the same deposits and separation circuits. It is essential for red phosphors in displays and white LEDs, for yttrium aluminum garnet (YAG) laser crystals, and for thermal-barrier coatings.',
    importance:
      'China dominates yttrium refining. Any disruption affects display supply chains and industrial lasers. It is often co-produced with ionic-clay heavy REE mines in southern China and Myanmar.',
  },
  La: {
    uses: ['fluid catalytic cracking (FCC)', 'NiMH battery alloys', 'optical glass', 'FCE electrodes'],
    industries: ['Oil refining', 'Clean energy', 'Automotive'],
    usesDetail:
      'Lanthanum’s largest industrial use is as a fluid-cracking catalyst in oil refineries, converting heavy crude fractions into gasoline and diesel. It is also used in nickel–metal hydride (NiMH) battery negative electrodes and in high-refractive-index glass.',
    importance:
      'La is abundant among light REE and often produced in surplus when miners target NdPr. Refinery demand makes it a bellwether for broader REE processing economics and Chinese export policy.',
  },
  Ce: {
    uses: ['glass polishing powder', 'auto exhaust catalysts', 'UV-absorbing glass', 'CeO₂ abrasives'],
    industries: ['Semiconductor manufacturing', 'Automotive', 'Displays & lighting'],
    usesDetail:
      'Cerium is the most abundant rare earth. Cerium oxide is the standard abrasive for polishing glass, silicon wafers, and LCD panels. Cerium additives in catalysts help automotive three-way catalysts oxidize CO and hydrocarbons.',
    importance:
      'Ce underpins semiconductor and display manufacturing supply chains through polishing demand. Large Ce surpluses can depress prices and shape mine economics at Mountain Pass and Bayan Obo.',
  },
  Pr: {
    uses: ['NdFeB magnets (with Nd)', 'aircraft engine alloys', 'welding goggles glass', 'carbon arc lighting'],
    industries: ['EV & mobility', 'Wind energy', 'Aerospace'],
    usesDetail:
      'Praseodymium is almost always sold and used together with neodymium as NdPr oxide or metal. It strengthens NdFeB magnets and provides yellow-green color in glasses and ceramics. Some specialty alloys for aircraft engines use Pr.',
    importance:
      'Magnet demand is driven primarily by Nd, but Pr must be separated in similar volumes. NdPr pricing and Chinese separation capacity directly affect EV motor and wind-turbine costs.',
  },
  Nd: {
    uses: ['NdFeB permanent magnets', 'EV traction motors', 'wind generators', 'robotics & HDD voice coils'],
    industries: ['EV & mobility', 'Wind energy', 'Defense', 'Industrial automation', 'Consumer electronics'],
    usesDetail:
      'Neodymium is the core element in neodymium–iron–boron (NdFeB) magnets — the strongest permanent magnets known at room temperature. These magnets power electric vehicle drivetrains, direct-drive wind turbines, industrial robots, and many consumer electronics.',
    importance:
      'Nd (with Pr) is the single most strategically important REE for energy transition. China controls most separation and magnet manufacturing; Western mines and magnet plants are national security and climate-policy priorities.',
  },
  Pm: {
    uses: ['radio luminescent paint (historic)', 'nuclear batteries (research)', 'thickness gauges'],
    industries: ['Nuclear energy'],
    usesDetail:
      'Promethium has no stable isotopes and is produced by nuclear fission or irradiation, not by mining. Historically it was used in luminous paint and betavoltaic power sources; commercial uses today are niche.',
    importance:
      'Pm is irrelevant to extractive supply chains but illustrates why some REE slots in the periodic table are not commodity minerals. It is included for completeness in REE chemistry and separation trains.',
  },
  Sm: {
    uses: ['SmCo permanent magnets', 'nuclear reactor control rods', 'glass and infrared absorbers'],
    industries: ['Defense', 'Aerospace', 'Nuclear energy'],
    usesDetail:
      'Samarium–cobalt (SmCo) magnets work at higher temperatures than NdFeB and resist demagnetization better, so they appear in aerospace, defense, and precision motors. Samarium also absorbs neutrons in nuclear control rods.',
    importance:
      'SmCo magnets are a strategic alternative when NdFeB cannot tolerate heat or corrosion. Sm supply is smaller than Nd but still matters for defense and space applications.',
  },
  Eu: {
    uses: ['red & blue phosphors in displays', 'anti-counterfeiting inks', 'control rods (EuB₆)'],
    industries: ['Displays & lighting', 'Security printing'],
    usesDetail:
      'Europium provides the red phosphor in CRT and some LED displays and is used in UV-reactive security features on banknotes. Its chemistry is unique among REE, making separation costly.',
    importance:
      'Eu is one of the lowest-abundance REE and was historically subject to extreme price spikes. Display technology shifts reduced some demand, but security printing and specialty lighting still require reliable supply.',
  },
  Gd: {
    uses: ['MRI contrast agents', 'neutron shielding', 'magnetostrictive alloys', 'Nuclear fuel burnable poison'],
    industries: ['Medical imaging', 'Nuclear energy', 'Industrial automation'],
    usesDetail:
      'Gadolinium compounds enhance MRI contrast and absorb neutrons in nuclear reactors. Gadolinium–terbium–iron alloys show giant magnetostriction for precision actuators.',
    importance:
      'Medical imaging demand makes Gd medically critical; nuclear uses tie it to energy security. It is a middle REE with distinct separation chemistry from light and heavy fractions.',
  },
  Tb: {
    uses: ['green phosphors', 'magnetostriction (Terfenol-D)', 'solid-state devices', 'NdFeB additive'],
    industries: ['EV & mobility', 'Wind energy', 'Displays & lighting'],
    usesDetail:
      'Terbium enables green phosphors in displays and, in small amounts, improves high-temperature performance of NdFeB magnets (often with Dy). Terfenol-D alloys convert magnetic fields into precise mechanical motion.',
    importance:
      'Tb is a heavy REE in tight supply — often sourced from ionic-clay deposits in Myanmar and southern China. EV magnet makers monitor Tb and Dy prices closely because grams per motor add up at scale.',
  },
  Dy: {
    uses: ['high-temperature NdFeB magnets', 'lasers', 'data-storage materials', 'nuclear control'],
    industries: ['EV & mobility', 'Wind energy', 'Defense'],
    usesDetail:
      'Dysprosium is added to NdFeB magnets so they retain coercivity above ~150°C, which is required for EV motors and direct-drive wind turbines. Without Dy (or heavy Tb), magnets demagnetize under operating heat.',
    importance:
      'Dy is the bottleneck heavy REE for electrification. China’s share of heavy REE separation is even higher than for light REE. Western OEMs pursue grain-boundary diffusion and recycling to reduce Dy intensity per motor.',
  },
  Ho: {
    uses: ['medical & military lasers', 'magnetic flux concentrators', 'calibration standards'],
    industries: ['Medical imaging', 'Defense', 'Industrial lasers'],
    usesDetail:
      'Holmium-doped yttrium iron garnet (Ho:YAG) lasers are used in surgery and materials processing. Holmium has the highest magnetic moment of any element, useful in flux-concentrator research.',
    importance:
      'Ho volumes are small but prices can spike because it is co-mined with other heavy REE and must be separated. Supply risk is secondary to Dy/Tb for most policymakers.',
  },
  Er: {
    uses: ['erbium-doped fiber amplifiers (EDFA)', 'fiber lasers', 'pink glass & glazes', 'metallurgy'],
    industries: ['Telecommunications', 'Industrial manufacturing', 'Industrial lasers'],
    usesDetail:
      'Erbium-doped fiber amplifiers power long-haul internet and submarine cables by boosting optical signals without electrical conversion. High-power erbium fiber lasers cut metal and weld in manufacturing.',
    importance:
      'Er underpins global telecommunications infrastructure. Any REE supply shock that raises heavy REE prices affects network equipment costs alongside defense and industrial laser systems.',
  },
  Tm: {
    uses: ['portable X-ray sources', 'high-power lasers', 'temperature calibration'],
    industries: ['Medical imaging', 'Industrial lasers'],
    usesDetail:
      'Thulium-170 sources enable compact X-ray devices for medical and industrial inspection. Thulium fiber lasers operate at wavelengths useful for plastics processing and surgery.',
    importance:
      'Tm is a niche heavy REE with limited tonnage but high value per kilogram. It illustrates the long tail of REE applications beyond magnets.',
  },
  Yb: {
    uses: ['high-power fiber lasers', 'steel alloying', 'atomic clocks (Yb lattice)', 'solar cells (research)'],
    industries: ['Industrial manufacturing', 'Defense', 'Industrial lasers'],
    usesDetail:
      'Ytterbium fiber lasers dominate industrial cutting and welding. Ytterbium is also studied for next-generation atomic clocks and some photovoltaic materials.',
    importance:
      'Industrial laser demand ties Yb to manufacturing reshoring and defense production. Separation from other heavy REE remains concentrated in Asia.',
  },
  Lu: {
    uses: ['PET scan detectors (LSO, LYSO)', 'catalysts for petroleum cracking', 'LED phosphors'],
    industries: ['Medical imaging', 'Oil refining', 'Displays & lighting'],
    usesDetail:
      'Lutetium oxyorthosilicate crystals are used in positron emission tomography (PET) scanners. Lutetium is the heaviest and rarest lanthanide, often the last cut in separation plants.',
    importance:
      'Lu is essential for medical imaging and commands premium pricing. Its scarcity makes it a “canary” for separation-plant efficiency and heavy REE tailings management.',
  },
};
