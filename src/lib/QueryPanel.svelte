<script>
  import { onMount } from 'svelte';
  import { loadRagIndex, searchChunks, searchVendors, extractVendorsFromChunks } from './rag-client.js';
  import SuggestionChips from './SuggestionChips.svelte';
  import FilingViewerHost from './FilingViewerHost.svelte';
  import { excerptForHighlight, highlightFromRagChunk } from './filing-open.js';
  import { prefetchFiling } from './filing-cache.js';
  import { preloadFilingViewer } from './filing-viewer-loader.js';
  import LoadingSpinner from './LoadingSpinner.svelte';
  import * as Card from '$lib/components/ui/card/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js';
  import * as ScrollArea from '$lib/components/ui/scroll-area/index.js';
  import { cn } from '$lib/utils.js';

  /** @type {{ topicId?: string }} */
  let { topicId = 'nvidia-h200' } = $props();

  const SUGGESTIONS = ['HBM', 'GaN', 'CoWoS TSMC', 'sole source', 'EUV lithography', 'advanced packaging'];
  const TICKERS = ['', 'NVDA', 'TSM', 'ASML', 'AMAT', 'LRCX', 'KLAC', 'SNPS', 'CDNS', 'MU'];
  const SEARCH_MODES = [
    { value: 'hybrid', label: 'Hybrid' },
    { value: 'exact', label: 'Exact match' },
    { value: 'bm25', label: 'Keywords' },
    { value: 'semantic', label: 'Semantic' },
  ];

  let query = $state('');
  let ticker = $state('');
  let searchMode = $state('hybrid');
  let loading = $state(false);
  let indexLoading = $state(true);
  let error = $state('');
  let results = $state(null);
  let stats = $state(null);
  let embeddingsReady = $state(false);
  let resultsEl = $state(null);
  let viewerOpen = $state(false);
  let viewerTicker = $state(null);
  let highlightOffset = $state(null);
  let highlightExcerpt = $state(null);
  let highlightVendor = $state(null);
  let highlightSectionId = $state(null);

  const tickerLabel = $derived(ticker ? ticker : 'All tickers');
  const modeLabel = $derived(SEARCH_MODES.find((m) => m.value === searchMode)?.label ?? 'Hybrid');

  function openFilingFromChunk(chunk) {
    if (!chunk?.ticker) return;
    const highlight = highlightFromRagChunk(chunk);
    viewerTicker = chunk.ticker;
    highlightOffset = highlight.offset;
    highlightExcerpt = highlight.excerpt;
    highlightVendor = null;
    highlightSectionId = highlight.sectionId;
    void preloadFilingViewer();
    prefetchFiling(chunk.ticker);
    viewerOpen = true;
  }

  function openFilingFromVendor(v) {
    if (!v?.ticker) return;
    viewerTicker = v.ticker;
    highlightOffset = null;
    highlightExcerpt = excerptForHighlight(v.snippets?.[0]) ?? null;
    highlightVendor = v.name ?? null;
    highlightSectionId = null;
    viewerOpen = true;
  }

  function closeViewer() {
    viewerOpen = false;
    highlightOffset = null;
    highlightExcerpt = null;
    highlightVendor = null;
    highlightSectionId = null;
  }

  onMount(async () => {
    void preloadFilingViewer();
    try {
      const index = await loadRagIndex();
      stats = {
        documents: index.manifest.chunkCount,
        vendors: index.manifest.vendorCount,
        tickers: index.manifest.tickers,
      };
      embeddingsReady = index.embeddingsReady;
    } catch (e) {
      error = e.message;
    } finally {
      indexLoading = false;
    }
  });

  function applySuggestion(value) {
    query = value;
    void runQuery();
  }

  function scrollToResults() {
    requestAnimationFrame(() => {
      resultsEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  async function runQuery() {
    if (!query.trim()) return;
    loading = true;
    error = '';
    try {
      const chunks = await searchChunks(query, {
        mode: searchMode,
        ticker,
        limit: 12,
      });
      results = {
        chunks,
        extracted: { vendors: extractVendorsFromChunks(chunks) },
        meta: { ranker: searchMode, inBrowser: true },
      };
      scrollToResults();
    } catch (e) {
      error = e.message ?? 'Search failed';
      results = null;
    } finally {
      loading = false;
    }
  }

  async function runVendorSearch() {
    if (!query.trim()) return;
    loading = true;
    error = '';
    try {
      const vendors = await searchVendors(query, { limit: 15 });
      results = { vendors, meta: { ranker: 'bm25', inBrowser: true } };
      scrollToResults();
    } catch (e) {
      error = e.message ?? 'Vendor search failed';
      results = null;
    } finally {
      loading = false;
    }
  }

  const modeHint = $derived(
    searchMode === 'exact'
      ? 'Literal match — use quotes for exact phrases'
      : searchMode === 'hybrid'
        ? 'Combines keywords + semantic similarity'
        : searchMode === 'semantic'
          ? 'Meaning-based — first query may download MiniLM (~25MB once)'
          : 'Keyword ranking (BM25)',
  );
</script>

<Card.Root class="ui-panel-fill">
  <Card.Header class="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
    <div class="space-y-1">
      <Card.Title>SEC filing search</Card.Title>
      <Card.Description>
        Search {stats?.documents?.toLocaleString() ?? '…'} indexed chunks entirely in your browser.
      </Card.Description>
    </div>
    {#if stats && !indexLoading}
      <Badge variant="secondary" class="shrink-0">
        {stats.tickers?.length ?? 0} tickers
        {#if embeddingsReady}· semantic on{/if}
      </Badge>
    {/if}
  </Card.Header>

  <Card.Content class="space-y-4">
    {#if indexLoading}
      <p class="text-muted-foreground flex items-center gap-2 text-sm">
        <LoadingSpinner />
        Loading search index…
      </p>
    {/if}

    <div class="grid items-end gap-3 md:grid-cols-[1fr_130px_130px_auto]">
      <div class="space-y-2 md:col-span-1">
        <Label for="rag-query">Query</Label>
        <Input
          id="rag-query"
          bind:value={query}
          placeholder="e.g. CoWoS TSMC single source supplier"
          onkeydown={(e) => e.key === 'Enter' && runQuery()}
          disabled={indexLoading}
        />
      </div>

      <div class="space-y-2">
        <Label>Ticker</Label>
        <Select.Root type="single" value={ticker} onValueChange={(v) => (ticker = v ?? '')} disabled={indexLoading}>
          <Select.Trigger class="w-full">
            {tickerLabel}
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="" label="All tickers">All tickers</Select.Item>
            {#each TICKERS.filter(Boolean) as t}
              <Select.Item value={t} label={t}>{t}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>

      <div class="space-y-2">
        <Label>Mode</Label>
        <Select.Root
          type="single"
          value={searchMode}
          onValueChange={(v) => v && (searchMode = v)}
          disabled={indexLoading}
        >
          <Select.Trigger class="w-full">{modeLabel}</Select.Trigger>
          <Select.Content>
            {#each SEARCH_MODES as mode}
              <Select.Item
                value={mode.value}
                label={mode.label}
                disabled={mode.value === 'semantic' && !embeddingsReady}
              >
                {mode.label}
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>

      <div class="flex flex-wrap gap-2 md:col-span-1">
        <Button onclick={runQuery} disabled={loading || indexLoading || !query.trim()}>
          {#if loading}<LoadingSpinner />{/if}
          Search
        </Button>
        <Button variant="outline" onclick={runVendorSearch} disabled={loading || indexLoading || !query.trim()}>
          Find vendors
        </Button>
      </div>
    </div>

    <p class="text-muted-foreground text-xs">{modeHint}</p>

    <SuggestionChips suggestions={SUGGESTIONS} onselect={applySuggestion} />

    {#if error}
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    {/if}

    <div bind:this={resultsEl}>
      {#if loading}
        <p class="text-muted-foreground flex items-center gap-2 text-sm">
          <LoadingSpinner />
          Searching filings…
        </p>
      {:else if results?.chunks?.length}
        <div class="border-t pt-4">
          <h3 class="text-muted-foreground mb-3 flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
            {results.chunks.length} matching chunk{results.chunks.length === 1 ? '' : 's'}
            <Badge variant="outline" class="text-[0.65rem] normal-case">{results.meta?.ranker}</Badge>
          </h3>
          <ScrollArea.Root class="min-h-[10rem] pr-3">
            <div class="space-y-2">
              {#each results.chunks as chunk (chunk.id)}
                <button
                  type="button"
                  class={cn(
                    'hover:bg-muted/60 w-full rounded-lg border bg-card p-4 text-left text-sm transition-colors',
                    'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                  )}
                  onclick={() => openFilingFromChunk(chunk)}
                  onmouseenter={() => prefetchFiling(chunk.ticker)}
                  title="Open filing at this passage"
                >
                  <span class="mb-2 flex flex-wrap items-center gap-2 text-xs">
                    <strong class="text-primary font-semibold">{chunk.ticker}</strong>
                    <span class="text-muted-foreground">{chunk.sectionHeader ?? chunk.sectionId}</span>
                    <span class="text-muted-foreground">{chunk.form} · {chunk.filingDate}</span>
                    <span class="text-primary ml-auto text-xs font-medium underline">Open in report →</span>
                  </span>
                  <p class="text-muted-foreground result-snippet m-0 leading-relaxed">
                    {@html chunk.snippet ?? chunk.text?.slice(0, 400)}
                  </p>
                </button>
              {/each}
            </div>
          </ScrollArea.Root>
        </div>
      {:else if results?.vendors?.length}
        <div class="border-t pt-4">
          <h3 class="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
            {results.vendors.length} vendors discovered
          </h3>
          <ScrollArea.Root class="min-h-[10rem] pr-3">
            <div class="space-y-2">
              {#each results.vendors as v (`${v.name}|${v.ticker}`)}
                <button
                  type="button"
                  class="hover:bg-muted/60 w-full rounded-lg border bg-card p-4 text-left text-sm transition-colors"
                  onclick={() => openFilingFromVendor(v)}
                  onmouseenter={() => prefetchFiling(v.ticker)}
                  title="Open filing and highlight vendor mentions"
                >
                  <span class="mb-2 flex w-full flex-wrap items-center gap-2 text-xs">
                    <strong class="text-primary font-semibold">{v.name}</strong>
                    <span class="text-muted-foreground">{v.ticker} · score {Math.round(v.score ?? v.mentionCount ?? 0)}</span>
                    <span class="text-primary ml-auto font-medium underline">Open in report →</span>
                  </span>
                  {#if v.snippets?.[0]}
                    <p class="text-muted-foreground m-0 leading-relaxed">{v.snippets[0]}</p>
                  {/if}
                </button>
              {/each}
            </div>
          </ScrollArea.Root>
        </div>
      {:else if results && query.trim()}
        <div class="bg-muted/30 text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          <strong class="text-foreground mb-2 block text-base">No results for “{query.trim()}”</strong>
          Try hybrid mode, a ticker filter, or a shorter phrase. See abbreviations below for term ideas.
        </div>
      {/if}

      {#if results?.extracted?.vendors?.length}
        <div class="border-t pt-4">
          <h3 class="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">Terms in top results</h3>
          <div class="flex flex-wrap gap-2">
            {#each results.extracted.vendors as v}
              <Badge variant="secondary">{v.name} ({v.count})</Badge>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </Card.Content>
</Card.Root>

<FilingViewerHost
  bind:open={viewerOpen}
  ticker={viewerTicker}
  {highlightOffset}
  {highlightExcerpt}
  {highlightVendor}
  {highlightSectionId}
  onclose={closeViewer}
/>

<style>
  .result-snippet :global(mark) {
    background: rgba(118, 185, 0, 0.35);
    color: inherit;
    border-radius: 2px;
    padding: 0 0.1em;
  }
</style>
