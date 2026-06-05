<script>
  import { onMount } from 'svelte';
  import { scaleTime, scaleLinear } from 'd3-scale';
  import { line as d3line, curveMonotoneX } from 'd3-shape';
  import { extent } from 'd3-array';
  import LoadingSpinner from '../LoadingSpinner.svelte';
  import * as Card from '$lib/components/ui/card/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
  import { cn } from '$lib/utils.js';
  import {
    loadSpaceEconomyPricesIndex,
    loadSpaceEconomyPrices,
    loadSpaceEconomyTimelineIndex,
    loadSpaceEconomyTimeline,
  } from './research-answers.js';

  let index = $state(/** @type {object | null} */ (null));
  let timelineIndex = $state(/** @type {object | null} */ (null));
  let loading = $state(true);
  let selected = $state(/** @type {string | null} */ (null));
  let prices = $state(/** @type {object | null} */ (null));
  let timeline = $state(/** @type {object | null} */ (null));
  let detailLoading = $state(false);

  const W = 800;
  const H = 280;
  const PAD = 36;

  const valid = $derived(
    [...(index?.tickers ?? [])].filter((t) => !t.error && t.pointCount > 0).sort((a, b) => a.ticker.localeCompare(b.ticker)),
  );

  /** @param {number | null | undefined} pct */
  function fmtWindowReturn(pct) {
    if (pct == null) return '—';
    return (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
  }

  const CATEGORY_COLOR = {
    contract: '#10b981',
    earnings: '#3b82f6',
    'm-and-a': '#a855f7',
    financing: '#f59e0b',
    distress: '#ef4444',
    governance: '#06b6d4',
    disclosure: '#64748b',
    other: '#94a3b8',
  };

  $effect(() => {
    if (!selected) return;
    detailLoading = true;
    Promise.all([
      loadSpaceEconomyPrices(selected),
      loadSpaceEconomyTimeline(selected),
    ]).then(([p, t]) => {
      prices = p;
      timeline = t;
      detailLoading = false;
    });
  });

  onMount(() => {
    Promise.all([
      loadSpaceEconomyPricesIndex(),
      loadSpaceEconomyTimelineIndex(),
    ]).then(([p, t]) => {
      index = p;
      timelineIndex = t;
      loading = false;
      selected = p?.tickers?.find((x) => !x.error && x.pointCount > 0)?.ticker ?? null;
    });
  });

  const xScale = $derived.by(() => {
    if (!prices?.points?.length) return null;
    return scaleTime().domain(extent(prices.points, (d) => new Date(d.date))).range([PAD, W - PAD]);
  });
  const yScale = $derived.by(() => {
    if (!prices?.points?.length) return null;
    const e = extent(prices.points, (d) => d.close);
    const pad = (e[1] - e[0]) * 0.08;
    return scaleLinear().domain([e[0] - pad, e[1] + pad]).range([H - PAD, PAD]);
  });
  const pricePath = $derived.by(() => {
    if (!xScale || !yScale) return '';
    const ln = d3line().x((d) => xScale(new Date(d.date))).y((d) => yScale(d.close)).curve(curveMonotoneX);
    return ln(prices.points) ?? '';
  });

  const eventDots = $derived.by(() => {
    if (!timeline?.events?.length || !prices?.points?.length) return [];
    if (!xScale || !yScale) return [];
    const priceByDate = new Map(prices.points.map((p) => [p.date, p.close]));
    const dates = prices.points.map((p) => p.date);
    function closestPrice(target) {
      if (priceByDate.has(target)) return priceByDate.get(target);
      // Find closest date ≤ target
      let bestDate = null;
      for (const d of dates) {
        if (d > target) break;
        bestDate = d;
      }
      return bestDate ? priceByDate.get(bestDate) : null;
    }
    return timeline.events
      .map((e) => {
        const px = closestPrice(e.filingDate);
        if (!Number.isFinite(px)) return null;
        return { x: xScale(new Date(e.filingDate)), y: yScale(px), event: e };
      })
      .filter(Boolean);
  });
</script>

{#if loading}
  <Card.Root>
    <Card.Content class="text-muted-foreground flex items-center gap-2 pt-6 text-sm"><LoadingSpinner /> Loading prices…</Card.Content>
  </Card.Root>
{:else if !index || !valid.length}
  <Alert>
    <AlertTitle>No price history indexed</AlertTitle>
    <AlertDescription>Run <code class="text-xs">npm run rag:space-economy</code> to fetch Stooq prices.</AlertDescription>
  </Alert>
{:else}
  <Card.Root>
    <Card.Header class="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
      <div class="min-w-0 space-y-1">
        <Card.Title>Price + 8-K event overlay</Card.Title>
        <Card.Description>
          Daily close (Stooq.com) with 8-K filings as colored dots — category by color. Click a dot's tooltip to read which event landed on which date.
        </Card.Description>
      </div>
      <div class="space-y-1">
        <Label class="text-muted-foreground text-[10px] uppercase tracking-wide">Ticker</Label>
        <Select.Root type="single" value={selected ?? ''} onValueChange={(v) => v && (selected = v)}>
          <Select.Trigger class="min-w-[180px] font-mono">{selected}</Select.Trigger>
          <Select.Content>
            {#each valid as t}
              <Select.Item value={t.ticker} label={t.ticker}>
                <span class="flex w-full items-center justify-between gap-3">
                  <span class="font-mono">{t.ticker}</span>
                  <span class={cn('text-[10px]', t.windowReturnPct >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300')}>
                    {fmtWindowReturn(t.windowReturnPct)}
                  </span>
                </span>
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
    </Card.Header>
    <Card.Content class="space-y-3">
      {#if detailLoading || !prices}
        <p class="text-muted-foreground flex items-center gap-2 text-sm"><LoadingSpinner /> Loading {selected}…</p>
      {:else}
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="secondary">{prices.points?.length ?? 0} bars</Badge>
          <Badge variant="outline">{prices.summary?.first?.date} → {prices.summary?.last?.date}</Badge>
          {#if prices.summary?.ytdReturnPct != null}
            <Badge variant="default" class={prices.summary.ytdReturnPct >= 0 ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-red-500/20 text-red-700 dark:text-red-300'}>
              {prices.summary.ytdReturnPct >= 0 ? '+' : ''}{prices.summary.ytdReturnPct.toFixed(1)}% window return
            </Badge>
          {/if}
          {#if timeline?.total}
            <Badge variant="outline">{timeline.total} 8-K events overlaid</Badge>
          {/if}
        </div>

        <div class="rounded-lg border bg-muted/10 p-2">
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img">
            {#if pricePath}
              <path d={pricePath} fill="none" stroke="var(--primary)" stroke-width="1.5" />
            {/if}
            {#each eventDots as dot}
              <g>
                <circle cx={dot.x} cy={dot.y} r="4.5" fill={CATEGORY_COLOR[dot.event.category] ?? '#94a3b8'} fill-opacity="0.85" stroke="#fff" stroke-width="1"
                  ><title>{dot.event.filingDate + ' · ' + dot.event.category + ' · ' + dot.event.summary}</title></circle>
              </g>
            {/each}
            <line x1={PAD} x2={W-PAD} y1={H-PAD} y2={H-PAD} stroke="var(--border)" />
            <line x1={PAD} x2={PAD} y1={PAD} y2={H-PAD} stroke="var(--border)" />
          </svg>
        </div>

        <div class="flex flex-wrap gap-3 text-xs">
          {#each Object.entries(CATEGORY_COLOR) as [cat, color]}
            <span class="inline-flex items-center gap-1.5">
              <span class="inline-block size-2.5 rounded-full" style="background:{color}"></span>
              <span class="text-muted-foreground">{cat}</span>
            </span>
          {/each}
        </div>
      {/if}
    </Card.Content>
  </Card.Root>
{/if}
