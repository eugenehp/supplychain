<script>
  import FilingViewerHost from './FilingViewerHost.svelte';
  import VendorSelect from './VendorSelect.svelte';
  import SuggestionChips from './SuggestionChips.svelte';
  import LoadingSpinner from './LoadingSpinner.svelte';
  import { buildEvidenceBm25Index } from './bm25.js';
  import { loadEmbeddingIndex } from './embeddings.js';
  import { hybridSearch } from './hybrid-search.js';
  import { excerptForHighlight } from './filing-open.js';
  import { prefetchFiling } from './filing-cache.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Skeleton } from '$lib/components/ui/skeleton/index.js';
  import { cn } from '$lib/utils.js';

  /** @type {{ secFilings?: object[], graphEvidence?: object[] }} */
  let { secFilings = [], graphEvidence = [] } = $props();

  let viewerOpen = $state(false);
  let viewerTicker = $state(null);
  let highlightOffset = $state(null);
  let highlightExcerpt = $state(null);
  let highlightVendor = $state(null);
  let highlightSectionId = $state(null);
  let filterTicker = $state('all');
  let filterVendor = $state('all');
  let searchQuery = $state('');
  let searchMode = $state('hybrid');
  let visibleExcerptCount = $state(48);
  let embeddingsRequested = $state(false);

  const EXCERPT_PAGE = 48;

  const tickers = $derived([...new Set(secFilings.map((f) => f.ticker))].sort());
  const filingLabel = $derived(
    filterTicker === 'all' ? `All filings (${secFilings.length})` : filterTicker,
  );
  const modeLabel = $derived(
    ({ hybrid: 'Hybrid', exact: 'Exact match', bm25: 'Keywords (BM25)', semantic: 'Semantic' })[searchMode] ??
      'Hybrid',
  );

  let allEvidence = $state([]);
  let evidenceLoading = $state(false);
  let searchLoading = $state(false);
  /** @type {import('./bm25.js').Bm25Index | null} */
  let bm25Index = $state(null);
  /** @type {{ map: Map<string, Float32Array>, count: number, model?: string } | null} */
  let embeddingIndex = $state(null);
  let rankedEvidence = $state([]);
  let searchError = $state('');
  let evidenceLoadKey = $state('');

  const EVIDENCE_SUGGESTIONS = ['HBM', 'GaN', 'CoWoS', 'sole source', 'foundry', 'advanced packaging'];
  const SEARCH_MODES = [
    { value: 'hybrid', label: 'Hybrid' },
    { value: 'exact', label: 'Exact match' },
    { value: 'bm25', label: 'Keywords (BM25)' },
    { value: 'semantic', label: 'Semantic' },
  ];

  function parseVendors(vendorStr) {
    if (!vendorStr) return [];
    return vendorStr.split(',').map((s) => s.trim()).filter(Boolean);
  }

  const vendorOptions = $derived.by(() => {
    const set = new Set();
    for (const e of allEvidence) {
      for (const v of parseVendors(e.vendor)) set.add(v);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  });

  const baseFilteredEvidence = $derived.by(() =>
    allEvidence.filter((e) => {
      if (filterTicker !== 'all' && e.ticker !== filterTicker) return false;
      if (filterVendor !== 'all') {
        const vendors = parseVendors(e.vendor);
        if (!vendors.some((v) => v.toLowerCase() === filterVendor.toLowerCase())) return false;
      }
      return true;
    }),
  );

  const filteredEvidence = $derived(
    searchQuery.trim() ? rankedEvidence : baseFilteredEvidence.map((e) => ({ ...e, _hybridScore: null })),
  );

  const visibleEvidence = $derived(filteredEvidence.slice(0, visibleExcerptCount));
  const hiddenExcerptCount = $derived(Math.max(0, filteredEvidence.length - visibleExcerptCount));

  const searchActive = $derived(Boolean(searchQuery.trim()));
  const embeddingsReady = $derived(Boolean(embeddingIndex?.count));
  const hasActiveFilters = $derived(
    filterTicker !== 'all' || filterVendor !== 'all' || searchQuery.trim().length > 0,
  );

  function clearFilters() {
    filterTicker = 'all';
    filterVendor = 'all';
    searchQuery = '';
    searchMode = 'hybrid';
  }

  function applyEvidenceSuggestion(value) {
    searchQuery = value;
  }

  async function loadEmbeddings() {
    try {
      const res = await fetch('/sec/evidence-embeddings.json');
      if (!res.ok) return;
      embeddingIndex = loadEmbeddingIndex(await res.json());
    } catch {
      embeddingIndex = null;
    }
  }

  async function loadAllEvidence() {
    evidenceLoading = true;
    const batches = await Promise.all(
      secFilings
        .filter((filing) => filing.evidenceUrl)
        .map(async (filing) => {
          try {
            const res = await fetch(filing.evidenceUrl);
            if (!res.ok) return [];
            const data = await res.json();
            return data.entries ?? [];
          } catch {
            return [];
          }
        }),
    );
    allEvidence = batches.flat().sort((a, b) => (a.ticker ?? '').localeCompare(b.ticker ?? ''));
    bm25Index = buildEvidenceBm25Index(allEvidence);
    evidenceLoading = false;
  }

  function ensureEmbeddings() {
    if (embeddingsRequested || embeddingIndex?.count) return;
    embeddingsRequested = true;
    void loadEmbeddings();
  }

  async function runSearch(query, list) {
    if (!query || !list.length) {
      rankedEvidence = [];
      return;
    }

    searchLoading = true;
    searchError = '';

    try {
      rankedEvidence = await hybridSearch({
        query,
        items: list,
        bm25Index,
        embeddingMap: embeddingIndex?.map,
        mode: searchMode,
        bm25Min: 0.15,
        semanticMin: 0.28,
        limit: 400,
      });
      if (
        (searchMode === 'hybrid' || searchMode === 'semantic') &&
        !rankedEvidence.length &&
        bm25Index?.N
      ) {
        rankedEvidence = await hybridSearch({
          query,
          items: list,
          bm25Index,
          embeddingMap: null,
          mode: 'bm25',
          bm25Min: 0.15,
          limit: 400,
        });
      }
    } catch {
      if (bm25Index?.N) {
        rankedEvidence = await hybridSearch({
          query,
          items: list,
          bm25Index,
          embeddingMap: null,
          mode: 'bm25',
          bm25Min: 0.15,
          limit: 400,
        });
        searchError = rankedEvidence.length
          ? 'Semantic model unavailable — showing keyword matches'
          : '';
      } else {
        searchError = 'Search index not ready yet';
        rankedEvidence = [];
      }
    } finally {
      searchLoading = false;
    }
  }

  $effect(() => {
    filterTicker;
    filterVendor;
    searchQuery.trim();
    visibleExcerptCount = EXCERPT_PAGE;
  });

  $effect(() => {
    const key = secFilings.map((f) => f.ticker).sort().join(',');
    if (!key || key === evidenceLoadKey) return;
    evidenceLoadKey = key;
    void loadAllEvidence();
  });

  $effect(() => {
    const q = searchQuery.trim();
    if (!q) {
      rankedEvidence = [];
      searchLoading = false;
      searchError = '';
      return;
    }

    if (evidenceLoading || !bm25Index?.N) return;

    if ((searchMode === 'hybrid' || searchMode === 'semantic') && !embeddingsRequested) {
      ensureEmbeddings();
    }

    searchMode;
    baseFilteredEvidence;
    embeddingsReady;

    const timer = setTimeout(() => {
      void runSearch(q, baseFilteredEvidence);
    }, 350);

    return () => clearTimeout(timer);
  });

  function formatScore(score, maxScore) {
    if (maxScore && maxScore > 0) return `${Math.round((score / maxScore) * 100)}%`;
    return score.toFixed(1);
  }

  function openFiling(ticker, offset = null, excerpt = null, vendor = null, sectionId = null) {
    let resolvedOffset = offset;
    let resolvedExcerpt = excerptForHighlight(excerpt) ?? excerpt;
    let resolvedVendor = vendor;
    let resolvedSectionId = sectionId;

    if (!resolvedExcerpt && resolvedOffset == null) {
      const first =
        allEvidence.find((e) => e.ticker === ticker && e.vendor) ??
        allEvidence.find((e) => e.ticker === ticker);
      if (first) {
        resolvedOffset = first.charOffset ?? null;
        resolvedExcerpt = excerptForHighlight(first.excerpt) ?? first.excerpt ?? null;
        resolvedVendor = first.vendor ?? null;
        resolvedSectionId = first.sectionId ?? null;
      }
    }

    viewerTicker = ticker;
    highlightOffset = resolvedOffset;
    highlightExcerpt = resolvedExcerpt;
    highlightVendor = resolvedVendor;
    highlightSectionId = resolvedSectionId;
    viewerOpen = true;
  }

  function closeViewer() {
    viewerOpen = false;
    highlightOffset = null;
    highlightExcerpt = null;
    highlightVendor = null;
    highlightSectionId = null;
  }
</script>

<div class="flex min-h-0 flex-col gap-4">
  <div class="shrink-0 space-y-4">
    <div class="flex flex-wrap items-end gap-4">
      <div class="flex min-w-[160px] flex-col gap-2">
        <Label>Filing</Label>
        <Select.Root type="single" value={filterTicker} onValueChange={(v) => v && (filterTicker = v)}>
          <Select.Trigger class="w-full min-w-[160px]">{filingLabel}</Select.Trigger>
          <Select.Content>
            <Select.Item value="all" label="All filings">All filings ({secFilings.length})</Select.Item>
            {#each tickers as t}
              <Select.Item value={t} label={t}>{t}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
      <VendorSelect
        bind:value={filterVendor}
        vendors={vendorOptions}
        {secFilings}
        count={vendorOptions.length}
      />
      {#if hasActiveFilters}
        <Button variant="ghost" size="sm" onclick={clearFilters}>Clear filters</Button>
      {/if}
    </div>

    <div class="space-y-3 border-b pb-4">
      <div class="flex flex-wrap items-end gap-4">
        <div class="min-w-[min(100%,260px)] flex-1 space-y-2">
          <Label for="evidence-search">Search evidence</Label>
          <Input
            id="evidence-search"
            type="search"
            bind:value={searchQuery}
            placeholder="e.g. advanced packaging, sole source foundry, HBM supplier…"
          />
          <p class="text-muted-foreground text-xs">
            {#if embeddingsReady}
              Hybrid search — keywords + neural embeddings, runs in browser
            {:else}
              Keyword search ready · run pipeline without <code class="text-xs">--skip-embed</code> for semantic
            {/if}
          </p>
        </div>
        <div class="min-w-[150px] space-y-2">
          <Label>Mode</Label>
          <Select.Root type="single" value={searchMode} onValueChange={(v) => v && (searchMode = v)}>
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
      </div>

      <SuggestionChips suggestions={EVIDENCE_SUGGESTIONS} onselect={applyEvidenceSuggestion} label="Quick search" />

      {#if searchActive}
        <p class="text-muted-foreground flex flex-wrap items-center gap-2 text-xs" aria-live="polite">
          {#if searchLoading}
            <LoadingSpinner />
            Ranking…
            {#if searchMode === 'semantic' || searchMode === 'hybrid'}
              (first semantic search may download MiniLM ~25MB, once)
            {/if}
          {:else if searchError}
            {searchError}
          {:else if filteredEvidence.length}
            {filteredEvidence.length} excerpt{filteredEvidence.length === 1 ? '' : 's'}
            {#if searchMode === 'exact'}
              — literal match · use quotes for phrases
            {:else if searchMode === 'hybrid' && embeddingsReady}
              — fused BM25 + embedding rank
            {:else if searchMode === 'semantic'}
              — embedding similarity
            {:else}
              — BM25 keyword rank
            {/if}
          {:else if !evidenceLoading}
            No matches — try hybrid mode, exact match, or a different term
          {/if}
        </p>
      {/if}
    </div>
  </div>

  <div class="ui-card-scroll space-y-4 pr-1">
      <h3 class="text-muted-foreground flex flex-wrap items-center gap-2 text-xs font-semibold tracking-wide uppercase">
        Supply-chain excerpts ({filteredEvidence.length})
        {#if searchActive}
          <Badge variant="outline" class="normal-case">
            {searchMode === 'hybrid' ? 'hybrid rank' : searchMode === 'exact' ? 'exact' : searchMode === 'semantic' ? 'semantic' : 'BM25'}
          </Badge>
        {/if}
      </h3>

      {#if evidenceLoading}
        <div class="space-y-2" aria-hidden="true">
          {#each Array(5) as _}
            <Skeleton class="h-[4.5rem] w-full rounded-lg" />
          {/each}
        </div>
      {:else if filteredEvidence.length}
        <div class="space-y-2">
          {#each visibleEvidence as entry}
            <button
              type="button"
              class={cn(
                'hover:bg-muted/60 w-full rounded-lg border bg-card p-4 text-left text-sm transition-colors',
                'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
              )}
              onclick={() =>
                openFiling(entry.ticker, entry.charOffset, entry.excerpt, entry.vendor, entry.sectionId)}
              onmouseenter={() => prefetchFiling(entry.ticker)}
            >
              <span class="mb-2 flex flex-wrap justify-between gap-2">
                <strong class="text-primary">{entry.vendor || 'Supply chain'}</strong>
                <span class="flex flex-wrap items-center gap-1.5">
                  {#if entry._exactScore != null}
                    <Badge variant="outline" class="score-exact text-[0.65rem]" title="Exact match score">
                      {formatScore(entry._exactScore, entry._exactMax)}
                    </Badge>
                  {/if}
                  {#if entry._hybridScore != null}
                    <Badge variant="secondary" class="text-[0.65rem]" title="Hybrid RRF score">
                      {formatScore(entry._hybridScore, entry._hybridMax)}
                    </Badge>
                  {/if}
                  {#if entry._semanticScore != null}
                    <Badge variant="outline" class="score-semantic text-[0.65rem]" title="Embedding similarity">
                      {formatScore(entry._semanticScore, entry._semanticMax)}
                    </Badge>
                  {/if}
                  {#if entry._bm25Score != null}
                    <Badge variant="outline" class="text-[0.65rem]" title="BM25 keyword score">
                      {formatScore(entry._bm25Score, entry._bm25Max)}
                    </Badge>
                  {/if}
                  <span class="text-muted-foreground text-xs underline">{entry.ticker} · open passage</span>
                </span>
              </span>
              <span class="text-muted-foreground block italic leading-relaxed">"{entry.excerpt}"</span>
              {#if entry.sectionHeader}
                <span class="text-muted-foreground mt-1 block text-xs">{entry.sectionHeader.slice(0, 80)}</span>
              {/if}
            </button>
          {/each}
        </div>
        {#if hiddenExcerptCount > 0}
          <Button
            variant="outline"
            size="sm"
            class="mt-2 w-full"
            onclick={() => { visibleExcerptCount += EXCERPT_PAGE; }}
          >
            Show {Math.min(hiddenExcerptCount, EXCERPT_PAGE)} more ({hiddenExcerptCount} remaining)
          </Button>
        {/if}
      {:else if graphEvidence.length && !searchActive && filterVendor === 'all' && filterTicker === 'all'}
        <div class="space-y-2">
          {#each graphEvidence as ev}
            <button
              type="button"
              class="hover:bg-muted/60 w-full rounded-lg border bg-card p-4 text-left text-sm"
              onclick={() => openFiling(ev.ticker, ev.charOffset ?? null, ev.snippet, ev.vendor, ev.sectionId)}
              onmouseenter={() => prefetchFiling(ev.ticker)}
            >
              <span class="mb-2 flex justify-between gap-2">
                <strong class="text-primary">{ev.vendor}</strong>
                <span class="text-muted-foreground text-xs underline">{ev.ticker} · open passage</span>
              </span>
              <span class="text-muted-foreground block italic">"{ev.snippet}"</span>
            </button>
          {/each}
        </div>
      {:else}
        <div class="bg-muted/30 text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          {#if searchActive}
            <strong class="text-foreground mb-2 block">No excerpts match “{searchQuery.trim()}”</strong>
            Try hybrid mode, clear filters, or pick a suggestion above.
          {:else if hasActiveFilters}
            <strong class="text-foreground mb-2 block">No excerpts for these filters</strong>
            Broaden the filing or vendor filter, or clear filters to browse all excerpts.
          {:else}
            <strong class="text-foreground mb-2 block">No evidence loaded</strong>
            Run <code>npm run pipeline</code> to export filing excerpts to static.
          {/if}
        </div>
      {/if}
  </div>
</div>

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
  :global(.score-exact) {
    color: #e9c46a;
    border-color: color-mix(in srgb, #e9c46a 40%, transparent);
  }
  :global(.score-semantic) {
    color: #5b9bd5;
    border-color: color-mix(in srgb, #5b9bd5 40%, transparent);
  }
</style>
