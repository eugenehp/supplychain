<script>
  import { onMount } from 'svelte';
  import { runWhenIdle } from './performance.js';

  /** @type {{
   *   open?: boolean,
   *   ticker: string | null,
   *   highlightOffset?: number | null,
   *   highlightExcerpt?: string | null,
   *   highlightVendor?: string | null,
   *   highlightSectionId?: string | null,
   *   onclose?: () => void
   * }} */
  let {
    open = $bindable(false),
    ticker = null,
    highlightOffset = null,
    highlightExcerpt = null,
    highlightVendor = null,
    highlightSectionId = null,
    onclose,
  } = $props();

  /** @type {typeof import('./FilingViewer.svelte').default | null} */
  let Viewer = $state(null);

  async function ensureViewer() {
    if (Viewer) return Viewer;
    const mod = await import('./FilingViewer.svelte');
    Viewer = mod.default;
    return Viewer;
  }

  onMount(() => {
    runWhenIdle(() => void ensureViewer(), { timeout: 800 });
  });
</script>

{#if Viewer}
  <Viewer
    bind:open
    {ticker}
    {highlightOffset}
    {highlightExcerpt}
    {highlightVendor}
    {highlightSectionId}
    {onclose}
  />
{:else if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4"
    role="dialog"
    aria-modal="true"
    aria-busy="true"
    aria-label="Opening SEC filing"
  >
    <div class="bg-background text-foreground flex items-center gap-3 rounded-xl px-6 py-5 shadow-lg ring-1 ring-black/10">
      <span class="border-primary size-5 animate-spin rounded-full border-2 border-t-transparent" aria-hidden="true"></span>
      <span class="text-sm">Opening report…</span>
    </div>
  </div>
{/if}
