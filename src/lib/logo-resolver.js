/**
 * Client logo resolver — loads manifest bundled at build time.
 */
import logoManifest from '../../data/logos/manifest.json';
import {
  TOPIC_LOGO_BY_ID,
  normalizeLogoSlug,
  logoSlugForTopic,
  logoSlugForNode,
  resolveLogoFromManifest,
  logoBadgeForSlug,
  logoMetaForSlugFromManifest,
  logoMetaForTopicFromManifest,
  logoMetaForNodeFromManifest,
  logoUrlsForSlugFromManifest,
} from './logo-resolver-core.js';

export {
  TOPIC_LOGO_BY_ID,
  normalizeLogoSlug,
  logoSlugForTopic,
  logoSlugForNode,
  logoBadgeForSlug,
};

export function resolveLogo(slug) {
  return resolveLogoFromManifest(logoManifest, slug);
}

export function logoMetaForSlug(slug, hint = null) {
  return logoMetaForSlugFromManifest(logoManifest, slug, hint);
}

export function logoMetaForTopic(topicMeta) {
  return logoMetaForTopicFromManifest(logoManifest, topicMeta);
}

export function logoMetaForNode(nodeOrName) {
  return logoMetaForNodeFromManifest(logoManifest, nodeOrName);
}

export function logoUrlsForSlug(slug) {
  return logoUrlsForSlugFromManifest(logoManifest, slug);
}
