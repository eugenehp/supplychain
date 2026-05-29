<script>
  import FilingViewerHost from './FilingViewerHost.svelte';
  import CompanyLogo from './CompanyLogo.svelte';
  import { prefetchFiling } from './filing-cache.js';
  import { preloadFilingViewer } from './filing-viewer-loader.js';
  import * as Card from '$lib/components/ui/card/index.js';
  import { Button } from '$lib/components/ui/button/index.js';

  /** @type {{ secFilings?: object[] }} */
  let { secFilings = [] } = $props();

  let viewerOpen = $state(false);
  let viewerTicker = $state(null);

  function openReport(ticker) {
    if (!ticker) return;
    viewerTicker = ticker;
    void preloadFilingViewer();
    prefetchFiling(ticker);
    viewerOpen = true;
  }

  function closeViewer() {
    viewerOpen = false;
    viewerTicker = null;
  }
</script>

<div class="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-[var(--stack-gap)]">
  {#each secFilings as filing (filing.ticker)}
    <Card.Root class="flex h-full flex-col">
      <Card.Header class="flex flex-row items-center gap-3 space-y-0 pb-2">
        <CompanyLogo ticker={filing.ticker} size={32} {filing} />
        <div class="min-w-0">
          <Card.Title class="text-primary text-base">{filing.ticker}</Card.Title>
          <Card.Description class="truncate">{filing.name}</Card.Description>
        </div>
      </Card.Header>
      <Card.Content class="flex flex-1 flex-col gap-3 pt-0">
        {#if filing.filing}
          <p class="text-muted-foreground text-xs">
            {filing.filing.form} · {filing.filing.filingDate}
            {#if filing.evidenceCount != null}· {filing.evidenceCount} excerpts{/if}
          </p>
        {/if}
        <div class="mt-auto flex items-center gap-3">
          <Button
            size="sm"
            onclick={() => openReport(filing.ticker)}
            onmouseenter={() => prefetchFiling(filing.ticker)}
          >
            Open in report
          </Button>
          {#if filing.filingUrl}
            <a
              href={filing.filingUrl}
              target="_blank"
              rel="noreferrer"
              class="text-muted-foreground text-xs hover:underline"
            >
              EDGAR
            </a>
          {/if}
        </div>
      </Card.Content>
    </Card.Root>
  {:else}
    <p class="text-muted-foreground col-span-full rounded-lg border border-dashed p-6 text-center text-sm">
      No SEC filings indexed for this topic.
    </p>
  {/each}
</div>

<FilingViewerHost bind:open={viewerOpen} ticker={viewerTicker} onclose={closeViewer} />
