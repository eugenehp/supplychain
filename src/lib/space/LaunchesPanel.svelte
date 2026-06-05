<script>
  import { onMount } from 'svelte';
  import LoadingSpinner from '../LoadingSpinner.svelte';
  import * as Card from '$lib/components/ui/card/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
  import { loadSpaceEconomyLaunches } from './research-answers.js';

  let data = $state(/** @type {object | null} */ (null));
  let loading = $state(true);
  let operatorFilter = $state('all');

  const launches = $derived(data?.launches ?? []);
  const filtered = $derived(
    operatorFilter === 'all' ? launches : launches.filter((l) => l.operator === operatorFilter)
  );
  const operators = $derived(['all', ...(data?.byOperator ?? []).map((o) => o.operator)]);

  const OPERATOR_PALETTE = {
    'SpaceX (private)': '#1F2937',
    'CASC': '#DC2626',
    'Roscosmos': '#2563EB',
    'Rocket Lab': '#16A34A',
    'Blue Origin (private)': '#0EA5E9',
    'ArianeGroup': '#7C3AED',
    'ULA (Boeing/Lockheed)': '#0E2A47',
    'MHI': '#F59E0B',
    'ISRO': '#EA580C',
    'Northrop Grumman': '#A855F7',
    'Avio': '#D946EF',
    Other: '#94A3B8',
  };

  /** Build a stacked monthly series — top-6 operators + "Other". */
  const monthlyStack = $derived.by(() => {
    if (!filtered.length) return { months: [], topOperators: [], series: {} };
    const topOps = (data?.byOperator ?? []).slice(0, 6).map((o) => o.operator);
    const isTop = new Set(topOps);
    /** @type {Map<string, Map<string, number>>} */
    const buckets = new Map();
    const monthSet = new Set();
    for (const l of filtered) {
      const m = l.date.slice(0, 7);
      monthSet.add(m);
      const opKey = l.operator && isTop.has(l.operator) ? l.operator : 'Other';
      const monthMap = buckets.get(m) ?? new Map();
      monthMap.set(opKey, (monthMap.get(opKey) ?? 0) + 1);
      buckets.set(m, monthMap);
    }
    const months = [...monthSet].sort();
    /** @type {Record<string, number[]>} */
    const series = {};
    const opOrder = [...topOps, 'Other'];
    for (const op of opOrder) {
      series[op] = months.map((m) => buckets.get(m)?.get(op) ?? 0);
    }
    return { months, topOperators: opOrder, series };
  });

  const W = 800;
  const H = 200;
  const PAD = { top: 12, right: 12, bottom: 28, left: 36 };

  function buildBars() {
    const stack = monthlyStack;
    if (!stack.months.length) return [];
    const totals = stack.months.map((_, i) => stack.topOperators.reduce((s, op) => s + (stack.series[op]?.[i] ?? 0), 0));
    const max = Math.max(1, ...totals);
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const barW = innerW / stack.months.length;
    const segments = [];
    for (let i = 0; i < stack.months.length; i++) {
      const x = PAD.left + i * barW;
      let yBottom = H - PAD.bottom;
      for (const op of stack.topOperators) {
        const n = stack.series[op]?.[i] ?? 0;
        if (n === 0) continue;
        const segH = (n / max) * innerH;
        segments.push({
          x: x + 1,
          y: yBottom - segH,
          w: Math.max(1, barW - 2),
          h: segH,
          op,
          n,
          month: stack.months[i],
          total: totals[i],
        });
        yBottom -= segH;
      }
    }
    return { segments, max, totals, months: stack.months };
  }

  const bars = $derived(buildBars());

  onMount(() => {
    loadSpaceEconomyLaunches().then((d) => { data = d; loading = false; });
  });
</script>

{#if loading}
  <Card.Root>
    <Card.Content class="text-muted-foreground flex items-center gap-2 pt-6 text-sm"><LoadingSpinner /> Loading launch manifest…</Card.Content>
  </Card.Root>
{:else if !data || data.error}
  <Alert>
    <AlertTitle>Launch manifest unavailable</AlertTitle>
    <AlertDescription>GCAT fetch failed. Run <code class="text-xs">npm run rag:space-economy</code>.</AlertDescription>
  </Alert>
{:else}
  <Card.Root>
    <Card.Header>
      <Card.Title>Launch manifest — last {data.years}y (Jonathan's Space Pages / GCAT)</Card.Title>
      <Card.Description>
        {data.totalLaunches.toLocaleString()} orbital + suborbital launches catalogued, <strong>{data.taggedLaunches}</strong> tagged
        to a watchlist operator. Tag is by launch-vehicle / site pattern — e.g. <em>Electron</em> → Rocket Lab, <em>Falcon 9</em> → SpaceX (private).
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <div class="grid items-end gap-3 sm:grid-cols-[1fr_auto]">
        <div class="space-y-1">
          <Label class="text-muted-foreground text-[10px] uppercase tracking-wide">Operator</Label>
          <Select.Root type="single" value={operatorFilter} onValueChange={(v) => v && (operatorFilter = v)}>
            <Select.Trigger class="min-w-[260px]">{operatorFilter === 'all' ? 'All operators' : operatorFilter}</Select.Trigger>
            <Select.Content>
              {#each operators as op}
                <Select.Item value={op} label={op === 'all' ? 'All operators' : op}>
                  {op === 'all' ? 'All operators' : op}
                </Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>
        <Badge variant="secondary" class="text-xs">{filtered.length.toLocaleString()} launches</Badge>
      </div>

      {#if bars?.segments?.length}
        <div class="space-y-2">
          <h3 class="text-muted-foreground text-[10px] uppercase tracking-wide font-semibold">Monthly launches by operator (top {monthlyStack.topOperators.length - 1} + Other)</h3>
          <div class="rounded-lg border bg-muted/10 p-2">
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Monthly launches stacked by operator">
              <!-- y-axis baseline -->
              <line x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} stroke="var(--border)" />
              {#each bars.segments as seg}
                <rect
                  x={seg.x}
                  y={seg.y}
                  width={seg.w}
                  height={seg.h}
                  fill={OPERATOR_PALETTE[seg.op] ?? '#94A3B8'}
                  fill-opacity="0.92"
                ><title>{seg.month + ' · ' + seg.op + ': ' + seg.n + ' launch' + (seg.n === 1 ? '' : 'es') + ' (month total ' + seg.total + ')'}</title></rect>
              {/each}
              <!-- y-axis ticks: max + half -->
              <text x={PAD.left - 4} y={PAD.top + 6} font-size="9" text-anchor="end" fill="var(--muted-foreground)">{bars.max}</text>
              <text x={PAD.left - 4} y={(PAD.top + (H - PAD.bottom)) / 2 + 3} font-size="9" text-anchor="end" fill="var(--muted-foreground)">{Math.round(bars.max / 2)}</text>
              <!-- x-axis: first/middle/last month labels -->
              {#if bars.months?.length >= 1}
                <text x={PAD.left} y={H - 8} font-size="9" fill="var(--muted-foreground)">{bars.months[0]}</text>
                <text x={(W - PAD.right + PAD.left) / 2} y={H - 8} font-size="9" text-anchor="middle" fill="var(--muted-foreground)">{bars.months[Math.floor(bars.months.length / 2)]}</text>
                <text x={W - PAD.right} y={H - 8} font-size="9" text-anchor="end" fill="var(--muted-foreground)">{bars.months[bars.months.length - 1]}</text>
              {/if}
            </svg>
            <div class="mt-2 flex flex-wrap gap-3 text-[10px]">
              {#each monthlyStack.topOperators as op}
                <span class="inline-flex items-center gap-1.5">
                  <span class="inline-block size-2.5 rounded-sm" style="background:{OPERATOR_PALETTE[op] ?? '#94A3B8'}"></span>
                  <span class="text-muted-foreground">{op}</span>
                </span>
              {/each}
            </div>
          </div>
        </div>
      {/if}

      <div class="space-y-2">
        <h3 class="text-muted-foreground text-[10px] uppercase tracking-wide font-semibold">By operator (last {data.years}y)</h3>
        <div class="flex flex-wrap gap-1.5">
          {#each data.byOperator as op}
            <Badge variant={operatorFilter === op.operator ? 'default' : 'outline'} class="cursor-pointer text-[10px]" onclick={() => (operatorFilter = op.operator)}>
              {op.operator}: {op.count}
            </Badge>
          {/each}
        </div>
      </div>

      <div class="space-y-2">
        <h3 class="text-muted-foreground text-[10px] uppercase tracking-wide font-semibold">By year</h3>
        <div class="flex flex-wrap gap-1.5">
          {#each data.byYear as y}
            <Badge variant="outline" class="text-[10px]">{y.year}: {y.count}</Badge>
          {/each}
        </div>
      </div>

      <div class="space-y-2">
        <h3 class="text-foreground text-sm font-semibold">Recent launches</h3>
        <div class="max-h-[28rem] overflow-y-auto rounded-lg border">
          <table class="w-full text-xs">
            <thead class="bg-muted/40 text-muted-foreground border-b sticky top-0">
              <tr>
                <th scope="col" class="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide">Date</th>
                <th scope="col" class="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide">Vehicle</th>
                <th scope="col" class="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide">Mission</th>
                <th scope="col" class="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide">Site</th>
                <th scope="col" class="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide">Operator</th>
              </tr>
            </thead>
            <tbody>
              {#each filtered.slice(-200).reverse() as l, i (l.date + '-' + i)}
                <tr class="border-t hover:bg-muted/30">
                  <td class="px-3 py-1.5 font-mono">{l.date}</td>
                  <td class="px-3 py-1.5">{l.vehicle ?? '—'}</td>
                  <td class="px-3 py-1.5 text-muted-foreground">{l.mission ?? '—'}</td>
                  <td class="px-3 py-1.5 text-muted-foreground text-[10px]">{l.site ?? '—'}</td>
                  <td class="px-3 py-1.5">
                    {#if l.operator}
                      <Badge variant="outline" class="text-[10px]">{l.operator}</Badge>
                    {:else}
                      <span class="text-muted-foreground text-[10px]">—</span>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </Card.Content>
  </Card.Root>
{/if}
