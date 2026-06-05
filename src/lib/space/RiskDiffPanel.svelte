<script>
  import { onMount } from 'svelte';
  import LoadingSpinner from '../LoadingSpinner.svelte';
  import * as Card from '$lib/components/ui/card/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
  import {
    loadSpaceEconomyRiskDiffsIndex,
    loadSpaceEconomyRiskDiff,
  } from './research-answers.js';

  let index = $state(/** @type {object | null} */ (null));
  let loading = $state(true);
  let selected = $state(/** @type {string | null} */ (null));
  let diff = $state(/** @type {object | null} */ (null));
  let diffLoading = $state(false);

  const tickers = $derived(index?.tickers ?? []);
  const sortedTickers = $derived(
    [...tickers].sort((a, b) => (b.addedCount ?? 0) - (a.addedCount ?? 0)),
  );
  const validTickers = $derived(sortedTickers.filter((t) => !t.error));
  const current = $derived(validTickers.find((t) => t.ticker === selected) ?? validTickers[0] ?? null);

  $effect(() => {
    if (!current?.ticker) return;
    diffLoading = true;
    loadSpaceEconomyRiskDiff(current.ticker).then((d) => {
      diff = d;
      diffLoading = false;
    });
  });

  onMount(() => {
    loadSpaceEconomyRiskDiffsIndex().then((data) => {
      index = data;
      loading = false;
      if (data?.tickers?.length) {
        const ranked = [...data.tickers]
          .filter((t) => !t.error)
          .sort((a, b) => (b.addedCount ?? 0) - (a.addedCount ?? 0));
        selected = ranked[0]?.ticker ?? data.tickers[0]?.ticker ?? null;
      }
    });
  });
</script>

{#if loading}
  <Card.Root>
    <Card.Content class="text-muted-foreground flex items-center gap-2 pt-6 text-sm">
      <LoadingSpinner />
      Loading risk-factor diffs…
    </Card.Content>
  </Card.Root>
{:else if !index || !validTickers.length}
  <Alert>
    <AlertTitle>No risk-factor diffs indexed</AlertTitle>
    <AlertDescription>Run <code class="text-xs">npm run rag:space-economy</code> with the latest pipeline.</AlertDescription>
  </Alert>
{:else}
  <Card.Root>
    <Card.Header class="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
      <div class="min-w-0 space-y-1">
        <Card.Title>What's new in Risk Factors — year over year</Card.Title>
        <Card.Description>
          New disclosures that appeared in the current 10-K but weren't in the prior one. Cleanest signal of changed risk posture
          in this fast-moving regulatory environment.
        </Card.Description>
      </div>
      <div class="space-y-1">
        <Label class="text-muted-foreground text-[10px] uppercase tracking-wide">Company</Label>
        <Select.Root type="single" value={current?.ticker ?? ''} onValueChange={(v) => v && (selected = v)}>
          <Select.Trigger class="min-w-[220px] font-mono">{current?.ticker ?? 'Pick'}</Select.Trigger>
          <Select.Content>
            {#each validTickers as t}
              <Select.Item value={t.ticker} label={t.ticker}>
                <span class="flex w-full items-center justify-between gap-3">
                  <span class="font-mono">{t.ticker}</span>
                  <span class="text-muted-foreground text-[10px]">
                    +{t.addedCount} / −{t.removedCount}
                  </span>
                </span>
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
    </Card.Header>

    <Card.Content class="space-y-4">
      {#if diffLoading || !diff}
        <p class="text-muted-foreground flex items-center gap-2 text-sm">
          <LoadingSpinner /> Loading {current?.ticker}…
        </p>
      {:else if diff.error}
        <Alert>
          <AlertDescription>{diff.error}</AlertDescription>
        </Alert>
      {:else}
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="default" class="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
            +{diff.addedCount} added
          </Badge>
          <Badge variant="default" class="bg-red-500/20 text-red-700 dark:text-red-300">
            −{diff.removedCount} removed
          </Badge>
          <span class="text-muted-foreground">
            {diff.prior.form} {diff.prior.filingDate} → {diff.current.form} {diff.current.filingDate}
          </span>
        </div>

        <div class="grid gap-3 lg:grid-cols-2">
          <section class="rounded-lg border bg-emerald-500/5">
            <header class="border-b bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              + New risks in {diff.current.filingDate.slice(0, 4)}
            </header>
            <div class="max-h-[28rem] overflow-y-auto p-3">
              {#if diff.added?.length}
                <ul class="m-0 list-disc space-y-2 pl-5 text-xs leading-relaxed">
                  {#each diff.added as sentence}
                    <li class="text-foreground">{sentence}</li>
                  {/each}
                </ul>
              {:else}
                <p class="text-muted-foreground text-xs italic">No new risks detected (or matching threshold too strict).</p>
              {/if}
            </div>
          </section>

          <section class="rounded-lg border bg-red-500/5">
            <header class="border-b bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-300">
              − Risks removed since {diff.prior.filingDate.slice(0, 4)}
            </header>
            <div class="max-h-[28rem] overflow-y-auto p-3">
              {#if diff.removed?.length}
                <ul class="m-0 list-disc space-y-2 pl-5 text-xs leading-relaxed">
                  {#each diff.removed as sentence}
                    <li class="text-muted-foreground">{sentence}</li>
                  {/each}
                </ul>
              {:else}
                <p class="text-muted-foreground text-xs italic">No risks removed (or none crossed the matching threshold).</p>
              {/if}
            </div>
          </section>
        </div>

        <p class="text-muted-foreground text-[10px]">
          Diff uses 5-gram Jaccard similarity at 0.45 threshold. Light rewording is treated as a match; novel sentences and
          large-scale removals surface here. False positives are possible in the "removed" column when the prior 10-K
          structure changed; the "added" column is the strongest signal.
        </p>
      {/if}
    </Card.Content>
  </Card.Root>
{/if}
