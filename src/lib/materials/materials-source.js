/** Lazy-load exported materials source plain text (intl + public reports). */

let manifest = /** @type {object | null} */ (null);
/** @type {Map<string, object>} */
const cache = new Map();
let manifestInflight = /** @type {Promise<object | null> | null} */ (null);

export async function loadMaterialsSourceManifest() {
  if (manifest) return manifest;
  if (manifestInflight) return manifestInflight;

  manifestInflight = fetch('/materials/rare-earth/sources/manifest.json')
    .then((r) => (r.ok ? r.json() : { sources: [] }))
    .then((data) => {
      manifest = data;
      manifestInflight = null;
      return data;
    })
    .catch(() => {
      manifestInflight = null;
      manifest = { sources: [] };
      return manifest;
    });

  return manifestInflight;
}

/** @param {string} sourceId */
export async function loadMaterialsSource(sourceId) {
  if (!sourceId) return null;
  if (cache.has(sourceId)) return cache.get(sourceId);

  const res = await fetch(`/materials/rare-earth/sources/${encodeURIComponent(sourceId)}.json`);
  if (!res.ok) return null;
  const data = await res.json();
  cache.set(sourceId, data);
  return data;
}
