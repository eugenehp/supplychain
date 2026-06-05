<script>
  import { onMount } from 'svelte';
  import LoadingSpinner from '../LoadingSpinner.svelte';
  import * as Card from '$lib/components/ui/card/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
  import { loadSpaceEconomyCrossTopic } from './research-answers.js';

  let data = $state(/** @type {object | null} */ (null));
  let loading = $state(true);

  const shared = $derived(data?.shared ?? []);

  function fmtFilers(rows) {
    if (!rows?.length) return '—';
    return rows
      .slice(0, 3)
      .map((r) => `${r.shard} (${r.count})`)
      .join(', ');
  }

  onMount(() => {
    loadSpaceEconomyCrossTopic().then((d) => {
      data = d;
      loading = false;
    });
  });
</script>

{#if loading}
  <Card.Root>
    <Card.Content class="text-muted-foreground flex items-center gap-2 pt-6 text-sm">
      <LoadingSpinner />
      Loading cross-topic vendor join…
    </Card.Content>
  </Card.Root>
{:else if !data || !shared.length}
  <Alert>
    <AlertTitle>No shared vendors indexed</AlertTitle>
    <AlertDescription>Run <code class="text-xs">npm run rag:space-economy</code> to build the cross-topic index.</AlertDescription>
  </Alert>
{:else}
  <Card.Root>
    <Card.Header>
      <Card.Title>Cross-topic vendor join — shared with AI accelerators</Card.Title>
      <Card.Description>
        Canonical supplier names that appear in both the accelerator corpus
        ({data.accelChunkCount?.toLocaleString()} chunks) and the space corpus
        ({data.spaceChunkCount?.toLocaleString()} chunks). A supplier's presence in
        both ecosystems is a concentration signal you can't see from either side alone.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <div class="overflow-x-auto rounded-lg border">
        <table class="w-full text-xs">
          <thead class="bg-muted/40 text-muted-foreground border-b">
            <tr>
              <th class="px-3 py-2 text-left font-semibold uppercase tracking-wide">Supplier</th>
              <th class="px-3 py-2 text-left font-semibold uppercase tracking-wide">Category</th>
              <th class="px-3 py-2 text-right font-semibold uppercase tracking-wide">Accel mentions</th>
              <th class="px-3 py-2 text-left font-semibold uppercase tracking-wide">Top accel filers</th>
              <th class="px-3 py-2 text-right font-semibold uppercase tracking-wide">Space mentions</th>
              <th class="px-3 py-2 text-left font-semibold uppercase tracking-wide">Top space filers / reports</th>
            </tr>
          </thead>
          <tbody>
            {#each shared as row (row.label)}
              <tr class="border-t align-top hover:bg-muted/30">
                <td class="px-3 py-2">
                  <div class="text-foreground font-semibold">{row.label}</div>
                  {#if row.space.sample}
                    <div class="text-muted-foreground mt-1 max-w-[24rem] truncate italic text-[10px]" title={row.space.sample}>
                      "{row.space.sample.slice(0, 110)}…"
                    </div>
                  {/if}
                </td>
                <td class="px-3 py-2">
                  <Badge variant="outline" class="text-[10px]">{row.category}</Badge>
                </td>
                <td class="px-3 py-2 text-right tabular-nums font-semibold">{row.accelerator.mentions}</td>
                <td class="px-3 py-2 text-muted-foreground font-mono text-[10px]">{fmtFilers(row.accelerator.topFilers)}</td>
                <td class="px-3 py-2 text-right tabular-nums font-semibold">{row.space.mentions}</td>
                <td class="px-3 py-2 text-muted-foreground font-mono text-[10px]">{fmtFilers(row.space.topFilers)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <p class="text-muted-foreground mt-3 text-[10px]">
        Mention counts are raw text-occurrence tallies across all indexed chunks per topic. A "filer" can be either a SEC ticker
        or a public report (e.g. <code>report__nasa-oig-…</code>). Joint strength = min(accel, space) — vendors with high joint
        strength are the most cross-cutting.
      </p>
    </Card.Content>
  </Card.Root>
{/if}
