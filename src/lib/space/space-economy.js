/** Client loader for the space economy index (preview scope, per-topic RAG bundle). */

let cache = /** @type {object | null} */ (null);
let inflight = /** @type {Promise<object | null> | null} */ (null);

export async function loadSpaceEconomyIndex() {
  if (cache) return cache;
  if (inflight) return inflight;

  inflight = fetch('/space-economy/index.json')
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

/** Best-effort load of the per-topic RAG manifest produced by the pipeline. */
export async function loadSpaceEconomyRagManifest() {
  try {
    const res = await fetch('/space-economy/rag/manifest.json');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Best-effort load of the per-topic public-reports index. */
export async function loadSpaceEconomyReportsIndex() {
  try {
    const res = await fetch('/space-economy/reports/index.json');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Best-effort load of the per-topic SEC filings index. */
export async function loadSpaceEconomySecIndex() {
  try {
    const res = await fetch('/space-economy/sec/index.json');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
