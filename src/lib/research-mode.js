/** Research area: semiconductor accelerators vs raw materials. */

export const RESEARCH_MODES = [
  { id: 'accelerators', label: 'AI accelerators', description: 'SEC-grounded chip supply chains' },
  { id: 'materials', label: 'Raw materials', description: 'Extractive inputs — rare earth elements' },
  { id: 'space-economy', label: 'Space economy', description: 'Launch, satellites, ground & in-space services' },
];

const STORAGE_KEY = 'supply-chain-research-mode';

export function loadResearchMode() {
  if (typeof window === 'undefined') return 'accelerators';
  const fromHash = researchModeFromHash(window.location.hash);
  if (fromHash) return fromHash;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && RESEARCH_MODES.some((m) => m.id === saved)) return saved;
  return 'accelerators';
}

/** @param {string} [hash] */
export function researchModeFromHash(hash = '') {
  const raw = String(hash).replace(/^#/, '').trim();
  if (!raw) return null;
  const parts = raw.startsWith('/') ? raw.slice(1).split('/') : raw.split('/');
  if (parts[0] === 'materials') return 'materials';
  if (parts[0] === 'space-economy') return 'space-economy';
  return null;
}

export function saveResearchMode(mode, { hash = true } = {}) {
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, mode);
  if (typeof window === 'undefined' || hash === false) return;

  if (mode === 'materials') {
    const next = '#materials/rare-earth';
    if (window.location.hash !== next) {
      history.replaceState(null, '', `${window.location.pathname}${window.location.search}${next}`);
    }
  } else if (mode === 'space-economy') {
    const next = '#space-economy';
    if (window.location.hash !== next) {
      history.replaceState(null, '', `${window.location.pathname}${window.location.search}${next}`);
    }
  } else if (
    window.location.hash.startsWith('#materials') ||
    window.location.hash.startsWith('#space-economy')
  ) {
    const topic = localStorage.getItem('supply-chain-topic');
    const next = topic ? `#${topic}` : '';
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}${next}`);
  }
}

/**
 * @param {(mode: string) => void} onMode
 */
export function installResearchModeHashSync(onMode) {
  if (typeof window === 'undefined') return () => {};

  const handler = () => {
    const mode = researchModeFromHash(window.location.hash);
    if (mode) onMode(mode);
    else onMode('accelerators');
  };

  window.addEventListener('hashchange', handler);
  return () => window.removeEventListener('hashchange', handler);
}
