/** Hosts/patterns for scraped URLs that often 404 in browsers (CDN tokens, session blobs). */
export const EPHEMERAL_SOURCE_HOSTS = [
  'cdn-api.markitdigital.com',
];

/**
 * @param {string | null | undefined} url
 */
export function isEphemeralSourceUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return EPHEMERAL_SOURCE_HOSTS.some((h) => url.includes(h));
}

/**
 * Prefer a stable registry/IR link for "Open original" when the scrape URL is ephemeral.
 * @param {string | null | undefined} sourceUrl
 * @param {Array<{ url?: string }>} [sources]
 */
export function resolvePublicLinkUrl(sourceUrl, sources = []) {
  if (sourceUrl && !isEphemeralSourceUrl(sourceUrl)) return sourceUrl;
  for (const s of sources) {
    if (s?.url && !isEphemeralSourceUrl(s.url)) return s.url;
  }
  return sourceUrl ?? null;
}
