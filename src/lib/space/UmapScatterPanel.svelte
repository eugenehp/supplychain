<script>
  import { onMount } from 'svelte';
  import { scaleLinear } from 'd3-scale';
  import LoadingSpinner from '../LoadingSpinner.svelte';
  import ChartTooltip from '../ChartTooltip.svelte';
  import { pointerViewport } from '../chart-tooltip.js';
  import * as Card from '$lib/components/ui/card/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
  import { cn } from '$lib/utils.js';
  import { loadSpaceEconomyUmap } from './research-answers.js';

  /** @type {{ onOpenFiling?: (card: object) => void }} */
  let { onOpenFiling } = $props();

  let data = $state(/** @type {object | null} */ (null));
  let loading = $state(true);
  let tooltip = $state({ show: false, x: 0, y: 0, html: '' });
  let groupFilter = $state('all');
  let shardFilter = $state('all');
  /** @type {HTMLDivElement | null} */
  let container = $state(null);
  let containerWidth = $state(720);

  const points = $derived(data?.points ?? []);
  const shards = $derived.by(() => {
    if (!points.length) return [];
    const set = new Set(points.map((p) => p.shard).filter(Boolean));
    return [...set].sort();
  });
  const filteredPoints = $derived(
    points.filter((p) => {
      if (groupFilter !== 'all' && p.group !== groupFilter) return false;
      if (shardFilter !== 'all' && p.shard !== shardFilter) return false;
      return true;
    }),
  );

  const PALETTE = {
    sec: '#2563eb',     // blue — SEC filings
    report: '#f97316',  // orange — public reports
    other: '#94a3b8',
  };

  const groupLabel = $derived(
    groupFilter === 'all' ? 'All sources' : data?.groups?.find((g) => g.id === groupFilter)?.label ?? groupFilter,
  );
  const shardLabel = $derived(shardFilter === 'all' ? 'All filers / reports' : shardFilter);

  const PLOT_HEIGHT = 440;
  const PLOT_PADDING = 24;
  const xScale = $derived(
    scaleLinear()
      .domain([-1.05, 1.05])
      .range([PLOT_PADDING, Math.max(PLOT_PADDING + 200, containerWidth - PLOT_PADDING)]),
  );
  const yScale = $derived(
    scaleLinear()
      .domain([-1.05, 1.05])
      .range([PLOT_HEIGHT - PLOT_PADDING, PLOT_PADDING]),
  );

  function fillFor(point) {
    return PALETTE[point.group] ?? PALETTE.other;
  }

  function showTip(event, point) {
    const el = /** @type {SVGElement} */ (event.currentTarget);
    const { x, y } = pointerViewport(event, el);
    const sourceLine = point.group === 'report'
      ? `${point.agency ?? ''} · ${point.shard}`
      : `${point.ticker ?? point.shard ?? ''}${point.form ? ` · ${point.form}` : ''}${point.filingDate ? ` · ${point.filingDate}` : ''}`;
    const section = point.sectionHeader ? `<div class="text-muted-foreground text-[10px]">${point.sectionHeader}</div>` : '';
    tooltip = {
      show: true,
      x,
      y,
      html: `<div class="font-mono text-[10px]">${sourceLine}</div>${section}<div class="mt-1 max-w-[28rem]">${point.excerpt}</div>`,
    };
  }

  function hideTip() {
    tooltip = { show: false, x: 0, y: 0, html: '' };
  }

  function handleClick(point) {
    if (!onOpenFiling) return;
    if (point.group === 'report') return;          // public-report excerpts don't open the SEC viewer
    if (!point.ticker || point.charOffset == null) return;
    onOpenFiling({
      ticker: point.ticker,
      form: point.form,
      filingDate: point.filingDate,
      sectionId: point.sectionId,
      sectionHeader: point.sectionHeader,
      charOffset: point.charOffset,
      excerpt: point.excerpt,
    });
  }

  onMount(() => {
    loadSpaceEconomyUmap().then((d) => {
      data = d;
      loading = false;
    });

    if (typeof ResizeObserver !== 'undefined' && container) {
      const ro = new ResizeObserver(() => {
        containerWidth = container?.clientWidth ?? 720;
      });
      ro.observe(container);
      containerWidth = container.clientWidth || 720;
      return () => ro.disconnect();
    }
  });
</script>

{#if loading}
  <Card.Root>
    <Card.Content class="text-muted-foreground flex items-center gap-2 pt-6 text-sm">
      <LoadingSpinner />
      Loading UMAP projection…
    </Card.Content>
  </Card.Root>
{:else if !data || !points.length}
  <Alert>
    <AlertTitle>No UMAP projection</AlertTitle>
    <AlertDescription>Run <code class="text-xs">npm run rag:space-economy</code> with embeddings enabled to generate the 2D scatter.</AlertDescription>
  </Alert>
{:else}
  <Card.Root>
    <Card.Header>
      <Card.Title>Semantic map (UMAP) — corpus topology</Card.Title>
      <Card.Description>
        {data.pointCount.toLocaleString()} chunks from MiniLM-L6-v2 embeddings projected to 2D via UMAP.
        Nearby points cover similar topics regardless of which company or report they came from.
        Hover for the passage; click an SEC point to open it in the filing viewer.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <div class="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
        <div class="space-y-1">
          <Label class="text-muted-foreground text-[10px] uppercase tracking-wide">Source group</Label>
          <Select.Root type="single" value={groupFilter} onValueChange={(v) => v && (groupFilter = v)}>
            <Select.Trigger class="w-full">{groupLabel}</Select.Trigger>
            <Select.Content>
              <Select.Item value="all" label="All sources">All sources</Select.Item>
              {#each data.groups as g}
                <Select.Item value={g.id} label={g.label}>{g.label}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>
        <div class="space-y-1">
          <Label class="text-muted-foreground text-[10px] uppercase tracking-wide">Filer / report</Label>
          <Select.Root type="single" value={shardFilter} onValueChange={(v) => v && (shardFilter = v)}>
            <Select.Trigger class="w-full font-mono text-xs">{shardLabel}</Select.Trigger>
            <Select.Content>
              <Select.Item value="all" label="All filers / reports">All filers / reports</Select.Item>
              {#each shards as s}
                <Select.Item value={s} label={s}>{s}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>
        <Badge variant="secondary" class="text-xs">{filteredPoints.length} of {data.pointCount}</Badge>
      </div>

      <div bind:this={container} class="relative rounded-lg border bg-muted/10">
        <svg
          viewBox={`0 0 ${containerWidth} ${PLOT_HEIGHT}`}
          width="100%"
          height={PLOT_HEIGHT}
          role="img"
          aria-label="UMAP 2D projection of the space-economy corpus"
        >
          <g>
            {#each filteredPoints as p, i (p.shard + '-' + i)}
              <circle
                cx={xScale(p.x)}
                cy={yScale(p.y)}
                r={p.group === 'report' ? 2.5 : 2.2}
                fill={fillFor(p)}
                fill-opacity={p.group === 'report' ? 0.55 : 0.7}
                stroke="none"
                class={cn(p.group === 'sec' && p.charOffset != null && 'cursor-pointer')}
                onmouseenter={(e) => showTip(e, p)}
                onmousemove={(e) => showTip(e, p)}
                onmouseleave={hideTip}
                onclick={() => handleClick(p)}
              />
            {/each}
          </g>
        </svg>
      </div>

      <div class="flex flex-wrap gap-3 text-xs">
        {#each data.groups as g}
          <span class="inline-flex items-center gap-1.5">
            <span class="inline-block size-2.5 rounded-full" style="background:{PALETTE[g.id]}"></span>
            <span>{g.label}</span>
          </span>
        {/each}
        <span class="text-muted-foreground ml-auto">
          Projection seeded randomly; relative cluster positions change between runs, but cluster membership is stable.
        </span>
      </div>
    </Card.Content>
  </Card.Root>
{/if}

<ChartTooltip show={tooltip.show} x={tooltip.x} y={tooltip.y} html={tooltip.html} />
