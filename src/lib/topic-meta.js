import { geoLabelForNode } from './vendor-geography.js';
import { logoMetaForTopic, TOPIC_LOGO_BY_ID } from './logo-resolver.js';

export { TOPIC_LOGO_BY_ID };

/** ISO country for the topic anchor (company HQ / product jurisdiction). */
export function topicAnchorCountry(topicMeta) {
  if (topicMeta?.anchorCountry) return topicMeta.anchorCountry;
  if (topicMeta?.productNode) {
    return geoLabelForNode({ id: topicMeta.productNode })?.code ?? null;
  }
  return null;
}

/** @param {object | null | undefined} topicMeta */
export function topicCountryDisplay(topicMeta) {
  const code = topicAnchorCountry(topicMeta);
  if (!code) return null;
  return geoLabelForNode({ country: code });
}

/** @param {object | null | undefined} topicMeta @param {object[]} [_filings] */
export function topicLogoMeta(topicMeta, _filings = []) {
  return logoMetaForTopic(topicMeta);
}
