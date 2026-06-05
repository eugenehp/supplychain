<script>
  import { onMount } from 'svelte';
  import LoadingSpinner from '../LoadingSpinner.svelte';
  import * as Card from '$lib/components/ui/card/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
  import { cn } from '$lib/utils.js';
  import { loadSpaceEconomyPatents, loadSpaceEconomyPatentsTicker } from './research-answers.js';

  let index = $state(/** @type {object | null} */ (null));
  let loading = $state(true);
  let selected = $state(/** @type {string | null} */ (null));
  let detail = $state(/** @type {object | null} */ (null));

  const ranked = $derived((index?.tickers ?? []).filter((t) => !t.error && t.total > 0).sort((a, b) => b.total - a.total));
  const needsKey = $derived(Boolean(index?.note));

  $effect(() => {
    if (!selected) return;
    loadSpaceEconomyPatentsTicker(selected).then((d) => (detail = d));
  });

  onMount(() => {
    loadSpaceEconomyPatents().then((d) => {
      index = d;
      loading = false;
      selected = d?.tickers?.find((t) => !t.error && t.total > 0)?.ticker ?? null;
    });
  });
</script>

{#if loading}
  <Card.Root>
    <Card.Content class="text-muted-foreground flex items-center gap-2 pt-6 text-sm"><LoadingSpinner /> Loading patents…</Card.Content>
  </Card.Root>
{:else if needsKey}
  <Card.Root>
    <Card.Header>
      <Card.Title>USPTO patents</Card.Title>
      <Card.Description>USPTO PatentsView API requires a (free) API key for non-trivial queries.</Card.Description>
    </Card.Header>
    <Card.Content>
      <Alert>
        <AlertTitle>API key required</AlertTitle>
        <AlertDescription>
          {index?.note}
          Set <code class="text-xs">PATENTSVIEW_API_KEY</code> in your environment and re-run
          <code class="text-xs">npm run rag:space-economy</code>.
        </AlertDescription>
      </Alert>
    </Card.Content>
  </Card.Root>
{:else if !ranked.length}
  <Alert>
    <AlertTitle>No patents indexed</AlertTitle>
    <AlertDescription>Run <code class="text-xs">npm run rag:space-economy</code> with PATENTSVIEW_API_KEY set.</AlertDescription>
  </Alert>
{:else}
  <Card.Root>
    <Card.Header class="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
      <div class="min-w-0 space-y-1">
        <Card.Title>USPTO patents — last {index.years}y</Card.Title>
        <Card.Description>Granted patents per assignee. Source: USPTO PatentsView.</Card.Description>
      </div>
      <div class="space-y-1">
        <Label class="text-muted-foreground text-[10px] uppercase tracking-wide">Filer</Label>
        <Select.Root type="single" value={selected ?? ''} onValueChange={(v) => v && (selected = v)}>
          <Select.Trigger class="min-w-[200px] font-mono">{selected}</Select.Trigger>
          <Select.Content>
            {#each ranked as t}
              <Select.Item value={t.ticker} label={t.ticker}>
                <span class="flex w-full items-center justify-between gap-3">
                  <span class="font-mono">{t.ticker}</span>
                  <span class="text-muted-foreground text-[10px]">{t.total} patents</span>
                </span>
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
    </Card.Header>
    <Card.Content class="space-y-4">
      <div class="overflow-x-auto rounded-lg border">
        <table class="w-full text-xs">
          <thead class="bg-muted/40 text-muted-foreground border-b">
            <tr>
              <th class="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide">Ticker</th>
              <th class="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide">Patents</th>
              <th class="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide">Top CPC classes</th>
            </tr>
          </thead>
          <tbody>
            {#each ranked as r}
              <tr class={cn('border-t hover:bg-muted/30 cursor-pointer', selected === r.ticker && 'bg-primary/5')} onclick={() => (selected = r.ticker)}>
                <th scope="row" class="px-3 py-2 text-left font-mono font-semibold">{r.ticker}</th>
                <td class="px-3 py-2 text-right tabular-nums font-semibold">{r.total}</td>
                <td class="px-3 py-2 text-[10px] text-muted-foreground">{(r.topCpc ?? []).join(', ')}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      {#if detail?.recent?.length}
        <div class="space-y-2">
          <h3 class="text-foreground text-sm font-semibold">{selected} · recent grants</h3>
          {#each detail.recent as p}
            <div class="rounded-md border bg-card p-3 text-xs">
              <div class="mb-1 flex flex-wrap items-center gap-2">
                <Badge variant="outline" class="font-mono text-[10px]">{p.patentId}</Badge>
                <span class="text-muted-foreground text-[10px]">{p.date}</span>
                {#each p.cpc as cpc}<Badge variant="secondary" class="text-[10px]">{cpc}</Badge>{/each}
              </div>
              <div class="text-foreground/90 leading-relaxed">{p.title}</div>
              <div class="text-muted-foreground mt-1 text-[10px] italic">{p.assignee}</div>
            </div>
          {/each}
        </div>
      {/if}
    </Card.Content>
  </Card.Root>
{/if}
