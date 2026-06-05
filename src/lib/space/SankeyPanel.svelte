<script>
  import { onMount } from 'svelte';
  import LazyChart from '../LazyChart.svelte';
  import SankeyTierControls from '../SankeyTierControls.svelte';
  import LoadingSpinner from '../LoadingSpinner.svelte';
  import * as Card from '$lib/components/ui/card/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
  import { loadSpaceEconomySankeyIndex, loadSpaceEconomySankey } from './research-answers.js';

  let index = $state(/** @type {object | null} */ (null));
  let loading = $state(true);
  let selected = $state(/** @type {string | null} */ (null));
  let sankey = $state(/** @type {object | null} */ (null));
  let sankeyLoading = $state(false);
  let maxTier = $state(3);
  let highlightCountry = $state(/** @type {string | null} */ (null));

  const TIER_LABELS = ['Product', 'Subsystem', 'Supplier', 'Material', 'Tier 4', 'Tier 5'];

  const COUNTRY_NAMES = {
    US: 'United States', GB: 'United Kingdom', FR: 'France', DE: 'Germany',
    IT: 'Italy', JP: 'Japan', IN: 'India', CA: 'Canada', NO: 'Norway',
    FI: 'Finland', LU: 'Luxembourg', RU: 'Russia',
  };

  const countryOptions = $derived(sankey?.summary?.countries ?? []);

  const available = $derived(
    (index?.tickers ?? [])
      .filter((t) => !t.error)
      .sort((a, b) => (b.totalFlow ?? 0) - (a.totalFlow ?? 0)),
  );
  const current = $derived(available.find((t) => t.ticker === selected) ?? available[0] ?? null);

  $effect(() => {
    if (!current?.ticker) return;
    sankeyLoading = true;
    highlightCountry = null;
    loadSpaceEconomySankey(current.ticker).then((d) => {
      sankey = d;
      sankeyLoading = false;
    });
  });

  onMount(() => {
    loadSpaceEconomySankeyIndex().then((data) => {
      index = data;
      loading = false;
      const ranked = (data?.tickers ?? []).filter((t) => !t.error).sort((a, b) => (b.totalFlow ?? 0) - (a.totalFlow ?? 0));
      selected = ranked[0]?.ticker ?? null;
    });
  });
</script>

{#if loading}
  <Card.Root>
    <Card.Content class="text-muted-foreground flex items-center gap-2 pt-6 text-sm">
      <LoadingSpinner />
      Loading supply-chain Sankeys…
    </Card.Content>
  </Card.Root>
{:else if !index || !available.length}
  <Alert>
    <AlertTitle>No supply-chain Sankeys indexed</AlertTitle>
    <AlertDescription>Run <code class="text-xs">npm run rag:space-economy</code> to build per-ticker Sankeys.</AlertDescription>
  </Alert>
{:else}
  <Card.Root>
    <Card.Header class="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
      <div class="min-w-0 space-y-1">
        <Card.Title>Supply-chain Sankey — per vendor</Card.Title>
        <Card.Description>
          {available.length} filers with detected supplier flows · Tier 0 (product) → Tier 1 (subsystem) →
          Tier 2 (supplier) → Tier 3 (raw input). Link width = 10-K mention count, not dollar BOM.
        </Card.Description>
      </div>
      <div class="space-y-1">
        <Label class="text-muted-foreground text-[10px] uppercase tracking-wide">Filer</Label>
        <Select.Root type="single" value={current?.ticker ?? ''} onValueChange={(v) => v && (selected = v)}>
          <Select.Trigger class="min-w-[260px]">
            {#if current}
              <span class="font-mono">{current.ticker}</span> · {current.product}
            {/if}
          </Select.Trigger>
          <Select.Content>
            {#each available as t}
              <Select.Item value={t.ticker} label={`${t.ticker} ${t.product ?? ''}`}>
                <span class="flex w-full items-center justify-between gap-3">
                  <span class="font-mono">{t.ticker}</span>
                  <span class="text-muted-foreground text-[10px]">{t.totalFlow} flow · {t.linkCount} links</span>
                </span>
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
    </Card.Header>

    <Card.Content class="space-y-4">
      {#if sankeyLoading || !sankey}
        <p class="text-muted-foreground flex items-center gap-2 text-sm">
          <LoadingSpinner /> Loading {current?.ticker}…
        </p>
      {:else if !sankey.nodes?.length}
        <p class="text-muted-foreground text-sm italic">No supply-chain matches for {current?.ticker}.</p>
      {:else}
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="secondary">{sankey.nodes.length} nodes</Badge>
          <Badge variant="secondary">{sankey.links.length} links</Badge>
          <Badge variant="outline">total flow {sankey.summary?.totalFlow ?? 0}</Badge>
          {#if sankey.summary?.mentionDensity}
            <Badge variant="outline" title="Mention count per 1k characters">
              {sankey.summary.mentionDensity} /kchar
            </Badge>
          {/if}
          {#if sankey.summary?.explicitSuppliers > 0}
            <Badge variant="default" class="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
              {sankey.summary.explicitSuppliers} explicit
            </Badge>
          {/if}
          {#if sankey.summary?.heuristicSuppliers > 0}
            <Badge variant="default" class="bg-amber-500/20 text-amber-700 dark:text-amber-300">
              {sankey.summary.heuristicSuppliers} heuristic
            </Badge>
          {/if}
          {#if sankey.filing?.filingDate}
            <span class="text-muted-foreground font-mono">
              {sankey.filing.form ?? '10-K'} · {sankey.filing.filingDate}
            </span>
          {/if}
        </div>

        {#if sankey.summary?.subsystemBreakdown?.length}
          <div class="flex flex-wrap gap-1.5 text-[10px]">
            {#each sankey.summary.subsystemBreakdown as s}
              <Badge variant="outline">{s.subsystem}: {s.score}</Badge>
            {/each}
          </div>
        {/if}

        <div class="flex flex-wrap items-end gap-3">
          <SankeyTierControls bind:maxTier />
          {#if countryOptions.length > 1}
            <div class="space-y-1">
              <Label class="text-muted-foreground text-[10px] uppercase tracking-wide">Highlight country</Label>
              <Select.Root
                type="single"
                value={highlightCountry ?? 'all'}
                onValueChange={(v) => (highlightCountry = v && v !== 'all' ? v : null)}
              >
                <Select.Trigger class="min-w-[160px] font-mono text-xs">
                  {highlightCountry ? highlightCountry + ' · ' + (COUNTRY_NAMES[highlightCountry] ?? '') : 'All countries'}
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="all" label="All countries">All countries</Select.Item>
                  {#each countryOptions as c}
                    <Select.Item value={c} label={c}>{c} · {COUNTRY_NAMES[c] ?? ''}</Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>
            </div>
          {/if}
        </div>

        <div class="w-full min-w-0 overflow-visible rounded-lg border bg-muted/10">
          <LazyChart
            view="sankey"
            data={sankey}
            {maxTier}
            tierLabels={TIER_LABELS}
            {highlightCountry}
            secFilings={sankey.filing ? [{
              ticker: sankey.ticker,
              filing: sankey.filing,
              filingUrl: sankey.filingUrl,
            }] : []}
          />
        </div>

        <p class="text-muted-foreground text-[10px]">
          Sankey nodes come from a curated catalog of ~50 named space-industry suppliers (Aerojet Rocketdyne,
          Rutherford, BAE Systems, Spectrolab, Sinclair, KSAT, etc.). Link values are raw mention counts in the
          company's most recent 10-K / 20-F — they're proportional weights, not USD. A small Sankey means the
          filing names few suppliers explicitly (e.g., SPIR, RTX), not that the company has a small supply chain.
        </p>
      {/if}
    </Card.Content>
  </Card.Root>
{/if}
