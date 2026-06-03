/** Client-side chain stage labels (mirrors pipeline value-chain.mjs). */
export const CHAIN_STAGE_BY_ID = {
  mine: { id: 'mine', shortLabel: 'Mine', label: 'Mine / deposit' },
  concentrate: { id: 'concentrate', shortLabel: 'Concentrate', label: 'Beneficiation' },
  separation: { id: 'separation', shortLabel: 'Separation', label: 'Separation / SX' },
  metal: { id: 'metal', shortLabel: 'Metal', label: 'Metal / alloy' },
  magnet: { id: 'magnet', shortLabel: 'Magnet', label: 'Magnet mfg' },
  oem: { id: 'oem', shortLabel: 'OEM', label: 'OEM / end use' },
};

export const CHAIN_STAGE_OPTIONS = Object.values(CHAIN_STAGE_BY_ID);
