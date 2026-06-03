<script>
  import { onMount } from 'svelte';
  import MendeleevTable from './MendeleevTable.svelte';
  import ElementDetailPanel from './ElementDetailPanel.svelte';
  import GeoDistributionPanel from './GeoDistributionPanel.svelte';
  import MiningSitesMap from './MiningSitesMap.svelte';
  import InternationalFilingsPanel from './InternationalFilingsPanel.svelte';
  import PublicReportsPanel from './PublicReportsPanel.svelte';
  import AsxResourcePanel from './AsxResourcePanel.svelte';
  import MaterialsQueryPanel from './MaterialsQueryPanel.svelte';
  import MaterialsExcerptHost from './MaterialsExcerptHost.svelte';
  import MaterialsPageNav from './MaterialsPageNav.svelte';
  import MaterialsTour from './MaterialsTour.svelte';
  import ValueChainPanel from './ValueChainPanel.svelte';
  import SupplyTimelinePanel from './SupplyTimelinePanel.svelte';
  import DownstreamOemPanel from './DownstreamOemPanel.svelte';
  import { loadRareEarthIndex } from './rare-earth.js';
  import { mergePeriodicWithSec } from './periodic-table.js';
  import { MATERIALS_INDUSTRIES } from '@materials/element-notes-data.mjs';
  import LoadingSpinner from '../LoadingSpinner.svelte';
  import * as Card from '$lib/components/ui/card/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';

  let index = $state(/** @type {object | null} */ (null));
  let loading = $state(true);
  let selectedSymbol = $state(/** @type {string | null} */ ('Nd'));
  let industryFilter = $state(/** @type {string | null} */ (null));

  const secElements = $derived(index?.elements ?? []);
  const periodicCells = $derived(mergePeriodicWithSec(secElements));
  const selectedElement = $derived(periodicCells.find((e) => e.symbol === selectedSymbol) ?? null);
  const summary = $derived(index?.summary ?? {});
  const methodology = $derived(index?.methodology ?? {});
  const mapHighlightCountry = $derived(selectedElement?.countries?.[0]?.code ?? null);
  const industryLabel = $derived(industryFilter ?? 'All industries');

  onMount(() => {
    loadRareEarthIndex().then((data) => {
      index = data;
      loading = false;
      if (!selectedSymbol) selectedSymbol = 'Nd';
    });
  });
</script>

{#if loading}
  <div class="text-muted-foreground flex min-h-[40vh] flex-col items-center justify-center gap-3" aria-busy="true">
    <LoadingSpinner />
    <span class="text-sm">Loading rare earth materials data…</span>
  </div>
{:else if !index}
  <Alert>
    <AlertTitle>No materials data</AlertTitle>
    <AlertDescription>Run <code class="text-xs">npm run rag</code> to build the rare earth index from SEC filings and public reports.</AlertDescription>
  </Alert>
{:else}
  <MaterialsExcerptHost>
    <div class="flex flex-col gap-[var(--section-gap)]">
      <section id="materials-overview" class="ui-section pb-2">
        <p class="text-primary mb-3 text-xs font-semibold tracking-widest uppercase">Raw materials · Tier 5</p>
        <h1 class="text-foreground mb-4 text-[clamp(1.75rem,3.5vw,2.35rem)] leading-tight font-bold tracking-tight">
          {index.title}
        </h1>
        <p class="text-muted-foreground max-w-[720px] text-lg leading-relaxed">{index.subtitle}</p>
        <Alert class="mt-5 max-w-[720px] border-amber-500/30 bg-amber-500/5">
          <AlertTitle class="text-sm font-semibold">SEC disclosure limits</AlertTitle>
          <AlertDescription class="text-sm leading-relaxed">
            {methodology.disclaimer}
          </AlertDescription>
        </Alert>
      </section>

      <MaterialsPageNav />

      <MaterialsTour />

      <MaterialsQueryPanel
        elements={secElements}
        {selectedSymbol}
        onElementSelect={(s) => {
          if (s) selectedSymbol = s;
        }}
      />

      <ValueChainPanel
        valueChain={index.valueChain}
        {selectedSymbol}
        onElementSelect={(s) => (selectedSymbol = s)}
        onScrollToMap={() => {}}
      />

      <section
        id="materials-stats"
        class="ui-section grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-[var(--stack-gap)]"
        aria-label="Materials metrics"
      >
        <Card.Root>
          <Card.Content class="pt-6">
            <span class="text-primary text-[clamp(1.35rem,2.5vw,1.75rem)] font-bold">118</span>
            <span class="text-muted-foreground mt-2 block text-xs">Elements in Mendeleev table</span>
          </Card.Content>
        </Card.Root>
        <Card.Root>
          <Card.Content class="pt-6">
            <span class="text-primary text-[clamp(1.35rem,2.5vw,1.75rem)] font-bold">{summary.elementsWithSecMentions ?? 0}</span>
            <span class="text-muted-foreground mt-2 block text-xs">REE with SEC miner excerpts</span>
          </Card.Content>
        </Card.Root>
        <Card.Root>
          <Card.Content class="pt-6">
            <span class="text-primary text-[clamp(1.35rem,2.5vw,1.75rem)] font-bold">{summary.miningSiteCount ?? 0}</span>
            <span class="text-muted-foreground mt-2 block text-xs">Mining sites on map</span>
          </Card.Content>
        </Card.Root>
        <Card.Root>
          <Card.Content class="pt-6">
            <span class="text-primary text-[clamp(1.35rem,2.5vw,1.75rem)] font-bold"
              >{(summary.internationalFilings ?? 0) + (summary.publicReportsIndexed ?? 0)}</span
            >
            <span class="text-muted-foreground mt-2 block text-xs">Intl filings + public reports</span>
          </Card.Content>
        </Card.Root>
        <Card.Root>
          <Card.Content class="pt-6">
            <span class="text-primary text-[clamp(1.35rem,2.5vw,1.75rem)] font-bold">{index.downstream?.companies?.length ?? 0}</span>
            <span class="text-muted-foreground mt-2 block text-xs">Downstream OEM filers indexed</span>
          </Card.Content>
        </Card.Root>
      </section>

      <section id="mendeleev" class="ui-section">
        <h2 class="text-foreground mb-2 text-lg font-semibold">Mendeleev table (all elements)</h2>
        <p class="text-muted-foreground mb-4 max-w-[720px] text-sm leading-relaxed">
          Full periodic table (Z 1–118) with lanthanide and actinide series. Rare earth cells include miner SEC excerpts,
          downstream OEM risk language, and industry tags. Badge counts reflect indexed 10-K mentions.
        </p>

        <div class="mb-4 flex flex-wrap items-end gap-3">
          <div class="space-y-2">
            <Label for="industry-filter">Highlight elements used in</Label>
            <Select.Root
              type="single"
              value={industryFilter ?? ''}
              onValueChange={(v) => (industryFilter = v || null)}
            >
              <Select.Trigger id="industry-filter" class="w-[min(100%,16rem)]">{industryLabel}</Select.Trigger>
              <Select.Content>
                <Select.Item value="" label="All industries">All industries</Select.Item>
                {#each MATERIALS_INDUSTRIES as ind}
                  <Select.Item value={ind} label={ind}>{ind}</Select.Item>
                {/each}
              </Select.Content>
            </Select.Root>
          </div>
        </div>

        <MendeleevTable elements={secElements} {selectedSymbol} {industryFilter} onselect={(s) => (selectedSymbol = s)} />
      </section>

      <section id="element-detail" class="ui-section">
        <ElementDetailPanel element={selectedElement} />
      </section>

      <GeoDistributionPanel
        geography={index.geography}
        productionGeography={index.productionGeography}
        strategicProjects={index.strategicProjects}
        tradeGeography={index.tradeGeography}
        usgsHistorical={index.usgsHistorical}
        chinaPolicy={index.chinaPolicy}
        myanmarSupply={index.myanmarSupply}
        bind:selectedSymbol
        onElementSelect={(s) => (selectedSymbol = s)}
      />

      <SupplyTimelinePanel supplyTimeline={index.supplyTimeline} publicReports={index.publicReports} />

      <section id="mining-sites-map" class="ui-section">
        <h2 class="text-foreground mb-2 text-lg font-semibold">Mining & processing sites</h2>
        <p class="text-muted-foreground mb-4 max-w-[720px] text-sm leading-relaxed">
          {index.miningSites?.summary?.siteCount ?? 0} sites tagged by value-chain stage (mine, concentrate, separation).
          Filter by chain stage to see where ore is mined vs where separation happens — often different countries.
        </p>
        <MiningSitesMap miningSites={index.miningSites} highlightCountry={mapHighlightCountry} />
      </section>

      <DownstreamOemPanel downstream={index.downstream} bind:selectedSymbol onElementSelect={(s) => (selectedSymbol = s)} />

      <InternationalFilingsPanel international={index.international} />

      <AsxResourcePanel resourceEstimates={index.resourceEstimates} />

      <PublicReportsPanel publicReports={index.publicReports} />

      <section id="miners-watchlist" class="ui-section">
        <h2 class="text-foreground mb-3 text-lg font-semibold">SEC filing watchlist — rare earth miners</h2>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {#each index.miners ?? [] as miner}
            {@const filing = index.filings?.find((f) => f.ticker === miner.ticker)}
            <Card.Root class="hover:border-primary/30 transition-colors">
              <Card.Header class="pb-2">
                <Card.Title class="flex items-center gap-2 text-base">
                  <span aria-hidden="true">{miner.flag}</span>
                  {miner.name}
                </Card.Title>
                <Card.Description class="font-mono text-xs">{miner.ticker} · {miner.role}</Card.Description>
              </Card.Header>
              <Card.Content class="text-sm">
                <p class="text-muted-foreground m-0 leading-snug">
                  Sites: {miner.flagshipSites?.join('; ') ?? '—'}
                </p>
                <p class="text-muted-foreground mt-2 m-0 leading-snug">
                  Focus: {(miner.primaryElements ?? []).join(', ')}
                </p>
                {#if filing?.generalMentions}
                  <p class="text-foreground mt-2 m-0 text-xs">
                    {filing.generalMentions} general REE mentions in latest 10-K
                  </p>
                {/if}
              </Card.Content>
            </Card.Root>
          {/each}
        </div>
      </section>

      <section id="methodology" class="ui-section pb-8">
        <h2 class="text-foreground mb-2 text-lg font-semibold">Methodology</h2>
        <ul class="text-muted-foreground m-0 max-w-[720px] list-disc space-y-2 pl-5 text-sm leading-relaxed">
          <li>{methodology.sources}</li>
          <li>{methodology.elements}</li>
          <li>{methodology.extraction}</li>
          <li>{methodology.productionGeography}</li>
          <li>{methodology.miningSites}</li>
          {#if index.valueChain?.methodology}
            <li>{index.valueChain.methodology}</li>
          {/if}
          {#if index.downstream?.methodology}
            <li>{index.downstream.methodology}</li>
          {/if}
          {#if index.supplyTimeline?.methodology}
            <li>{index.supplyTimeline.methodology}</li>
          {/if}
          <li>{methodology.disclaimer}</li>
        </ul>
      </section>
    </div>
  </MaterialsExcerptHost>
{/if}
