<script>
  import { tick } from 'svelte';
  import * as Dialog from '$lib/components/ui/dialog/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import LoadingSpinner from '../LoadingSpinner.svelte';
  import { loadMaterialsSource } from './materials-source.js';
  import { renderHighlightedSourceHtml } from './passage-highlight.js';

  /** @type {{
   *   open?: boolean,
   *   payload?: import('./materials-excerpt-context.js').MaterialsExcerptPayload | null,
   *   onclose?: () => void
   * }} */
  let { open = $bindable(false), payload = null, onclose } = $props();

  let loading = $state(false);
  let error = $state('');
  let sourceMeta = $state(/** @type {object | null} */ (null));
  let html = $state('');
  let scrollEl = $state(/** @type {HTMLElement | null} */ (null));
  let lastLoadKey = '';

  function payloadKey() {
    if (!payload?.text) return '';
    return [
      payload.sourceId,
      payload.charStart,
      payload.charEnd,
      payload.text.length,
      payload.text.slice(0, 48),
    ].join('|');
  }

  async function loadContent() {
    if (!open || !payload?.text) {
      html = '';
      sourceMeta = null;
      error = '';
      return;
    }

    loading = true;
    error = '';
    try {
      if (payload.sourceId) {
        const source = await loadMaterialsSource(payload.sourceId);
        if (source?.text) {
          sourceMeta = source;
          html = renderHighlightedSourceHtml(source.text, payload);
        } else {
          sourceMeta = null;
          html = renderHighlightedSourceHtml(payload.text, payload);
          error = 'Full source text is not exported yet — run npm run rag to rebuild materials sources.';
        }
      } else {
        sourceMeta = null;
        html = renderHighlightedSourceHtml(payload.text, payload);
      }
    } catch (e) {
      error = e?.message ?? 'Failed to load source text';
      html = renderHighlightedSourceHtml(payload.text, payload);
    } finally {
      loading = false;
      await tick();
      scrollEl?.querySelector('#materials-excerpt-highlight')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }

  $effect(() => {
    if (!open || !payload?.text) {
      if (!open) lastLoadKey = '';
      return;
    }
    const key = payloadKey();
    if (key === lastLoadKey && html) return;
    lastLoadKey = key;
    void loadContent();
  });

  function handleOpenChange(next) {
    if (next === open) return;
    open = next;
    if (!next) onclose?.();
  }
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
  {#if open}
  <Dialog.Content
    class="materials-excerpt-dialog z-[100] flex h-[min(88vh,920px)] max-h-[min(88vh,920px)] w-[min(96vw,820px)] max-w-[min(96vw,820px)]! flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(96vw,820px)]"
  >
    <Dialog.Header class="shrink-0 border-b px-6 py-4">
      <Dialog.Title class="text-lg leading-snug">{payload?.title ?? 'Source excerpt'}</Dialog.Title>
      {#if payload?.subtitle}
        <Dialog.Description class="text-sm">{payload.subtitle}</Dialog.Description>
      {/if}
      <div class="mt-2 flex flex-wrap items-center gap-2">
        {#if payload?.symbol}
          <Badge variant="outline" class="font-mono">{payload.symbol}</Badge>
        {/if}
        {#if sourceMeta?.sourceRegime}
          <Badge variant="secondary" class="text-[10px]">{sourceMeta.sourceRegime}</Badge>
        {/if}
        {#if sourceMeta?.textLength}
          <span class="text-muted-foreground text-xs tabular-nums"
            >{sourceMeta.textLength.toLocaleString()} chars</span
          >
        {/if}
        {#if payload?.filingUrl}
          <a
            href={payload.filingUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="text-primary ml-auto text-xs underline-offset-2 hover:underline"
          >
            Open original →
          </a>
        {/if}
      </div>
    </Dialog.Header>

    <div
      bind:this={scrollEl}
      class="materials-excerpt-body min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4"
      role="region"
      aria-label="Excerpt source text"
    >
      {#if loading}
        <p class="text-muted-foreground flex items-center gap-2 text-sm">
          <LoadingSpinner />
          Loading full source text…
        </p>
      {:else if html}
        <div class="text-foreground pr-2 text-sm">{@html html}</div>
      {:else}
        <p class="text-muted-foreground text-sm">No excerpt selected.</p>
      {/if}

      {#if error}
        <p class="text-muted-foreground mt-3 text-xs">{error}</p>
      {/if}
    </div>

    <div class="flex shrink-0 justify-end border-t px-6 py-3">
      <Button variant="outline" onclick={() => handleOpenChange(false)}>Close</Button>
    </div>
  </Dialog.Content>
  {/if}
</Dialog.Root>

<style>
  :global(.materials-excerpt-mark) {
    background: rgba(118, 185, 0, 0.38);
    color: inherit;
    border-radius: 2px;
    padding: 0 0.08em;
    box-decoration-break: clone;
  }
</style>
