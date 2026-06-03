/** Client loader for rare earth materials index (pipeline → data/materials/rare-earth). */

let cache = /** @type {object | null} */ (null);
let inflight = /** @type {Promise<object | null> | null} */ (null);

export async function loadRareEarthIndex() {
  if (cache) return cache;
  if (inflight) return inflight;

  inflight = fetch('/materials/rare-earth/index.json')
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      cache = data;
      inflight = null;
      return data;
    })
    .catch(() => {
      inflight = null;
      return null;
    });

  return inflight;
}

export const CATEGORY_COLORS = {
  light: 'var(--ree-light, #4ade80)',
  middle: 'var(--ree-middle, #38bdf8)',
  heavy: 'var(--ree-heavy, #a78bfa)',
  scandium: 'var(--ree-sc, #fbbf24)',
};
