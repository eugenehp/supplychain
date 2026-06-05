<script>
  import { onMount } from 'svelte';
  import LoadingSpinner from '../LoadingSpinner.svelte';
  import * as Card from '$lib/components/ui/card/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
  import { cn } from '$lib/utils.js';
  import { loadSpaceEconomyConcentration } from './research-answers.js';

  let data = $state(/** @type {object | null} */ (null));
  let loading = $state(true);

  const companies = $derived([...(data?.companies ?? [])].sort((a, b) => b.weightedHHI - a.weightedHHI));
  // Backwards compat: prefer new overallBucket, fall back to worstBucket on older payloads.
  function bucketOf(row) { return row.overallBucket ?? row.worstBucket ?? 'diversified'; }

  const BUCKET_CLASS = {
    'diversified': 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    'moderate': 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
    'concentrated': 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    'highly-concentrated': 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
    'sole-source': 'bg-red-500/15 text-red-700 dark:text-red-300',
  };

  onMount(() => {
    loadSpaceEconomyConcentration().then((d) => { data = d; loading = false; });
  });
</script>

{#if loading}
  <Card.Root>
    <Card.Content class="text-muted-foreground flex items-center gap-2 pt-6 text-sm"><LoadingSpinner /> Loading concentration…</Card.Content>
  </Card.Root>
{:else if !data || !companies.length}
  <Alert>
    <AlertTitle>No concentration data</AlertTitle>
    <AlertDescription>Run <code class="text-xs">npm run rag:space-economy</code> to compute HHI.</AlertDescription>
  </Alert>
{:else}
  <Card.Root>
    <Card.Header>
      <Card.Title>Supplier concentration — HHI per subsystem</Card.Title>
      <Card.Description>
        Herfindahl-Hirschman Index over named-supplier mention shares.
        HHI 1.0 = sole-source · 0.5 = 2 equal suppliers · ≤ 0.15 = diversified.
        Bucket is taken from <strong>weighted HHI</strong> (mention-weighted across subsystems) so single-supplier subsystems
        with thin samples don't dominate. <em>"Exposed"</em> = subsystems with HHI ≥ 0.75 AND ≥3 mentions.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <div class="overflow-x-auto rounded-lg border">
        <table class="w-full text-xs">
          <thead class="bg-muted/40 text-muted-foreground border-b">
            <tr>
              <th scope="col" class="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide">Ticker</th>
              <th scope="col" class="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide">Weighted HHI</th>
              <th scope="col" class="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide">Overall bucket</th>
              <th scope="col" class="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide">Subs</th>
              <th scope="col" class="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide">Exposed</th>
              <th scope="col" class="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide">Per-subsystem HHI</th>
            </tr>
          </thead>
          <tbody>
            {#each companies as row (row.ticker)}
              <tr class="border-t hover:bg-muted/30">
                <th scope="row" class="px-3 py-2 text-left font-mono font-semibold">{row.ticker}</th>
                <td class="px-3 py-2 text-right tabular-nums font-semibold">{row.weightedHHI.toFixed(3)}</td>
                <td class="px-3 py-2">
                  <span class={cn('rounded-md px-2 py-0.5 text-[10px] font-medium', BUCKET_CLASS[bucketOf(row)])}>{bucketOf(row)}</span>
                </td>
                <td class="px-3 py-2 text-right tabular-nums">{row.subsystemCount}</td>
                <td class="px-3 py-2 text-right tabular-nums">
                  {#if (row.exposedSubsystemCount ?? 0) > 0}
                    <span class="text-red-700 dark:text-red-300 font-semibold">{row.exposedSubsystemCount}</span>
                  {:else}
                    <span class="text-muted-foreground">0</span>
                  {/if}
                </td>
                <td class="px-3 py-2">
                  <div class="flex flex-wrap gap-1">
                    {#each [...row.subsystems].sort((a, b) => b.hhi - a.hhi) as s}
                      <span
                        class={cn('rounded-md px-2 py-0.5 text-[10px]', BUCKET_CLASS[s.bucket])}
                        title={`${s.label}: HHI ${s.hhi} · top supplier: ${s.topSupplier} (${s.totalMentions} mentions across ${s.supplierCount} sources)`}
                      >
                        {s.label}: {s.hhi.toFixed(2)}
                      </span>
                    {/each}
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </Card.Content>
  </Card.Root>
{/if}
