/** localStorage key for theme preference (`system` | `light` | `dark`). */
export const THEME_STORAGE_KEY = 'supply-chain-theme';

/** @typedef {'system' | 'light' | 'dark'} ThemeMode */

/** @type {ThemeMode} */
let mode = 'system';

const listeners = new Set();

/** @returns {ThemeMode | null} */
export function readStoredThemeMode() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  } catch {
    /* private mode / blocked storage */
  }
  return null;
}

/** @param {ThemeMode} next */
export function writeStoredThemeMode(next) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
}

function getSystemDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** @param {ThemeMode} themeMode */
export function resolveTheme(themeMode = mode) {
  if (themeMode === 'system') return getSystemDark() ? 'dark' : 'light';
  return themeMode;
}

let lastResolved = 'light';

function apply() {
  const resolved = resolveTheme(mode);
  const changed = resolved !== lastResolved;
  lastResolved = resolved;
  const root = document.documentElement;
  root.dataset.theme = mode;
  root.dataset.resolved = resolved;
  root.style.colorScheme = resolved;
  root.classList.toggle('dark', resolved === 'dark');
  if (changed) listeners.forEach((fn) => fn(mode));
}

/** Whether the active UI theme is dark (DOM class when available). */
export function isDarkTheme() {
  if (typeof document !== 'undefined') {
    return document.documentElement.classList.contains('dark');
  }
  return resolveTheme() === 'dark';
}

/** Apply saved preference (call from inline boot + initTheme). */
export function initTheme() {
  const saved = readStoredThemeMode();
  if (saved) mode = saved;
  apply();

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (mode === 'system') apply();
  });
}

/** @returns {ThemeMode} */
export function getThemeMode() {
  return mode;
}

/** @param {ThemeMode} next */
export function setThemeMode(next) {
  mode = next;
  writeStoredThemeMode(next);
  apply();
  listeners.forEach((fn) => fn(mode));
}

/** @param {(mode: ThemeMode) => void} fn */
export function subscribeTheme(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getResolvedTheme() {
  return resolveTheme();
}
