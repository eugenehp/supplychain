export const MATERIALS_EXCERPT_KEY = Symbol('materials-excerpt');

/**
 * @typedef {object} MaterialsExcerptPayload
 * @property {string} text
 * @property {string} [symbol]
 * @property {string} [sourceId]
 * @property {string} [ticker]
 * @property {string} [sourceRegime]
 * @property {string} [title]
 * @property {string} [subtitle]
 * @property {string | null} [filingUrl]
 * @property {number | null} [charStart]
 * @property {number | null} [charEnd]
 */

/** @param {MaterialsExcerptPayload} payload */
export function isSecExcerpt(payload) {
  return payload?.sourceRegime === 'US-SEC' && Boolean(payload?.ticker);
}
