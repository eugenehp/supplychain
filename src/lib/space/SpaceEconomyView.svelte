<script>
  import { onMount } from 'svelte';
  import LoadingSpinner from '../LoadingSpinner.svelte';
  import QueryPanel from '../QueryPanel.svelte';
  import FilingViewerHost from '../FilingViewerHost.svelte';
  import ResearchQuestionsPanel from './ResearchQuestionsPanel.svelte';
  import DeepDivePanel from './DeepDivePanel.svelte';
  import SpaceGeographyMap from './SpaceGeographyMap.svelte';
  import MetricsTable from './MetricsTable.svelte';
  import RiskDiffPanel from './RiskDiffPanel.svelte';
  import CrossTopicVendorPanel from './CrossTopicVendorPanel.svelte';
  import WordCloudPanel from './WordCloudPanel.svelte';
  import UmapScatterPanel from './UmapScatterPanel.svelte';
  import SankeyPanel from './SankeyPanel.svelte';
  import GlossaryPanel from './GlossaryPanel.svelte';
  import InsidersPanel from './InsidersPanel.svelte';
  import VendorNetworkPanel from './VendorNetworkPanel.svelte';
  import EventTimelinePanel from './EventTimelinePanel.svelte';
  import TrendsPanel from './TrendsPanel.svelte';
  import ContractsPanel from './ContractsPanel.svelte';
  import ConcentrationPanel from './ConcentrationPanel.svelte';
  import PricesPanel from './PricesPanel.svelte';
  import SbirPanel from './SbirPanel.svelte';
  import LaunchesPanel from './LaunchesPanel.svelte';
  import PatentsPanel from './PatentsPanel.svelte';
  import ComparePanel from './ComparePanel.svelte';
  import SpacePageNav from './SpacePageNav.svelte';
  import { prefetchFiling } from '../filing-cache.js';
  import { preloadFilingViewer } from '../filing-viewer-loader.js';
  import * as Card from '$lib/components/ui/card/index.js';
  import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import {
    loadSpaceEconomyIndex,
    loadSpaceEconomyRagManifest,
    loadSpaceEconomyReportsIndex,
    loadSpaceEconomySecIndex,
  } from './space-economy.js';

  let index = $state(/** @type {object | null} */ (null));
  let ragManifest = $state(/** @type {object | null} */ (null));
  let reportsIndex = $state(/** @type {object | null} */ (null));
  let secIndex = $state(/** @type {object | null} */ (null));
  let loading = $state(true);

  /** @type {{ runWithQuery: (p:{query:string,mode?:string,ticker?:string}) => void } | null} */
  let queryPanelRef = $state(null);
  let viewerOpen = $state(false);
  let viewerTicker = $state(/** @type {string | null} */ (null));
  let viewerHighlightOffset = $state(/** @type {number | null} */ (null));
  let viewerHighlightExcerpt = $state(/** @type {string | null} */ (null));
  let viewerHighlightSectionId = $state(/** @type {string | null} */ (null));

  function handleRunQuery(q, mode) {
    queryPanelRef?.runWithQuery({ query: q, mode });
    requestAnimationFrame(() => {
      document.getElementById('space-query-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function handleOpenFiling(card) {
    if (!card?.ticker) return;
    viewerTicker = card.ticker;
    viewerHighlightOffset = card.charOffset ?? card.charStart ?? null;
    viewerHighlightExcerpt = card.excerpt ?? null;
    viewerHighlightSectionId = card.sectionId ?? null;
    void preloadFilingViewer();
    prefetchFiling(card.ticker);
    viewerOpen = true;
  }

  function closeViewer() {
    viewerOpen = false;
    viewerHighlightOffset = null;
    viewerHighlightExcerpt = null;
    viewerHighlightSectionId = null;
  }

  const segments = $derived(index?.scope?.segments ?? []);
  const watchlist = $derived(index?.watchlist ?? []);
  const milestones = $derived(index?.milestones ?? []);
  const methodology = $derived(index?.methodology ?? {});
  const tickerOptions = $derived(ragManifest?.tickers ?? []);
  const queryDescription = $derived(
    ragManifest?.chunkCount
      ? 'Search ' + ragManifest.chunkCount.toLocaleString() + ' indexed chunks (SEC 10-K / 20-F + space-agency reports) entirely in your browser.'
      : '',
  );
  const SPACE_SUGGESTIONS = [
    'sole source',
    'launch vehicle',
    'propulsion',
    'satellite bus',
    'ground station',
    'constellation',
    'rare earth',
    'export control',
  ];

  /** @param {string} segmentId */
  function watchlistForSegment(segmentId) {
    return watchlist.filter((w) => w.segment === segmentId);
  }

  onMount(() => {
    Promise.all([
      loadSpaceEconomyIndex(),
      loadSpaceEconomyRagManifest(),
      loadSpaceEconomyReportsIndex(),
      loadSpaceEconomySecIndex(),
    ]).then(([idx, rag, reports, sec]) => {
      index = idx;
      ragManifest = rag;
      reportsIndex = reports;
      secIndex = sec;
      loading = false;
    });
  });
</script>

{#if loading}
  <div class="text-muted-foreground flex min-h-[40vh] flex-col items-center justify-center gap-3" aria-busy="true">
    <LoadingSpinner />
    <span class="text-sm">Loading space economy scope…</span>
  </div>
{:else if !index}
  <Alert>
    <AlertTitle>No space economy data</AlertTitle>
    <AlertDescription>
      Expected <code class="text-xs">static/space-economy/index.json</code>. Re-run the data sync to populate it.
    </AlertDescription>
  </Alert>
{:else}
  <div class="flex flex-col gap-[var(--section-gap)]">
    <section id="space-overview" class="ui-section pb-2">
      <p class="text-primary mb-3 text-xs font-semibold tracking-widest uppercase">Space economy · Preview</p>
      <h1 class="text-foreground mb-4 text-[clamp(1.75rem,3.5vw,2.35rem)] leading-tight font-bold tracking-tight">
        {index.title}
      </h1>
      <p class="text-muted-foreground max-w-[720px] text-lg leading-relaxed">{index.subtitle}</p>

      {#if ragManifest?.chunkCount}
        <div class="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" aria-label="Corpus stats">
          <div class="flex flex-col gap-0.5 rounded-lg border bg-card p-3">
            <span class="text-primary text-xl font-bold tabular-nums">{ragManifest.chunkCount.toLocaleString()}</span>
            <span class="text-muted-foreground text-[10px] uppercase tracking-wide">RAG chunks</span>
          </div>
          <div class="flex flex-col gap-0.5 rounded-lg border bg-card p-3">
            <span class="text-primary text-xl font-bold tabular-nums">{ragManifest.tickers?.length ?? 0}</span>
            <span class="text-muted-foreground text-[10px] uppercase tracking-wide">SEC filers</span>
          </div>
          <div class="flex flex-col gap-0.5 rounded-lg border bg-card p-3">
            <span class="text-primary text-xl font-bold tabular-nums">
              {reportsIndex?.reports?.filter((r) => r.chunkCount > 0).length ?? 0}
            </span>
            <span class="text-muted-foreground text-[10px] uppercase tracking-wide">Public reports</span>
          </div>
          <div class="flex flex-col gap-0.5 rounded-lg border bg-card p-3">
            <span class="text-primary text-xl font-bold tabular-nums">{ragManifest.vendorCount?.toLocaleString() ?? 0}</span>
            <span class="text-muted-foreground text-[10px] uppercase tracking-wide">Vendor mentions</span>
          </div>
          <div class="flex flex-col gap-0.5 rounded-lg border bg-card p-3">
            <span class="text-primary text-xl font-bold">
              {ragManifest.embeddingsReady ? 'Semantic on' : 'BM25 only'}
            </span>
            <span class="text-muted-foreground text-[10px] uppercase tracking-wide">Search modes</span>
          </div>
          <div class="flex flex-col gap-0.5 rounded-lg border bg-card p-3">
            <span class="text-primary text-xl font-bold tabular-nums">{watchlist.length}</span>
            <span class="text-muted-foreground text-[10px] uppercase tracking-wide">Watchlist</span>
          </div>
        </div>
      {/if}

      <Alert class="mt-5 max-w-[720px] border-amber-500/30 bg-amber-500/5">
        <AlertTitle class="text-sm font-semibold">Preview scope</AlertTitle>
        <AlertDescription class="text-sm leading-relaxed">
          {methodology.disclaimer}
        </AlertDescription>
      </Alert>
    </section>

    <SpacePageNav />

    <section id="space-segments" class="ui-section">
      <h2 class="text-foreground mb-2 text-lg font-semibold">Segments in scope</h2>
      <p class="text-muted-foreground mb-4 max-w-[720px] text-sm leading-relaxed">
        {index.scope?.summary}
      </p>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {#each segments as seg}
          <Card.Root class="hover:border-primary/30 transition-colors">
            <Card.Header class="pb-2">
              <Card.Title class="text-base">{seg.label}</Card.Title>
              <Card.Description class="text-xs">{seg.description}</Card.Description>
            </Card.Header>
            <Card.Content class="text-sm">
              <p class="text-muted-foreground m-0 leading-snug">
                <span class="text-foreground font-medium">Anchors:</span>
                {(seg.anchorCompanies ?? []).join(', ')}
              </p>
              {#if watchlistForSegment(seg.id).length}
                <div class="mt-3 flex flex-wrap gap-1.5">
                  {#each watchlistForSegment(seg.id) as w}
                    <Badge variant="secondary" class="font-mono text-[10px]">{w.ticker}</Badge>
                  {/each}
                </div>
              {/if}
            </Card.Content>
          </Card.Root>
        {/each}
      </div>
    </section>

    {#if reportsIndex?.reports?.length}
      <section id="space-reports" class="ui-section">
        <h2 class="text-foreground mb-2 text-lg font-semibold">Public reports indexed</h2>
        <p class="text-muted-foreground mb-3 max-w-[720px] text-sm leading-relaxed">
          {reportsIndex.reports.filter((r) => r.chunkCount > 0).length} of {reportsIndex.reports.length} reports
          fetched and chunked into the corpus. Browser-headed downloader with curl fallback for 403-blocked servers.
        </p>
        <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {#each reportsIndex.reports as r}
            <Card.Root class="hover:border-primary/30 transition-colors">
              <Card.Content class="space-y-1 p-3">
                <div class="flex items-center justify-between gap-2">
                  <Badge variant="outline" class="font-mono text-[10px]">{r.agency}</Badge>
                  {#if r.error}
                    <Badge variant="outline" class="text-[10px] text-amber-700">error</Badge>
                  {:else if r.skipped}
                    <Badge variant="outline" class="text-[10px] text-muted-foreground">skipped</Badge>
                  {:else}
                    <Badge variant="secondary" class="text-[10px]">{r.chunkCount} chunks</Badge>
                  {/if}
                </div>
                <div class="text-foreground text-xs font-medium leading-snug">{r.title}</div>
                {#if r.year}
                  <div class="text-muted-foreground text-[10px]">{r.year} · {r.sourceType ?? '—'}</div>
                {/if}
              </Card.Content>
            </Card.Root>
          {/each}
        </div>
      </section>
    {/if}

    {#if ragManifest?.chunkCount}
      <section id="space-metrics" class="ui-section">
        <MetricsTable onOpenFiling={handleOpenFiling} />
      </section>

      <section id="space-trends" class="ui-section">
        <TrendsPanel />
      </section>

      <section id="space-contracts" class="ui-section">
        <ContractsPanel />
      </section>

      <section id="space-compare" class="ui-section">
        <ComparePanel />
      </section>

      <section id="space-risk-diff" class="ui-section">
        <RiskDiffPanel />
      </section>

      <section id="space-cross-topic" class="ui-section">
        <CrossTopicVendorPanel />
      </section>

      <section id="space-sankey" class="ui-section">
        <SankeyPanel />
      </section>

      <section id="space-concentration" class="ui-section">
        <ConcentrationPanel />
      </section>

      <section id="space-vendor-network" class="ui-section">
        <VendorNetworkPanel />
      </section>

      <section id="space-timeline" class="ui-section">
        <EventTimelinePanel />
      </section>

      <section id="space-prices" class="ui-section">
        <PricesPanel />
      </section>

      <section id="space-launches" class="ui-section">
        <LaunchesPanel />
      </section>

      <section id="space-insiders" class="ui-section">
        <InsidersPanel />
      </section>

      <section id="space-sbir" class="ui-section">
        <SbirPanel />
      </section>

      <section id="space-patents" class="ui-section">
        <PatentsPanel />
      </section>

      <section id="space-glossary" class="ui-section">
        <GlossaryPanel onRunQuery={handleRunQuery} />
      </section>

      <section id="space-research-questions" class="ui-section">
        <ResearchQuestionsPanel onRunQuery={handleRunQuery} onOpenFiling={handleOpenFiling} />
      </section>

      <section id="space-deep-dives" class="ui-section">
        <DeepDivePanel onOpenFiling={handleOpenFiling} />
      </section>

      <section id="space-geography" class="ui-section">
        <SpaceGeographyMap />
      </section>

      <section id="space-wordcloud" class="ui-section">
        <WordCloudPanel onRunQuery={handleRunQuery} />
      </section>

      <section id="space-umap" class="ui-section">
        <UmapScatterPanel onOpenFiling={handleOpenFiling} />
      </section>

      <section id="space-query-panel" class="ui-section">
        <QueryPanel
          bind:this={queryPanelRef}
          topicId="space-economy"
          title="Space economy filing search"
          description={queryDescription}
          placeholder="e.g. sole source propulsion supplier"
          suggestions={SPACE_SUGGESTIONS}
          {tickerOptions}
        />
      </section>
    {/if}

    <FilingViewerHost
      bind:open={viewerOpen}
      ticker={viewerTicker}
      highlightOffset={viewerHighlightOffset}
      highlightExcerpt={viewerHighlightExcerpt}
      highlightSectionId={viewerHighlightSectionId}
      onclose={closeViewer}
    />

    <section id="space-watchlist" class="ui-section">
      <h2 class="text-foreground mb-2 text-lg font-semibold">SEC filing watchlist — space economy</h2>
      <p class="text-muted-foreground mb-4 max-w-[720px] text-sm leading-relaxed">
        Seed list of US SEC filers and selected international annual-report counterparts that anchor the segments above.
      </p>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {#each watchlist as company}
          <Card.Root class="hover:border-primary/30 transition-colors">
            <Card.Header class="pb-2">
              <Card.Title class="flex items-center gap-2 text-base">
                <span aria-hidden="true">{company.flag}</span>
                {company.name}
              </Card.Title>
              <Card.Description class="font-mono text-xs">
                {company.ticker} · {company.segment} · {company.filingType}
              </Card.Description>
            </Card.Header>
          </Card.Root>
        {/each}
      </div>
    </section>

    <section id="space-roadmap" class="ui-section">
      <h2 class="text-foreground mb-2 text-lg font-semibold">Roadmap</h2>
      <ul class="text-muted-foreground m-0 max-w-[720px] list-disc space-y-2 pl-5 text-sm leading-relaxed">
        {#each milestones as m}
          <li>
            <span class="text-foreground">{m.label}</span>
            <Badge variant={m.status === 'done' ? 'default' : 'outline'} class="ml-2 text-[10px] uppercase">
              {m.status}
            </Badge>
          </li>
        {/each}
      </ul>
    </section>

    <section id="space-methodology" class="ui-section pb-8">
      <h2 class="text-foreground mb-2 text-lg font-semibold">Methodology</h2>
      <ul class="text-muted-foreground m-0 max-w-[720px] list-disc space-y-2 pl-5 text-sm leading-relaxed">
        <li>{methodology.approach}</li>
        <li>{methodology.evidence}</li>
        <li>{methodology.disclaimer}</li>
      </ul>
    </section>
  </div>
{/if}
