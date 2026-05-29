<script>
  import LazyChart from './LazyChart.svelte';
  import SankeyTierControls from './SankeyTierControls.svelte';
  import LazyInView from './LazyInView.svelte';
  import QueryPanel from './QueryPanel.svelte';
  import FilingEvidencePanel from './FilingEvidencePanel.svelte';
  import FilingReportsPanel from './FilingReportsPanel.svelte';
  import SourcesPanel from './SourcesPanel.svelte';
  import AbbreviationsPanel from './AbbreviationsPanel.svelte';
  import LimitedTopicsCards from './LimitedTopicsCards.svelte';
  import TopicSimilarityPanel from './TopicSimilarityPanel.svelte';
  import PageNav from './PageNav.svelte';
  import ChartExportButton from './ChartExportButton.svelte';
  import { buildExportWatermark } from './watermark.ts';
  import { GROUP_LEGEND, TIER_LABELS } from './topics.js';
  import { GROUP_COLORS } from './vendor-colors.js';
  import { MAX_SANKEY_TIER, filterSankeyByMaxTier, clampSankeyTier } from './sankey-data.js';
  import { countriesInGraph } from './vendor-geography.js';
  import { topicCountryDisplay } from './topic-meta.js';
  import TopicLogo from './TopicLogo.svelte';
  import { untrack } from 'svelte';
  import * as Card from '$lib/components/ui/card/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
  import { cn } from '$lib/utils.js';

  /** @type {{ data: object, topicMeta: object }} */
  let { data, topicMeta } = $props();

  let sankeyMaxTier = $state(MAX_SANKEY_TIER);
  let highlightCountry = $state(/** @type {string | null} */ (null));
  let chartView = $state(/** @type {'sankey' | 'world' | 'pack' | 'radial'} */ ('sankey'));
  /** @type {HTMLDivElement | undefined} */
  let chartExportTarget = $state();

  const CHART_VIEWS = [
    { id: 'sankey', label: 'Sankey diagram' },
    { id: 'world', label: 'World map' },
    { id: 'pack', label: 'Circle pack' },
    { id: 'radial', label: 'Radial tree' },
  ];

  const summary = $derived(data?.summary ?? {});
  const methodology = $derived(data?.methodology ?? {});
  const secFilings = $derived(data?.secFilings ?? data?.secEvidence ?? []);
  const graph = $derived(data?.graph ?? {});
  const visibleNodes = $derived(filterSankeyByMaxTier(data, clampSankeyTier(sankeyMaxTier)).nodes ?? []);
  const geoLegend = $derived(countriesInGraph(visibleNodes));
  const exportTitle = $derived(topicMeta?.label ?? data?.topicLabel ?? 'Supply chain');
  const isLimitedTopic = $derived(topicMeta?.status === 'limited' || data?.disclosureLevel === 'limited');
  const disclosureNote = $derived(
    topicMeta?.disclosureNote ?? data?.disclosureNote ?? methodology?.disclosureNote ?? null,
  );
  const activeViewLabel = $derived(
    CHART_VIEWS.find((v) => v.id === chartView)?.label ?? 'Chart',
  );
  const topicGeo = $derived(topicCountryDisplay(topicMeta));

  $effect(() => {
    const country = highlightCountry;
    if (!country) return;
    const visible = geoLegend.some((g) => g.code === country);
    if (!visible) {
      untrack(() => {
        highlightCountry = null;
      });
    }
  });
</script>

{#if data}
  <div class="flex flex-col gap-[var(--section-gap)]">
    <section id="overview" class="ui-section pb-2">
      <p class="text-primary mb-3 text-xs font-semibold tracking-widest uppercase">
        {topicMeta?.category ?? 'Semiconductor supply chain'}
      </p>
      <h1 class="text-foreground mb-4 flex flex-wrap items-center gap-3 text-[clamp(1.75rem,3.5vw,2.35rem)] leading-tight font-bold tracking-tight">
        <TopicLogo {topicMeta} filings={secFilings} size={48} />
        {#if topicGeo?.flag}
          <span
            class="text-[0.85em] leading-none"
            role="img"
            aria-label={topicGeo.name}
            title={topicGeo.name}
          >{topicGeo.flag}</span>
        {/if}
        <span>{topicMeta?.label ?? data.topicLabel}</span>
      </h1>
      <p class="text-muted-foreground max-w-[720px] text-lg leading-relaxed">
        {topicMeta?.subtitle ?? 'SEC-grounded reverse trace across six tiers of suppliers and equipment.'}
      </p>
      {#if isLimitedTopic}
        <Alert class="mt-5 max-w-[720px] border-amber-500/30 bg-amber-500/5">
          <AlertTitle class="text-sm font-semibold">Limited SEC disclosure</AlertTitle>
          <AlertDescription class="text-sm leading-relaxed">
            {disclosureNote ??
              'Chip-level supplier flows are industry-modeled. Anchor company filings lack product-level BOM detail.'}
          </AlertDescription>
        </Alert>
      {/if}
    </section>

    <PageNav />

    <section
      id="overview-stats"
      class="ui-section grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] items-stretch gap-[var(--stack-gap)]"
      aria-label="Key metrics"
    >
      {#if summary.totalBomPerChip}
        <Card.Root class="hover:border-primary/30 transition-colors hover:-translate-y-px">
          <Card.Content class="flex min-h-stat flex-col justify-center pt-6">
            <span class="text-primary text-[clamp(1.35rem,2.5vw,1.75rem)] font-bold tracking-tight">${summary.totalBomPerChip}</span>
            <span class="text-muted-foreground mt-2 block text-xs leading-snug">Material BOM / chip</span>
          </Card.Content>
        </Card.Root>
      {/if}
      {#if summary.hbmTotalPerChip}
        <Card.Root class="hover:border-primary/30 transition-colors hover:-translate-y-px">
          <Card.Content class="flex min-h-stat flex-col justify-center pt-6">
            <span class="text-primary text-[clamp(1.35rem,2.5vw,1.75rem)] font-bold tracking-tight">${summary.hbmTotalPerChip}</span>
            <span class="text-muted-foreground mt-2 block text-xs leading-snug">HBM total / chip</span>
          </Card.Content>
        </Card.Root>
      {/if}
      {#if summary.tsmcVsHynixRatio}
        <Card.Root class="hover:border-primary/30 transition-colors hover:-translate-y-px">
          <Card.Content class="flex min-h-stat flex-col justify-center pt-6">
            <span class="text-primary text-[clamp(1.35rem,2.5vw,1.75rem)] font-bold tracking-tight">{summary.tsmcVsHynixRatio}×</span>
            <span class="text-muted-foreground mt-2 block text-xs leading-snug">TSMC vs SK Hynix spend</span>
          </Card.Content>
        </Card.Root>
      {/if}
      <Card.Root class="hover:border-primary/30 transition-colors hover:-translate-y-px">
        <Card.Content class="flex min-h-stat flex-col justify-center pt-6">
          <span class="text-primary text-[clamp(1.35rem,2.5vw,1.75rem)] font-bold tracking-tight">{summary.graphNodes ?? data.nodes?.length ?? 0}</span>
          <span class="text-muted-foreground mt-2 block text-xs leading-snug">Vendors mapped</span>
        </Card.Content>
      </Card.Root>
      <Card.Root class="hover:border-primary/30 transition-colors hover:-translate-y-px">
        <Card.Content class="flex min-h-stat flex-col justify-center pt-6">
          <span class="text-primary text-[clamp(1.35rem,2.5vw,1.75rem)] font-bold tracking-tight">{data.links?.length ?? 0}</span>
          <span class="text-muted-foreground mt-2 block text-xs leading-snug">Supply links</span>
        </Card.Content>
      </Card.Root>
      <Card.Root class="hover:border-primary/30 transition-colors hover:-translate-y-px">
        <Card.Content class="flex min-h-stat flex-col justify-center pt-6">
          <span class="text-primary text-[clamp(1.35rem,2.5vw,1.75rem)] font-bold tracking-tight">{secFilings.length}</span>
          <span class="text-muted-foreground mt-2 block text-xs leading-snug">SEC filings indexed</span>
        </Card.Content>
      </Card.Root>
    </section>

    <section id="search" class="ui-section">
      <LazyInView minHeight="14rem">
        <QueryPanel topicId={topicMeta?.id} />
      </LazyInView>
    </section>

    <section id="sankey" class="ui-section chart-section rounded-xl border p-[var(--card-padding)]">
      <div class="mb-[var(--block-gap)] flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 class="text-foreground mb-2 text-lg font-bold">Interactive supply map</h2>
          <p class="text-muted-foreground max-w-[640px] text-sm leading-relaxed">
            {#if chartView === 'sankey'}
              Sankey tiers with $/chip on links and ↓in ↑out on each node — click a country below to highlight.
            {:else if chartView === 'world'}
              World map — each arc is a company link; labels and table show full names with $/chip.
            {:else if chartView === 'pack'}
              Circle pack — nested tiers; circle area is $/chip spend. Hover a company for in/out arrows and linked $ flows.
            {:else}
              Radial tree — product at center; branches trace supplier → customer links. Hover to highlight the chain and see $ flows.
            {/if}
          </p>
        </div>
        <div class="flex shrink-0 flex-col items-end gap-3">
          <ChartExportButton
            target={chartExportTarget}
            title={exportTitle}
            viewLabel={activeViewLabel}
            watermark={buildExportWatermark(exportTitle)}
          />
          <div class="flex flex-col items-end gap-1">
            <Label for="chart-view-select" class="text-muted-foreground text-xs uppercase">View</Label>
            <Select.Root
              type="single"
              value={chartView}
              onValueChange={(v) => v && (chartView = /** @type {typeof chartView} */ (v))}
            >
              <Select.Trigger id="chart-view-select" class="min-w-[11.5rem]" aria-label="Chart view">
                {activeViewLabel}
              </Select.Trigger>
              <Select.Content>
                {#each CHART_VIEWS as view (view.id)}
                  <Select.Item value={view.id} label={view.label}>{view.label}</Select.Item>
                {/each}
              </Select.Content>
            </Select.Root>
          </div>
        </div>
      </div>
      <div class="flex flex-col gap-[var(--stack-gap)]">
        <SankeyTierControls bind:maxTier={sankeyMaxTier} />
        <div class="chart-export-target w-full min-w-0 overflow-visible rounded-lg" bind:this={chartExportTarget}>
          <LazyChart
            view={chartView}
            {data}
            maxTier={sankeyMaxTier}
            tierLabels={TIER_LABELS}
            {secFilings}
            {highlightCountry}
          />
        </div>
      </div>
      {#if chartView === 'sankey' || chartView === 'pack' || chartView === 'radial'}
        <div class="legend mt-[var(--block-gap)] flex flex-wrap justify-center gap-x-5 gap-y-3 border-t pt-4" aria-label="Node categories">
          {#each GROUP_LEGEND as item}
            <span
              class="legend-item text-muted-foreground relative pl-4 text-xs"
              data-group={item.key}
              style:--legend-color={item.key === 'product' ? 'var(--brand-color, var(--accent))' : (GROUP_COLORS[item.key] ?? GROUP_COLORS.other)}
            >{item.label}</span>
          {/each}
        </div>
      {/if}
      {#if geoLegend.length}
        <div class="mt-[var(--stack-gap)] flex flex-wrap justify-center gap-2 border-t pt-4" aria-label="Highlight by country">
          <span class="text-muted-foreground mb-1 w-full text-center text-[0.68rem] font-semibold tracking-wide uppercase">
            Highlight by country
          </span>
          <Button
            variant={!highlightCountry ? 'default' : 'outline'}
            size="sm"
            class="rounded-full"
            onclick={() => { highlightCountry = null; }}
          >
            All
          </Button>
          {#each geoLegend as geo (geo.code)}
            <Button
              variant={highlightCountry === geo.code ? 'default' : 'outline'}
              size="sm"
              class="rounded-full"
              aria-pressed={highlightCountry === geo.code}
              onclick={() => { highlightCountry = highlightCountry === geo.code ? null : geo.code; }}
            >
              {geo.flag} {geo.name}
            </Button>
          {/each}
        </div>
      {/if}
    </section>

    <section
      id="panels"
      class="ui-section bottom-panels grid grid-cols-1 items-start gap-[var(--section-gap)] lg:grid-cols-[1.65fr_1fr]"
    >
      <div class="flex min-w-0 flex-col gap-[var(--block-gap)]">
        <Card.Root id="sec-evidence" class="flex min-w-0 flex-col">
          <Card.Header class="shrink-0">
            <Card.Title>SEC filing evidence</Card.Title>
            <Card.Description>Search excerpts, filter by vendor, and open full filings in-page with highlights.</Card.Description>
          </Card.Header>
          <Card.Content class="min-h-0 pt-0">
            <LazyInView minHeight="18rem">
              <FilingEvidencePanel secFilings={secFilings} graphEvidence={graph.evidence ?? []} />
            </LazyInView>
          </Card.Content>
        </Card.Root>

        <Card.Root id="sec-reports" class="flex min-w-0 flex-col">
          <Card.Header class="shrink-0">
            <Card.Title>SEC reports</Card.Title>
            <Card.Description>
              Full 10-K / 20-F filings indexed for this topic — open in-page with search highlights or view on EDGAR.
            </Card.Description>
          </Card.Header>
          <Card.Content class="min-h-0 pt-0">
            <LazyInView minHeight="10rem">
              <FilingReportsPanel {secFilings} />
            </LazyInView>
          </Card.Content>
        </Card.Root>
      </div>

      <div id="reference" class="flex flex-col gap-[var(--block-gap)]">
        <Card.Root class="shrink-0">
          <Card.Header>
            <Card.Title>Methodology</Card.Title>
          </Card.Header>
          <Card.Content class="text-muted-foreground space-y-2 pt-0 text-sm leading-relaxed">
            <ul class="list-disc space-y-2 pl-5">
              <li><strong class="text-foreground">Approach:</strong> {methodology.approach}</li>
              <li><strong class="text-foreground">Metric:</strong> {methodology.linkMetric}</li>
              {#if methodology.tiers}<li><strong class="text-foreground">Tiers:</strong> {methodology.tiers}</li>{/if}
              <li><strong class="text-foreground">Normalization:</strong> {methodology.normalization}</li>
              {#if methodology.edaRouting}<li><strong class="text-foreground">EDA:</strong> {methodology.edaRouting}</li>{/if}
              {#if methodology.assemblyRouting}<li><strong class="text-foreground">Assembly:</strong> {methodology.assemblyRouting}</li>{/if}
            </ul>
            {#if methodology.sources?.length}
              <h3 class="text-muted-foreground mt-5 mb-2 text-xs font-semibold tracking-wide uppercase">Sources</h3>
              <p class="text-muted-foreground mb-4 text-sm">Every citation links to a public page so you can validate independently.</p>
              <SourcesPanel sources={methodology.sources} />
            {/if}
          </Card.Content>
        </Card.Root>

        <LazyInView minHeight="16rem">
          <AbbreviationsPanel />
        </LazyInView>
      </div>
    </section>

    <LimitedTopicsCards currentTopicId={topicMeta?.id} />

    <TopicSimilarityPanel topicId={topicMeta?.id ?? data.topicId} {topicMeta} {data} />
  </div>
{:else}
  <div class="bg-muted/30 text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
    <strong class="text-foreground mb-2 block text-base">No research data loaded</strong>
    Run <code>npm run pipeline</code> to build SEC indexes and supply-chain outputs.
  </div>
{/if}

<style>
  .chart-section {
    background: var(--chart-bg);
  }

  .legend-item::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 10px;
    height: 10px;
    border-radius: 3px;
    background: var(--legend-color, #adb5bd);
  }

  @media (max-width: 960px) {
    #reference {
      order: 2;
    }
  }
</style>
