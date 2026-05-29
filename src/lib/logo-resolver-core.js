import { brandForNode, brandForTicker, NODE_TO_TICKER } from './vendor-colors.js';

/** Topic id → logo slug when there is no SEC anchor ticker. */
export const TOPIC_LOGO_BY_ID = {
  'huawei-ascend-910c': 'HW',
  'sambanova-sn40': 'SN',
  'tenstorrent-blackhole': 'TT',
  'groq-lpu': 'GQ',
  'cerebras-wse-3': 'CB',
};

/** @param {string | null | undefined} slug */
export function normalizeLogoSlug(slug) {
  if (!slug) return null;
  return String(slug).toUpperCase();
}

/** @param {object | null | undefined} topicMeta */
export function logoSlugForTopic(topicMeta) {
  if (!topicMeta) return null;
  if (topicMeta.anchorTicker) return normalizeLogoSlug(topicMeta.anchorTicker);
  return TOPIC_LOGO_BY_ID[topicMeta.id] ?? null;
}

/** @param {{ id?: string, name?: string } | string | null | undefined} nodeOrName */
export function logoSlugForNode(nodeOrName) {
  const key = typeof nodeOrName === 'string' ? nodeOrName : nodeOrName?.id ?? nodeOrName?.name ?? '';
  if (!key) return null;
  if (NODE_TO_TICKER[key]) return NODE_TO_TICKER[key];
  const brand = brandForNode(nodeOrName);
  if (brand?.ticker) return brand.ticker.toUpperCase();
  if (TOPIC_LOGO_BY_ID[key]) return TOPIC_LOGO_BY_ID[key];
  return null;
}

/**
 * Resolve canonical logo URLs for a slug using the logo manifest.
 * @param {Record<string, { ext?: string, source?: string }>} manifest
 * @param {string | null | undefined} slug
 */
export function resolveLogoFromManifest(manifest, slug) {
  const upper = normalizeLogoSlug(slug);
  if (!upper) return null;

  const svg = `/logos/${upper}.svg`;
  const png = `/logos/${upper}.png`;
  const entry = manifest?.[upper];

  if (entry?.ext === 'png') {
    return {
      slug: upper,
      url: png,
      primaryUrl: png,
      fallbackUrl: svg,
      ext: 'png',
      source: entry.source ?? null,
    };
  }

  return {
    slug: upper,
    url: svg,
    primaryUrl: svg,
    fallbackUrl: png,
    ext: entry?.ext ?? 'svg',
    source: entry?.source ?? 'badge',
  };
}

/** @param {string | null | undefined} slug @param {{ name?: string, label?: string } | null} [hint] */
export function logoBadgeForSlug(slug, hint = null) {
  const upper = normalizeLogoSlug(slug);
  const brand = (upper && brandForTicker(upper)) ?? brandForNode({ id: hint?.label ?? hint?.name ?? upper ?? '' });
  const name = hint?.name ?? brand?.name ?? upper ?? '';
  const initials =
    brand?.initials ??
    (name
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') ||
      upper?.slice(0, 2) ||
      '?');

  return {
    name,
    initials,
    bg: brand?.bg ?? '#2a2d35',
    color: brand?.text ?? brand?.color ?? '#ffffff',
  };
}

/**
 * @param {Record<string, { ext?: string, source?: string }>} manifest
 * @param {string | null | undefined} slug
 * @param {{ name?: string, label?: string } | null} [hint]
 */
export function logoMetaForSlugFromManifest(manifest, slug, hint = null) {
  const paths = resolveLogoFromManifest(manifest, slug);
  const badge = logoBadgeForSlug(slug, hint);

  if (!paths) {
    return {
      type: 'initials',
      slug: normalizeLogoSlug(slug),
      ticker: normalizeLogoSlug(slug),
      primary: null,
      fallback: null,
      url: null,
      ...badge,
    };
  }

  return {
    type: 'image',
    slug: paths.slug,
    ticker: paths.slug,
    primary: paths.primaryUrl,
    fallback: paths.fallbackUrl,
    url: paths.url,
    source: paths.source,
    ext: paths.ext,
    ...badge,
  };
}

/** @param {Record<string, { ext?: string, source?: string }>} manifest */
export function logoMetaForTopicFromManifest(manifest, topicMeta) {
  if (!topicMeta) return null;
  const slug = logoSlugForTopic(topicMeta);
  const label = topicMeta.label ?? topicMeta.id ?? '';
  const hint = { name: topicMeta.anchorCompany ?? label, label };
  if (slug) return logoMetaForSlugFromManifest(manifest, slug, hint);
  return logoMetaForSlugFromManifest(manifest, logoSlugForNode({ id: label }), hint);
}

/** @param {Record<string, { ext?: string, source?: string }>} manifest */
export function logoMetaForNodeFromManifest(manifest, nodeOrName) {
  const key = typeof nodeOrName === 'string' ? nodeOrName : nodeOrName?.id ?? nodeOrName?.name ?? '';
  const slug = logoSlugForNode(nodeOrName);
  return logoMetaForSlugFromManifest(manifest, slug, { name: key, label: key });
}

/** @param {Record<string, { ext?: string, source?: string }>} manifest */
export function logoUrlsForSlugFromManifest(manifest, slug) {
  const r = resolveLogoFromManifest(manifest, slug);
  if (!r) return { primary: null, fallback: null, current: null, png: null, svg: null, url: null };
  return {
    png: `/logos/${r.slug}.png`,
    svg: `/logos/${r.slug}.svg`,
    primary: r.primaryUrl,
    fallback: r.fallbackUrl,
    current: r.url,
    url: r.url,
    source: r.source,
  };
}
