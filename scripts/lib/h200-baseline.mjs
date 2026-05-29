/** Backward-compatible re-exports — prefer importing from topics/nvidia-h200.mjs */
export { TIERS, TOPICS, getTopic, getActiveTopics, getDefaultTopicId, TIER_LABELS } from './topics/index.mjs';
export {
  TOPIC_ID,
  H200_ANNUAL_VOLUME_ESTIMATE,
  NODE_META,
  PRODUCT_NODE,
  SEC_SUPPLY_ROLES,
  MATERIALS_ALLOWLIST,
} from './topics/nvidia-h200.mjs';

export const BASE_LINKS = [];
export const SEC_WATCHLIST = ['NVDA', 'TSM', 'ASML', 'AMAT', 'LRCX', 'KLAC', 'SNPS', 'CDNS', 'MU'];
