<script>
  import { onMount } from 'svelte';
  import LoadingSpinner from '../LoadingSpinner.svelte';
  import * as Card from '$lib/components/ui/card/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
  import { cn } from '$lib/utils.js';
  import { loadSpaceEconomySbir, loadSpaceEconomySbirTicker } from './research-answers.js';

  let index = $state(/** @type {object | null} */ (null));
  let loading = $state(true);
  let selected = $state(/** @type {string | null} */ (null));
  let detail = $state(/** @type {object | null} */ (null));

  const ranked = $derived((index?.tickers ?? []).filter((t) => !t.error && t.awardCount > 0).sort((a, b) => b.totalAmount - a.totalAmount));

  $effect(() => {
    if (!selected) return;
    loadSpaceEconomySbirTicker(selected).then((d) => (detail = d));
  });

  onMount(() => {
    loadSpaceEconomySbir().then((d) => {
      index = d;
      loading = false;
      selected = d?.tickers?.find((t) => !t.error && t.awardCount > 0)?.ticker ?? null;
    });
  });

  function fmt$(v) {
    if (!Number.isFinite(v)) return '—';
    if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
    return `$${v.toFixed(0)}`;
  }
</script>

{#if loading}
  <Card.Root>
    <Card.Content class="text-muted-foreground flex items-center gap-2 pt-6 text-sm"><LoadingSpinner /> Loading SBIR…</Card.Content>
  </Card.Root>
{:else if !index || !ranked.length}
  <Alert>
    <AlertTitle>No SBIR awards found</AlertTitle>
    <AlertDescription>SBIR.gov returned no awards matching these tickers.</AlertDescription>
  </Alert>
{:else}
  <Card.Root>
    <Card.Header class="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
      <div class="min-w-0 space-y-1">
        <Card.Title>SBIR / STTR awards</Card.Title>
        <Card.Description>
          Federal R&D awards from sbir.gov — tracks upstream technology funding for the watchlist + their subsidiaries.
          Phase I = feasibility · Phase II = prototype · Phase III = scale-up.
        </Card.Description>
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
                  <span class="text-muted-foreground text-[10px]">{t.awardCount} · {fmt$(t.totalAmount)}</span>
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
              <th scope="col" class="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide">Ticker</th>
              <th scope="col" class="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide">Awards</th>
              <th scope="col" class="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide">Total $</th>
              <th scope="col" class="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide">Top agency</th>
              <th scope="col" class="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide">Firms matched</th>
            </tr>
          </thead>
          <tbody>
            {#each ranked as r}
              <tr class={cn('border-t hover:bg-muted/30 cursor-pointer', selected === r.ticker && 'bg-primary/5')} onclick={() => (selected = r.ticker)}>
                <th scope="row" class="px-3 py-2 text-left font-mono font-semibold">{r.ticker}</th>
                <td class="px-3 py-2 text-right tabular-nums">{r.awardCount}</td>
                <td class="px-3 py-2 text-right tabular-nums font-semibold">{fmt$(r.totalAmount)}</td>
                <td class="px-3 py-2 text-[11px]">{r.topAgency ?? '—'}</td>
                <td class="px-3 py-2 text-muted-foreground text-[10px] italic">{(r.sampleFirms ?? []).slice(0, 2).join(', ')}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      {#if detail?.topAwards?.length}
        <div class="space-y-2">
          <h3 class="text-foreground text-sm font-semibold">{selected} · top awards</h3>
          {#each detail.topAwards as a}
            <a
              href={a.url ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              class="block rounded-md border bg-card p-3 text-xs hover:border-primary/40 transition-colors"
            >
              <div class="mb-1 flex flex-wrap items-center gap-2">
                <Badge variant="default" class="text-[10px]">{fmt$(a.amount)}</Badge>
                <Badge variant="outline" class="text-[10px]">{a.agency}{a.branch ? '/' + a.branch : ''}</Badge>
                <Badge variant="outline" class="text-[10px]">Phase {a.phase}</Badge>
                <span class="text-muted-foreground text-[10px]">FY{a.year}</span>
              </div>
              <div class="text-foreground/90 mb-1 leading-relaxed font-medium">{a.title}</div>
              <div class="text-muted-foreground text-[10px] italic">{a.firm}</div>
              {#if a.abstract}
                <div class="text-muted-foreground/80 mt-1 text-[10px] leading-relaxed">{a.abstract}</div>
              {/if}
            </a>
          {/each}
        </div>
      {/if}
    </Card.Content>
  </Card.Root>
{/if}
