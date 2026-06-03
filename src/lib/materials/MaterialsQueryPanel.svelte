<script>
  import { onMount } from 'svelte';
  import { loadMaterialsSearchIndex, searchMaterialsCorpus, highlightMatch } from './materials-search.js';
  import { loadRagIndex, searchChunks } from '../rag-client.js';
  import { MATERIALS_INDUSTRIES } from '@materials/element-notes-data.mjs';
  import SuggestionChips from '../SuggestionChips.svelte';
  import { highlightFromRagChunk } from '../filing-open.js';
  import { useMaterialsExcerpt, payloadFromSearchChunk } from './use-materials-excerpt.js';
  import LoadingSpinner from '../LoadingSpinner.svelte';
  import * as Card from '$lib/components/ui/card/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js';
  import * as ScrollArea from '$lib/components/ui/scroll-area/index.js';
  import { cn } from '$lib/utils.js';

  /** @type {{ elements?: object[], selectedSymbol?: string | null, onElementSelect?: (s: string) => void }} */
  let { elements = [], selectedSymbol = null, onElementSelect } = $props();

  const SUGGESTIONS = [
    'NdFeB magnets',
    'dysprosium supply',
    'Mountain Pass',
    'China separation',
    'USGS mineral commodity',
    'EU critical raw materials',
    'ionic clay Myanmar',
    'magnet recycling',
  ];

  const SEC_TICKERS = ['', 'MP', 'UUUU', 'USAR', 'REEMF', 'NVDA', 'TSLA', 'INTC', 'MU', 'AMD', 'GM', 'F', 'LMT', 'RTX', 'NOC', 'GD', 'GEV', 'ENPH', 'RIVN', 'STLA', 'EMR', 'ROK', 'HON', 'PH'];
  const SOURCE_TYPES = [
    { value: '', label: 'All sources' },
    { value: 'sec', label: 'SEC 10-K' },
    { value: 'international', label: 'International filings' },
    { value: 'report', label: 'Public reports' },
    { value: 'reference', label: 'Element reference' },
  ];
  const SEARCH_MODES = [
    { value: 'materials', label: 'Materials corpus' },
    { value: 'hybrid', label: 'SEC RAG (hybrid)' },
    { value: 'both', label: 'Both' },
  ];

  let query = $state('');
  let ticker = $state('');
  let industry = $state('');
  let sourceType = $state('');
  let searchMode = $state('materials');
  let loading = $state(false);
  let indexLoading = $state(true);
  let error = $state('');
  /** @type {{ materials: object[], sec: object[], meta: object } | null} */
  let results = $state(null);
  let stats = $state(/** @type {{ materials: number, sec: number } | null} */ (null));
  let embeddingsReady = $state(false);
  let resultsEl = $state(null);

  const openExcerpt = useMaterialsExcerpt();
  const elementFilter = $derived(selectedSymbol ?? '');
  const sourceLabel = $derived(SOURCE_TYPES.find((s) => s.value === sourceType)?.label ?? 'All sources');
  const modeLabel = $derived(SEARCH_MODES.find((m) => m.value === searchMode)?.label ?? 'Both');
  const tickerLabel = $derived(ticker || 'All tickers');

  const industryLabel = $derived(industry || 'All industries');

  /** @param {object} chunk */
  function openMaterialsResult(chunk) {
    openExcerpt?.(payloadFromSearchChunk(chunk));
  }

  /** @param {object} chunk */
  function openSecResult(chunk) {
    if (!chunk?.ticker) return;
    const highlight = highlightFromRagChunk(chunk);
    openExcerpt?.({
      text: chunk.text ?? chunk.snippet ?? '',
      charStart: highlight.offset,
      charEnd: null,
      ticker: chunk.ticker,
      sourceRegime: 'US-SEC',
      title: chunk.ticker,
      subtitle: [chunk.sectionHeader ?? chunk.sectionId, chunk.form, chunk.filingDate].filter(Boolean).join(' · '),
      filingUrl: null,
    });
  }

  async function ensureSecIndex() {
    const ragIdx = await loadRagIndex().catch(() => null);
    stats = {
      materials: stats?.materials ?? 0,
      sec: ragIdx?.manifest?.chunkCount ?? 0,
    };
    embeddingsReady = ragIdx?.embeddingsReady ?? false;
    return ragIdx;
  }

  onMount(async () => {
    try {
      const materialsIdx = await loadMaterialsSearchIndex();
      stats = {
        materials: materialsIdx?.chunkCount ?? 0,
        sec: 0,
      };
      if (searchMode !== 'materials') await ensureSecIndex();
    } catch (e) {
      error = e?.message ?? 'Failed to load search indexes';
    } finally {
      indexLoading = false;
    }
  });

  let secIndexRequested = false;

  $effect(() => {
    if (indexLoading || searchMode === 'materials' || secIndexRequested) return;
    secIndexRequested = true;
    void ensureSecIndex();
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
      /** @type {object[]} */
      const materials = [];
      /** @type {object[]} */
      const sec = [];

      if (searchMode === 'materials' || searchMode === 'both') {
        materials.push(
          ...searchMaterialsCorpus(query, {
            symbol: elementFilter || null,
            industry: industry || null,
            sourceType: sourceType || null,
            ticker: ticker || null,
            limit: searchMode === 'both' ? 10 : 16,
            elements,
          }),
        );
      }

      if (searchMode === 'hybrid' || searchMode === 'both') {
        const chunks = await searchChunks(query, {
          mode: 'hybrid',
          ticker,
          limit: searchMode === 'both' ? 8 : 12,
        });
        sec.push(...chunks.map((c) => ({ ...c, _source: 'sec' })));
      }

      results = {
        materials,
        sec,
        meta: { searchMode, elementFilter, industry, sourceType },
      };
      scrollToResults();
    } catch (e) {
      error = e?.message ?? 'Search failed';
      results = null;
    } finally {
      loading = false;
    }
  }

  function sourceBadge(chunk) {
    if (chunk._source === 'sec') return 'SEC RAG';
    const labels = {
      sec: 'SEC excerpt',
      international: 'International',
      report: 'Public report',
      reference: 'Reference',
    };
    return labels[chunk.sourceType] ?? chunk.sourceType ?? 'Materials';
  }
</script>

<Card.Root class="ui-panel-fill" id="materials-search">
  <Card.Header class="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
    <div class="space-y-1">
      <Card.Title>Rare earth search</Card.Title>
      <Card.Description>
        Query miner filings, international reports, USGS/IEA publications, and element reference notes — in your browser.
      </Card.Description>
    </div>
    {#if stats && !indexLoading}
      <Badge variant="secondary" class="shrink-0">
        {stats.materials.toLocaleString()} materials · {stats.sec.toLocaleString()} SEC chunks
      </Badge>
    {/if}
  </Card.Header>

  <Card.Content class="space-y-4">
    {#if indexLoading}
      <p class="text-muted-foreground flex items-center gap-2 text-sm">
        <LoadingSpinner />
        Loading search indexes…
      </p>
    {/if}

    <div class="grid items-end gap-3 md:grid-cols-2 lg:grid-cols-4">
      <div class="space-y-2 md:col-span-2 lg:col-span-4">
        <Label for="materials-query">Query</Label>
        <Input
          id="materials-query"
          bind:value={query}
          placeholder="e.g. NdFeB magnet supply China separation"
          onkeydown={(e) => e.key === 'Enter' && runQuery()}
          disabled={indexLoading}
        />
      </div>

      <div class="space-y-2">
        <Label>Industry</Label>
        <Select.Root type="single" value={industry} onValueChange={(v) => (industry = v ?? '')} disabled={indexLoading}>
          <Select.Trigger class="w-full">{industryLabel}</Select.Trigger>
          <Select.Content>
            <Select.Item value="" label="All industries">All industries</Select.Item>
            {#each MATERIALS_INDUSTRIES as ind}
              <Select.Item value={ind} label={ind}>{ind}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>

      <div class="space-y-2">
        <Label>Source</Label>
        <Select.Root type="single" value={sourceType} onValueChange={(v) => (sourceType = v ?? '')} disabled={indexLoading}>
          <Select.Trigger class="w-full">{sourceLabel}</Select.Trigger>
          <Select.Content>
            {#each SOURCE_TYPES as st}
              <Select.Item value={st.value} label={st.label}>{st.label}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>

      <div class="space-y-2">
        <Label>SEC ticker</Label>
        <Select.Root type="single" value={ticker} onValueChange={(v) => (ticker = v ?? '')} disabled={indexLoading}>
          <Select.Trigger class="w-full">{tickerLabel}</Select.Trigger>
          <Select.Content>
            <Select.Item value="" label="All tickers">All tickers</Select.Item>
            {#each SEC_TICKERS.filter(Boolean) as t}
              <Select.Item value={t} label={t}>{t}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>

      <div class="space-y-2">
        <Label>Mode</Label>
        <Select.Root type="single" value={searchMode} onValueChange={(v) => v && (searchMode = v)} disabled={indexLoading}>
          <Select.Trigger class="w-full">{modeLabel}</Select.Trigger>
          <Select.Content>
            {#each SEARCH_MODES as mode}
              <Select.Item
                value={mode.value}
                label={mode.label}
                disabled={mode.value !== 'materials' && !stats?.sec}
              >
                {mode.label}
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
    </div>

    {#if elementFilter}
      <div class="flex flex-wrap items-center gap-2 text-sm">
        <span class="text-muted-foreground">Element filter:</span>
        <Badge variant="secondary" class="font-mono">{elementFilter}</Badge>
        <Button variant="ghost" size="sm" class="h-7 px-2 text-xs" onclick={() => onElementSelect?.('')}>
          Clear
        </Button>
      </div>
    {/if}

    <div class="flex flex-wrap gap-2">
      <Button onclick={runQuery} disabled={loading || indexLoading || !query.trim()}>
        {#if loading}<LoadingSpinner />{/if}
        Search
      </Button>
    </div>

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
          Searching…
        </p>
      {:else if results?.materials?.length || results?.sec?.length}
        {#if results.materials.length}
          <div class="border-t pt-4">
            <h3 class="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
              {results.materials.length} materials excerpt{results.materials.length === 1 ? '' : 's'}
            </h3>
            <ScrollArea.Root class="min-h-[8rem] pr-3">
              <div class="space-y-2">
                {#each results.materials as chunk (chunk.id)}
                  <button
                    type="button"
                    class={cn(
                      'hover:bg-muted/60 w-full rounded-lg border bg-card p-4 text-left text-sm transition-colors',
                      'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                    )}
                    onclick={() => openMaterialsResult(chunk)}
                    title="Open full source with excerpt highlighted"
                  >
                    <header class="mb-2 flex flex-wrap items-center gap-2 text-xs">
                      {#if chunk.symbol}
                        <Badge variant="outline" class="font-mono">{chunk.symbol}</Badge>
                      {/if}
                      {#if chunk.ticker}
                        <strong class="text-primary font-semibold">{chunk.ticker}</strong>
                      {/if}
                      <span class="text-muted-foreground">{chunk.company}</span>
                      <Badge variant="secondary" class="text-[10px]">{sourceBadge(chunk)}</Badge>
                      <span class="text-primary ml-auto text-xs font-medium underline">View in source →</span>
                    </header>
                    <p class="text-muted-foreground result-snippet m-0 leading-relaxed">
                      {@html highlightMatch(chunk.text, query)}
                    </p>
                  </button>
                {/each}
              </div>
            </ScrollArea.Root>
          </div>
        {/if}

        {#if results.sec.length}
          <div class="border-t pt-4 {results.materials.length ? 'mt-4' : ''}">
            <h3 class="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
              {results.sec.length} SEC RAG result{results.sec.length === 1 ? '' : 's'}
            </h3>
            <ScrollArea.Root class="min-h-[8rem] pr-3">
              <div class="space-y-2">
                {#each results.sec as chunk (chunk.id)}
                  <button
                    type="button"
                    class={cn(
                      'hover:bg-muted/60 w-full rounded-lg border bg-card p-4 text-left text-sm transition-colors',
                      'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                    )}
                    onclick={() => openSecResult(chunk)}
                    title="Open SEC filing at this passage"
                  >
                    <span class="mb-2 flex flex-wrap items-center gap-2 text-xs">
                      <strong class="text-primary font-semibold">{chunk.ticker}</strong>
                      <Badge variant="secondary" class="text-[10px]">{sourceBadge(chunk)}</Badge>
                      <span class="text-muted-foreground">{chunk.sectionHeader ?? chunk.sectionId}</span>
                      <span class="text-primary ml-auto font-medium underline">View in filing →</span>
                    </span>
                    <p class="text-muted-foreground result-snippet m-0 leading-relaxed">
                      {@html chunk.snippet ?? chunk.text?.slice(0, 400)}
                    </p>
                  </button>
                {/each}
              </div>
            </ScrollArea.Root>
          </div>
        {/if}
      {:else if results && query.trim()}
        <div class="bg-muted/30 text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          <strong class="text-foreground mb-2 block text-base">No results for “{query.trim()}”</strong>
          Try “Both” mode, clear industry filter, or run <code class="text-xs">npm run rag</code> to rebuild the materials index.
        </div>
      {/if}
    </div>
  </Card.Content>
</Card.Root>

<style>
  .result-snippet :global(mark) {
    background: rgba(118, 185, 0, 0.35);
    color: inherit;
    border-radius: 2px;
    padding: 0 0.1em;
  }
</style>
