<script>
  import { onMount } from 'svelte';
  import LoadingSpinner from '../LoadingSpinner.svelte';
  import * as Card from '$lib/components/ui/card/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
  import { cn } from '$lib/utils.js';
  import {
    loadSpaceEconomyMetrics,
    loadSpaceEconomyTrends,
    loadSpaceEconomyConcentration,
    loadSpaceEconomyContractsIndex,
    loadSpaceEconomyRiskDiffsIndex,
    loadSpaceEconomyRiskDiff,
    loadSpaceEconomyInsiders,
    loadSpaceEconomyTimelineIndex,
  } from './research-answers.js';

  let loading = $state(true);
  let metrics = $state(null);
  let trends = $state(null);
  let concentration = $state(null);
  let contracts = $state(null);
  let riskIndex = $state(null);
  let insiders = $state(null);
  let timelineIndex = $state(null);

  let tickerA = $state(null);
  let tickerB = $state(null);
  let riskA = $state(null);
  let riskB = $state(null);

  const tickers = $derived((metrics?.companies ?? []).map((c) => c.ticker).sort());

  $effect(() => {
    if (tickerA) loadSpaceEconomyRiskDiff(tickerA).then((d) => (riskA = d));
  });
  $effect(() => {
    if (tickerB) loadSpaceEconomyRiskDiff(tickerB).then((d) => (riskB = d));
  });

  onMount(() => {
    Promise.all([
      loadSpaceEconomyMetrics(),
      loadSpaceEconomyTrends(),
      loadSpaceEconomyConcentration(),
      loadSpaceEconomyContractsIndex(),
      loadSpaceEconomyRiskDiffsIndex(),
      loadSpaceEconomyInsiders(),
      loadSpaceEconomyTimelineIndex(),
    ]).then(([m, t, c, ct, r, ins, tl]) => {
      metrics = m; trends = t; concentration = c; contracts = ct;
      riskIndex = r; insiders = ins; timelineIndex = tl;
      const ranked = (m?.companies ?? []).sort((a, b) => (b.revenue?.value ?? 0) - (a.revenue?.value ?? 0));
      tickerA = ranked[0]?.ticker ?? null;
      tickerB = ranked[1]?.ticker ?? null;
      loading = false;
    });
  });

  function getMetric(ticker, key) {
    const row = metrics?.companies?.find((c) => c.ticker === ticker);
    return row?.[key];
  }
  function getTrendSeries(ticker, key) {
    const row = trends?.companies?.find((c) => c.ticker === ticker);
    return row?.series?.[key] ?? [];
  }
  function getConcentration(ticker) {
    return concentration?.companies?.find((c) => c.ticker === ticker);
  }
  function getContracts(ticker) {
    return contracts?.tickers?.find((t) => t.ticker === ticker);
  }
  function getInsiders(ticker) {
    return insiders?.rows?.find((r) => r.ticker === ticker);
  }
  function getTimeline(ticker) {
    return timelineIndex?.tickers?.find((t) => t.ticker === ticker);
  }

  function fmt$(v) {
    if (!Number.isFinite(v)) return '—';
    const abs = Math.abs(v); const sign = v < 0 ? '−' : '';
    if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
    if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(0)}M`;
    if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`;
    return `${sign}$${abs.toFixed(0)}`;
  }
  function fmtPct(v) { return Number.isFinite(v) ? `${v.toFixed(1)}%` : '—'; }
  function fmtMetricValue(row, key) {
    if (!row) return '—';
    if (row.kind === 'percent') return fmtPct(row.value);
    return fmt$(row.value);
  }

  function sparkline(series, w = 80, h = 18) {
    if (!series?.length) return '';
    const vals = series.map((p) => p.value).filter((v) => Number.isFinite(v));
    if (!vals.length) return '';
    const min = Math.min(...vals); const max = Math.max(...vals);
    const range = max - min || 1;
    const dx = w / Math.max(1, series.length - 1);
    const pts = series.map((p, i) => `${(i * dx).toFixed(1)},${(h - (((p.value ?? min) - min) / range) * h).toFixed(1)}`).join(' ');
    return `<polyline fill="none" stroke="currentColor" stroke-width="1.4" points="${pts}" />`;
  }

  const ROWS = [
    { key: 'revenue', label: 'Revenue (latest FY)', currency: true },
    { key: 'grossMargin', label: 'Gross margin', percent: true },
    { key: 'rdPctRevenue', label: 'R&D / revenue', percent: true },
    { key: 'capex', label: 'Capex', currency: true },
    { key: 'cash', label: 'Cash', currency: true },
    { key: 'operatingCashFlow', label: 'Operating cash flow', currency: true, signed: true },
    { key: 'cashRunwayYears', label: 'Cash runway (yr)', number: true },
    { key: 'netIncome', label: 'Net income', currency: true, signed: true },
  ];

  function getCell(ticker, key) {
    const v = getMetric(ticker, key);
    if (v == null) return '—';
    if (typeof v === 'object' && v.value != null) return fmt$(v.value);
    if (typeof v === 'number') {
      const row = ROWS.find((r) => r.key === key);
      if (row?.percent) return fmtPct(v);
      if (row?.number) return v.toFixed(1);
      return fmt$(v);
    }
    return '—';
  }
</script>

{#if loading}
  <Card.Root>
    <Card.Content class="text-muted-foreground flex items-center gap-2 pt-6 text-sm"><LoadingSpinner /> Loading compare view…</Card.Content>
  </Card.Root>
{:else if !tickers.length}
  <Alert>
    <AlertTitle>No data to compare</AlertTitle>
    <AlertDescription>Run the pipeline first.</AlertDescription>
  </Alert>
{:else}
  <Card.Root>
    <Card.Header class="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
      <div class="min-w-0 space-y-1">
        <Card.Title>Side-by-side compare</Card.Title>
        <Card.Description>
          Pick two filers. Metrics / trends / concentration / contracts / risk-diff / 8-Ks / insiders rendered head-to-head.
        </Card.Description>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div class="space-y-1">
          <Label class="text-muted-foreground text-[10px] uppercase tracking-wide">Ticker A</Label>
          <Select.Root type="single" value={tickerA ?? ''} onValueChange={(v) => v && (tickerA = v)}>
            <Select.Trigger class="min-w-[120px] font-mono">{tickerA}</Select.Trigger>
            <Select.Content>{#each tickers as t}<Select.Item value={t} label={t}>{t}</Select.Item>{/each}</Select.Content>
          </Select.Root>
        </div>
        <div class="space-y-1">
          <Label class="text-muted-foreground text-[10px] uppercase tracking-wide">Ticker B</Label>
          <Select.Root type="single" value={tickerB ?? ''} onValueChange={(v) => v && (tickerB = v)}>
            <Select.Trigger class="min-w-[120px] font-mono">{tickerB}</Select.Trigger>
            <Select.Content>{#each tickers as t}<Select.Item value={t} label={t}>{t}</Select.Item>{/each}</Select.Content>
          </Select.Root>
        </div>
      </div>
    </Card.Header>

    <Card.Content class="space-y-6">
      <section>
        <h3 class="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wide">XBRL metrics</h3>
        <div class="overflow-x-auto rounded-lg border">
          <table class="w-full text-xs">
            <thead class="bg-muted/40 text-muted-foreground border-b">
              <tr>
                <th class="px-3 py-2 text-left text-[10px] uppercase tracking-wide">Metric</th>
                <th class="px-3 py-2 text-right text-[10px] font-mono">{tickerA}</th>
                <th class="px-3 py-2 text-right text-[10px] font-mono">{tickerB}</th>
              </tr>
            </thead>
            <tbody>
              {#each ROWS as row}
                <tr class="border-t hover:bg-muted/30">
                  <th scope="row" class="px-3 py-2 text-left text-muted-foreground font-normal">{row.label}</th>
                  <td class="px-3 py-2 text-right tabular-nums font-semibold">{getCell(tickerA, row.key)}</td>
                  <td class="px-3 py-2 text-right tabular-nums font-semibold">{getCell(tickerB, row.key)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 class="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wide">Revenue trend</h3>
        <div class="grid grid-cols-2 gap-3">
          {#each [tickerA, tickerB] as t}
            <div class="rounded-lg border bg-card p-3 text-xs">
              <div class="text-foreground mb-1 font-mono font-semibold">{t}</div>
              <svg viewBox="0 0 200 60" width="100%" height="60" class="text-primary">{@html sparkline(getTrendSeries(t, 'revenue'), 200, 60)}</svg>
              <div class="text-muted-foreground mt-1 text-[10px]">
                {getTrendSeries(t, 'revenue').length} FY ·
                first {fmt$(getTrendSeries(t, 'revenue')[0]?.value)} →
                last {fmt$(getTrendSeries(t, 'revenue').at(-1)?.value)}
              </div>
            </div>
          {/each}
        </div>
      </section>

      <section>
        <h3 class="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wide">Supplier concentration</h3>
        <div class="grid grid-cols-2 gap-3">
          {#each [tickerA, tickerB] as t}
            {@const c = getConcentration(t)}
            <div class="rounded-lg border bg-card p-3 text-xs">
              <div class="text-foreground mb-1 font-mono font-semibold">{t}</div>
              {#if c}
                <div class="space-y-0.5">
                  <div class="text-muted-foreground">Weighted HHI: <span class="text-foreground font-semibold">{c.weightedHHI.toFixed(3)}</span></div>
                  <div class="text-muted-foreground">Worst bucket: <span class="text-foreground font-semibold">{c.worstBucket}</span></div>
                  <div class="text-muted-foreground">Subsystems analyzed: {c.subsystemCount}</div>
                </div>
              {:else}
                <div class="text-muted-foreground italic">No data</div>
              {/if}
            </div>
          {/each}
        </div>
      </section>

      <section>
        <h3 class="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wide">Federal contracts (USAspending, 5y)</h3>
        <div class="grid grid-cols-2 gap-3">
          {#each [tickerA, tickerB] as t}
            {@const ct = getContracts(t)}
            <div class="rounded-lg border bg-card p-3 text-xs">
              <div class="text-foreground mb-1 font-mono font-semibold">{t}</div>
              {#if ct && ct.totalAmount > 0}
                <div class="text-muted-foreground">Total: <span class="text-foreground font-semibold">{fmt$(ct.totalAmount)}</span></div>
                <div class="text-muted-foreground">Awards: <span class="text-foreground font-semibold">{ct.awardCount}</span></div>
                <div class="text-muted-foreground">Top agency: <span class="text-foreground">{ct.topAgency ?? '—'}</span></div>
              {:else}
                <div class="text-muted-foreground italic">No contracts found</div>
              {/if}
            </div>
          {/each}
        </div>
      </section>

      <section>
        <h3 class="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wide">Risk-factor changes (YoY)</h3>
        <div class="grid grid-cols-2 gap-3">
          {#each [{ticker: tickerA, diff: riskA}, {ticker: tickerB, diff: riskB}] as col}
            <div class="rounded-lg border bg-card p-3 text-xs">
              <div class="text-foreground mb-1 font-mono font-semibold">{col.ticker}</div>
              {#if col.diff}
                <div class="flex gap-2">
                  <Badge variant="default" class="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">+{col.diff.addedCount} added</Badge>
                  <Badge variant="default" class="bg-red-500/20 text-red-700 dark:text-red-300">−{col.diff.removedCount} removed</Badge>
                </div>
                <div class="text-muted-foreground mt-1 text-[10px]">{col.diff.prior?.filingDate} → {col.diff.current?.filingDate}</div>
              {:else}
                <div class="text-muted-foreground italic">Loading…</div>
              {/if}
            </div>
          {/each}
        </div>
      </section>

      <section>
        <h3 class="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wide">Operational tempo</h3>
        <div class="grid grid-cols-2 gap-3">
          {#each [tickerA, tickerB] as t}
            {@const tl = getTimeline(t)}
            {@const ins = getInsiders(t)}
            <div class="rounded-lg border bg-card p-3 text-xs">
              <div class="text-foreground mb-1 font-mono font-semibold">{t}</div>
              <div class="text-muted-foreground">8-K filings (12mo): <span class="text-foreground font-semibold">{tl?.total ?? 0}</span></div>
              <div class="text-muted-foreground">Top category: <span class="text-foreground">{tl?.byCategory?.[0]?.category ?? '—'}</span></div>
              <div class="text-muted-foreground">Form 3/4/5/SC13 (12mo): <span class="text-foreground font-semibold">{ins?.total ?? 0}</span></div>
            </div>
          {/each}
        </div>
      </section>
    </Card.Content>
  </Card.Root>
{/if}
