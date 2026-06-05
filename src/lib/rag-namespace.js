/**
 * Runtime URL namespace for per-topic RAG + SEC bundles.
 *
 * Defaults to the original accelerator layout (`/rag`, `/sec`).
 * Materials and space-economy views call setRagNamespace() so the worker,
 * filing cache, and evidence panel all retarget without per-component plumbing.
 *
 * Switching namespace clears worker/index/filing caches so we never serve
 * stale data from another topic.
 */

const DEFAULT = Object.freeze({
  id: 'accelerators',
  ragRoot: '/rag',
  secRoot: '/sec',
});

let current = { ...DEFAULT };

/** @type {Set<() => void>} */
const resetListeners = new Set();

/** Register a cleanup callback fired when the namespace changes. */
export function onRagNamespaceChange(fn) {
  resetListeners.add(fn);
  return () => resetListeners.delete(fn);
}

function notifyReset() {
  for (const fn of resetListeners) {
    try {
      fn();
    } catch {
      /* swallow — listener bugs shouldn't break switching topics */
    }
  }
}

/**
 * @param {'accelerators'|'space-economy'|string} id
 * @param {{ ragRoot?: string, secRoot?: string }} [overrides]
 */
export function setRagNamespace(id, overrides = {}) {
  if (!id) return;
  const next = id === 'accelerators'
    ? { ...DEFAULT, ...overrides }
    : {
        id,
        ragRoot: overrides.ragRoot ?? `/${id}/rag`,
        secRoot: overrides.secRoot ?? `/${id}/sec`,
      };
  if (
    next.id === current.id &&
    next.ragRoot === current.ragRoot &&
    next.secRoot === current.secRoot
  ) {
    return;
  }
  current = next;
  notifyReset();
}

export function resetRagNamespace() {
  setRagNamespace('accelerators');
}

export function getRagNamespace() {
  return current;
}

export function getRagRoot() {
  return current.ragRoot;
}

export function getSecRoot() {
  return current.secRoot;
}
