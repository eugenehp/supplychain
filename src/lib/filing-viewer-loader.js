/** Lazy-load FilingViewer once; safe to call from search UI before first open. */

/** @type {Promise<{ default: import('svelte').Component }> | null} */
let viewerModulePromise = null;

export function preloadFilingViewer() {
  if (!viewerModulePromise) {
    viewerModulePromise = import('./FilingViewer.svelte');
  }
  return viewerModulePromise;
}
