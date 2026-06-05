<script>
  import { onMount } from 'svelte';
  import LoadingSpinner from '../LoadingSpinner.svelte';
  import * as Card from '$lib/components/ui/card/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
  import { cn } from '$lib/utils.js';
  import { loadSpaceEconomyTimelineIndex, loadSpaceEconomyTimeline } from './research-answers.js';

  let index = $state(/** @type {object | null} */ (null));
  let loading = $state(true);
  let selected = $state(/** @type {string | null} */ (null));
  let timeline = $state(/** @type {object | null} */ (null));
  let timelineLoading = $state(false);
  let categoryFilter = $state('all');

  const CATEGORY_COLOR = {
    contract: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
    earnings: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/40',
    'm-and-a': 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/40',
    financing: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40',
    distress: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/40',
    governance: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/40',
    disclosure: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/40',
    other: 'bg-muted text-muted-foreground border-border',
  };

  const tickers = $derived(index?.tickers ?? []);
  const validTickers = $derived(tickers.filter((t) => !t.error && t.total > 0));
  const current = $derived(validTickers.find((t) => t.ticker === selected) ?? validTickers[0] ?? null);

  const events = $derived(timeline?.events ?? []);
  const filteredEvents = $derived(
    categoryFilter === 'all' ? events : events.filter((e) => e.category === categoryFilter),
  );
  const categories = $derived(['all', ...new Set(events.map((e) => e.category))]);

  $effect(() => {
    if (!current?.ticker) return;
    timelineLoading = true;
    categoryFilter = 'all';
    loadSpaceEconomyTimeline(current.ticker).then((d) => {
      timeline = d;
      timelineLoading = false;
    });
  });

  onMount(() => {
    loadSpaceEconomyTimelineIndex().then((d) => {
      index = d;
      loading = false;
      const ranked = (d?.tickers ?? []).filter((t) => !t.error && t.total > 0).sort((a, b) => b.total - a.total);
      selected = ranked[0]?.ticker ?? null;
    });
  });
</script>

{#if loading}
  <Card.Root>
    <Card.Content class="text-muted-foreground flex items-center gap-2 pt-6 text-sm">
      <LoadingSpinner />
      Loading 8-K event timeline…
    </Card.Content>
  </Card.Root>
{:else if !index || !validTickers.length}
  <Alert>
    <AlertTitle>No 8-K events indexed</AlertTitle>
    <AlertDescription>Run <code class="text-xs">npm run rag:space-economy</code> to extract the 8-K timeline.</AlertDescription>
  </Alert>
{:else}
  <Card.Root>
    <Card.Header class="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
      <div class="min-w-0 space-y-1">
        <Card.Title>8-K event timeline — last {index.windowDays}d</Card.Title>
        <Card.Description>
          Material events classified by SEC item code: contract wins, earnings releases, M&A, financing, governance,
          distress (impairment / non-reliance), disclosure. Operational tempo that 10-K snapshots can't show.
        </Card.Description>
      </div>
      <div class="space-y-1">
        <Label class="text-muted-foreground text-[10px] uppercase tracking-wide">Company</Label>
        <Select.Root type="single" value={current?.ticker ?? ''} onValueChange={(v) => v && (selected = v)}>
          <Select.Trigger class="min-w-[220px] font-mono">
            {current?.ticker ?? 'Pick'}{current ? ' · ' + current.total + ' events' : ''}
          </Select.Trigger>
          <Select.Content>
            {#each validTickers as t}
              <Select.Item value={t.ticker} label={t.ticker}>
                <span class="flex w-full items-center justify-between gap-3">
                  <span class="font-mono">{t.ticker}</span>
                  <span class="text-muted-foreground text-[10px]">{t.total} events</span>
                </span>
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
    </Card.Header>

    <Card.Content class="space-y-4">
      {#if timelineLoading || !timeline}
        <p class="text-muted-foreground flex items-center gap-2 text-sm">
          <LoadingSpinner /> Loading {current?.ticker}…
        </p>
      {:else}
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="secondary">{timeline.total} events</Badge>
          {#each timeline.byCategory?.slice(0, 5) ?? [] as c}
            <span class={cn('rounded-md border px-2 py-0.5 text-[10px] font-medium', CATEGORY_COLOR[c.category] ?? CATEGORY_COLOR.other)}>
              {c.category}: {c.count}
            </span>
          {/each}
        </div>

        <div class="flex flex-wrap gap-2">
          {#each categories as cat}
            <button
              type="button"
              class={cn(
                'rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wide transition-colors',
                categoryFilter === cat ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted',
              )}
              onclick={() => (categoryFilter = cat)}
            >{cat}</button>
          {/each}
        </div>

        <ol class="relative ml-3 space-y-3 border-l-2">
          {#each filteredEvents as e (e.accessionNumber)}
            <li class="ml-4">
              <span
                class={cn(
                  'absolute -ml-[10px] mt-1.5 inline-block size-3 rounded-full border-2',
                  CATEGORY_COLOR[e.category] ?? CATEGORY_COLOR.other,
                )}
                style="margin-left:-1.05rem"
                aria-hidden="true"
              ></span>
              <div class="rounded-md border bg-card p-3">
                <div class="mb-1 flex flex-wrap items-center gap-2 text-[11px]">
                  <span class="text-foreground font-mono font-semibold">{e.filingDate}</span>
                  <span class={cn('rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide', CATEGORY_COLOR[e.category] ?? CATEGORY_COLOR.other)}>
                    {e.category}
                  </span>
                  {#each e.items as it}
                    <Badge variant="outline" class="font-mono text-[10px]">{it.code}</Badge>
                  {/each}
                  {#if e.url}
                    <a href={e.url} target="_blank" rel="noopener noreferrer" class="text-primary ml-auto text-[10px] underline">
                      Open on EDGAR →
                    </a>
                  {/if}
                </div>
                <p class="text-muted-foreground m-0 text-xs leading-relaxed">{e.summary}</p>
              </div>
            </li>
          {/each}
        </ol>

        {#if !filteredEvents.length}
          <p class="text-muted-foreground text-sm italic">No events for this filter.</p>
        {/if}
      {/if}
    </Card.Content>
  </Card.Root>
{/if}
