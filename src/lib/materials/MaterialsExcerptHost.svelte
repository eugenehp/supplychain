<script>
  import { setContext } from 'svelte';
  import MaterialsExcerptDialog from './MaterialsExcerptDialog.svelte';
  import FilingViewerHost from '../FilingViewerHost.svelte';
  import { excerptForHighlight } from '../filing-open.js';
  import { prefetchFiling } from '../filing-cache.js';
  import { preloadFilingViewer } from '../filing-viewer-loader.js';
  import { MATERIALS_EXCERPT_KEY, isSecExcerpt } from './materials-excerpt-context.js';

  /** @type {{ children?: import('svelte').Snippet }} */
  let { children } = $props();

  let dialogOpen = $state(false);
  /** @type {import('./materials-excerpt-context.js').MaterialsExcerptPayload | null} */
  let dialogPayload = $state(null);

  let viewerOpen = $state(false);
  let viewerTicker = $state(/** @type {string | null} */ (null));
  let highlightOffset = $state(/** @type {number | null} */ (null));
  let highlightExcerpt = $state(/** @type {string | null} */ (null));
  let highlightSectionId = $state(/** @type {string | null} */ (null));

  /** @param {import('./materials-excerpt-context.js').MaterialsExcerptPayload} payload */
  function openMaterialsExcerpt(payload) {
    if (!payload?.text) return;

    if (isSecExcerpt(payload)) {
      viewerTicker = payload.ticker ?? null;
      highlightOffset = payload.charStart ?? null;
      highlightExcerpt = excerptForHighlight(payload.text, 600);
      highlightSectionId = null;
      void preloadFilingViewer();
      if (payload.ticker) prefetchFiling(payload.ticker);
      viewerOpen = true;
      return;
    }

    dialogPayload = payload;
    dialogOpen = true;
  }

  setContext(MATERIALS_EXCERPT_KEY, openMaterialsExcerpt);

  function closeDialog() {
    dialogOpen = false;
    dialogPayload = null;
  }

  function closeViewer() {
    viewerOpen = false;
    highlightOffset = null;
    highlightExcerpt = null;
    highlightSectionId = null;
  }
</script>

{@render children?.()}

<MaterialsExcerptDialog bind:open={dialogOpen} payload={dialogPayload} onclose={closeDialog} />

<FilingViewerHost
  bind:open={viewerOpen}
  ticker={viewerTicker}
  {highlightOffset}
  {highlightExcerpt}
  highlightVendor={null}
  {highlightSectionId}
  onclose={closeViewer}
/>
