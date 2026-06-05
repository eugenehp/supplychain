<script>
  import { onMount } from 'svelte';
  import LazyChart from '../LazyChart.svelte';
  import SankeyTierControls from '../SankeyTierControls.svelte';
  import LoadingSpinner from '../LoadingSpinner.svelte';
  import * as Card from '$lib/components/ui/card/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
  import { loadSpaceEconomyVendorNetwork } from './research-answers.js';

  let data = $state(/** @type {object | null} */ (null));
  let loading = $state(true);
  let maxTier = $state(3);

  const TIER_LABELS = ['Root', 'Subsystem', 'Supplier', 'Filer', '', ''];

  onMount(() => {
    loadSpaceEconomyVendorNetwork().then((d) => {
      data = d;
      loading = false;
    });
  });
</script>

{#if loading}
  <Card.Root>
    <Card.Content class="text-muted-foreground flex items-center gap-2 pt-6 text-sm">
      <LoadingSpinner />
      Loading vendor network…
    </Card.Content>
  </Card.Root>
{:else if !data || !data.nodes?.length}
  <Alert>
    <AlertTitle>No vendor network indexed</AlertTitle>
    <AlertDescription>Run <code class="text-xs">npm run rag:space-economy</code> to build the cross-company supplier tree.</AlertDescription>
  </Alert>
{:else}
  <Card.Root>
    <Card.Header>
      <Card.Title>Vendor radial-tree — shared suppliers across {data.summary.filerCount} filers</Card.Title>
      <Card.Description>
        Hub-and-spoke view of the supplier catalog: <strong>{data.summary.supplierCount}</strong> named suppliers,
        <strong>{data.summary.sharedSuppliers}</strong> cited by ≥2 filers, <strong>{data.summary.filerLinkCount}</strong> filer→supplier edges.
        Suppliers with multiple filer branches are cross-company chokepoints.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      {#if data.summary.topShared?.length}
        <div class="space-y-1">
          <h3 class="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">Top shared suppliers</h3>
          <div class="flex flex-wrap gap-1.5">
            {#each data.summary.topShared.slice(0, 8) as s}
              <Badge variant="outline" class="text-[10px]">
                <span class="font-semibold">{s.supplier}</span>
                <span class="text-muted-foreground ml-1">· {s.filers} filers · {s.mentions} mentions</span>
              </Badge>
            {/each}
          </div>
        </div>
      {/if}

      <SankeyTierControls bind:maxTier />

      <div class="w-full min-w-0 overflow-visible rounded-lg border bg-muted/10">
        <LazyChart view="radial" data={{ nodes: data.nodes, links: data.links }} {maxTier} tierLabels={TIER_LABELS} />
      </div>

      <p class="text-muted-foreground text-[10px]">
        Root → Subsystem → Supplier → Filer hierarchy. A supplier with many filer branches (e.g., SpaceX as a launch
        provider, Spectrolab as a solar-cell vendor) is structurally important across the watchlist. Edge values are
        10-K mention counts.
      </p>
    </Card.Content>
  </Card.Root>
{/if}
