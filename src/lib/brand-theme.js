import { brandForNode, DEFAULT_BRAND_COLOR } from './vendor-colors.js';
import { subscribeTheme } from './theme.js';

export { DEFAULT_BRAND_COLOR };

/** @param {string} hex */
function parseHex(hex) {
  const raw = String(hex).replace('#', '').trim();
  const m = raw.match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return null;
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

/** @param {{ r: number, g: number, b: number }} rgb @param {number} alpha */
function rgba(rgb, alpha) {
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

/** @param {{ r: number, g: number, b: number }} rgb */
function relativeLuminance(rgb) {
  const channel = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

/** @param {{ color?: string } | null | undefined} brand @param {{ dark?: boolean }} [opts] */
export function brandThemeTokens(brand, { dark = false } = {}) {
  const color = brand?.color ?? DEFAULT_BRAND_COLOR;
  const rgb = parseHex(color);
  if (!rgb) return null;

  const dimAlpha = dark ? 0.18 : 0.12;
  const mapFillAlpha = dark ? 0.2 : 0.14;
  const mapRingAlpha = dark ? 0.24 : 0.18;
  const onBrand = relativeLuminance(rgb) > 0.52 ? '#1a1f2e' : '#ffffff';

  return {
    '--brand-color': color,
    '--brand-on-color': onBrand,
    '--primary': color,
    '--primary-foreground': onBrand,
    '--accent': color,
    '--accent-dim': rgba(rgb, dimAlpha),
    '--map-flow': color,
    '--map-supply-fill': rgba(rgb, mapFillAlpha),
    '--map-marker-ring': rgba(rgb, mapRingAlpha),
    '--ring': rgba(rgb, 0.45),
  };
}

const BRAND_CSS_KEYS = [
  '--brand-color',
  '--brand-on-color',
  '--primary',
  '--primary-foreground',
  '--accent',
  '--accent-dim',
  '--map-flow',
  '--map-supply-fill',
  '--map-marker-ring',
  '--ring',
];

/** @param {{ color?: string } | null | undefined} brand @param {HTMLElement} [root] */
export function applyBrandTheme(brand, root = document.documentElement) {
  const dark =
    root.dataset.resolved === 'dark' ||
    root.classList.contains('dark') ||
    (root.dataset.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const tokens = brandThemeTokens(brand, { dark });
  if (!tokens) return;

  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(key, value);
  }
}

/** @param {HTMLElement} [root] */
export function clearBrandTheme(root = document.documentElement) {
  for (const key of BRAND_CSS_KEYS) {
    root.style.removeProperty(key);
  }
}

/** Resolve anchor-company brand from topic metadata. */
export function brandForTopicMeta(topicMeta) {
  if (!topicMeta) return null;
  return (
    brandForNode({ id: topicMeta.label }) ??
    brandForNode({ id: topicMeta.shortLabel }) ??
    brandForNode({ id: topicMeta.id })
  );
}

/** Read the active brand color from the document (for PDF export). */
export function readBrandColor(root = document.documentElement) {
  const style = getComputedStyle(root);
  return (
    style.getPropertyValue('--brand-color').trim() ||
    style.getPropertyValue('--accent').trim() ||
    DEFAULT_BRAND_COLOR
  );
}

/**
 * Keep brand-derived CSS tokens in sync with topic and light/dark theme.
 * @param {() => object | null | undefined} getTopicMeta
 */
export function installBrandThemeSync(getTopicMeta) {
  const sync = () => {
    applyBrandTheme(brandForTopicMeta(getTopicMeta()));
  };

  sync();

  const unsubTheme = subscribeTheme(sync);
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const onSystemChange = () => {
    if (document.documentElement.dataset.theme === 'system') sync();
  };
  media.addEventListener('change', onSystemChange);

  return () => {
    unsubTheme();
    media.removeEventListener('change', onSystemChange);
  };
}
