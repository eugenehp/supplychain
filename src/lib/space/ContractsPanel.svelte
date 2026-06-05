<script>
  import { onMount } from 'svelte';
  import LoadingSpinner from '../LoadingSpinner.svelte';
  import * as Card from '$lib/components/ui/card/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
  import { cn } from '$lib/utils.js';
  import { loadSpaceEconomyContractsIndex, loadSpaceEconomyContracts } from './research-answers.js';

  let index = $state(/** @type {object | null} */ (null));
  let loading = $state(true);
  let selected = $state(/** @type {string | null} */ (null));
  let detail = $state(/** @type {object | null} */ (null));
  let detailLoading = $state(false);

  const ranked = $derived((index?.tickers ?? []).filter((t) => !t.error && t.totalAmount > 0).sort((a, b) => b.totalAmount - a.totalAmount));

  $effect(() => {
    if (!selected) return;
    detailLoading = true;
    loadSpaceEconomyContracts(selected).then((d) => { detail = d; detailLoading = false; });
  });

  onMount(() => {
    loadSpaceEconomyContractsIndex().then((d) => {
      index = d;
      loading = false;
      selected = d?.tickers?.find((t) => !t.error && t.totalAmount > 0)?.ticker ?? null;
    });
  });

  function fmt$(v) {
    if (!Number.isFinite(v)) return '—';
    if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
    return `$${v.toFixed(0)}`;
  }
</script>

{#if loading}
  <Card.Root>
    <Card.Content class="text-muted-foreground flex items-center gap-2 pt-6 text-sm"><LoadingSpinner /> Loading federal contracts…</Card.Content>
  </Card.Root>
{:else if !index || !ranked.length}
  <Alert>
    <AlertTitle>No federal contracts indexed</AlertTitle>
    <AlertDescription>Run <code class="text-xs">npm run rag:space-economy</code> to fetch USAspending awards.</AlertDescription>
  </Alert>
{:else}
  <Card.Root>
    <Card.Header class="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
      <div class="min-w-0 space-y-1">
        <Card.Title>Federal contract awards — USAspending (last {index.years}y)</Card.Title>
        <Card.Description>
          Obligated $ from federal contract awards, aggregated by year and awarding agency. Hard-dollar evidence
          for the "US Gov %" narrative. Source: USAspending.gov.
        </Card.Description>
      </div>
      <div class="space-y-1">
        <Label class="text-muted-foreground text-[10px] uppercase tracking-wide">Filer</Label>
        <Select.Root type="single" value={selected ?? ''} onValueChange={(v) => v && (selected = v)}>
          <Select.Trigger class="min-w-[220px] font-mono">
            {selected} · {fmt$(ranked.find((r) => r.ticker === selected)?.totalAmount ?? 0)}
          </Select.Trigger>
          <Select.Content>
            {#each ranked as t}
              <Select.Item value={t.ticker} label={t.ticker}>
                <span class="flex w-full items-center justify-between gap-3">
                  <span class="font-mono">{t.ticker}</span>
                  <span class="text-muted-foreground text-[10px]">{fmt$(t.totalAmount)} · {t.awardCount} awards</span>
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
              <th scope="col" class="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide">Total ({index.years}y)</th>
              <th scope="col" class="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide">Awards</th>
              <th scope="col" class="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide">Top agency</th>
              <th scope="col" class="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide">Recipient matched</th>
            </tr>
          </thead>
          <tbody>
            {#each ranked as r (r.ticker)}
              <tr class={cn('border-t hover:bg-muted/30 cursor-pointer', selected === r.ticker && 'bg-primary/5')} onclick={() => (selected = r.ticker)}>
                <th scope="row" class="px-3 py-2 text-left font-mono font-semibold">{r.ticker}</th>
                <td class="px-3 py-2 text-right tabular-nums font-semibold">{fmt$(r.totalAmount)}</td>
                <td class="px-3 py-2 text-right tabular-nums">{r.awardCount}</td>
                <td class="px-3 py-2 text-[11px]">{r.topAgency ?? '—'}</td>
                <td class="px-3 py-2 text-muted-foreground text-[10px] italic">{r.recipientUsed ?? '—'}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      {#if detailLoading || !detail}
        <p class="text-muted-foreground flex items-center gap-2 text-sm"><LoadingSpinner /> Loading detail…</p>
      {:else if detail.topAwards?.length}
        <div class="space-y-3">
          <h3 class="text-foreground text-sm font-semibold">{selected} · top awards</h3>
          <div class="space-y-2">
            {#each detail.topAwards as a}
              <div class="rounded-md border bg-card p-3 text-xs">
                <div class="mb-1 flex flex-wrap items-center gap-2">
                  <Badge variant="default">{fmt$(a.amount)}</Badge>
                  <Badge variant="outline" class="text-[10px]">{a.agency ?? '—'}</Badge>
                  {#if a.subAgency}<Badge variant="outline" class="text-[10px]">{a.subAgency}</Badge>{/if}
                  <span class="text-muted-foreground text-[10px]">{a.periodStart ?? ''} → {a.periodEnd ?? ''}</span>
                </div>
                <div class="text-foreground/90 mb-1 leading-relaxed">{a.description}</div>
                <div class="text-muted-foreground text-[10px]">
                  {a.recipient} · NAICS {a.naics ?? '—'} · PSC {a.psc ?? '—'}
                </div>
              </div>
            {/each}
          </div>
          {#if detail.byAgency?.length}
            <div>
              <h4 class="text-muted-foreground text-[10px] uppercase tracking-wide font-semibold">By agency</h4>
              <div class="mt-1 flex flex-wrap gap-1.5">
                {#each detail.byAgency as ag}
                  <Badge variant="outline" class="text-[10px]">{ag.agency}: {fmt$(ag.amount)}</Badge>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </Card.Content>
  </Card.Root>
{/if}
