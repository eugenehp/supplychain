<script>
  import { onMount } from 'svelte';
  import LoadingSpinner from '../LoadingSpinner.svelte';
  import * as Card from '$lib/components/ui/card/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
  import { loadSpaceEconomyTrends } from './research-answers.js';

  let data = $state(/** @type {object | null} */ (null));
  let loading = $state(true);
  let metric = $state('revenue');

  const companies = $derived(data?.companies ?? []);
  const labels = $derived(data?.seriesLabels ?? {});
  const metricOptions = $derived(Object.entries(labels));
  const valid = $derived(companies.filter((c) => c.series?.[metric]?.length));
  const sorted = $derived(
    [...valid].sort(
      (a, b) => (b.series[metric].at(-1)?.value ?? -Infinity) - (a.series[metric].at(-1)?.value ?? -Infinity),
    ),
  );

  onMount(() => {
    loadSpaceEconomyTrends().then((d) => { data = d; loading = false; });
  });

  function fmtValue(v, key) {
    if (v == null || !Number.isFinite(v)) return '—';
    if (key.endsWith('Pct')) return `${v.toFixed(1)}%`;
    const abs = Math.abs(v);
    const sign = v < 0 ? '−' : '';
    if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
    if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(0)}M`;
    if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`;
    return `${sign}$${abs.toFixed(0)}`;
  }

  function sparkline(series, w = 96, h = 24) {
    if (!series?.length) return '';
    const vals = series.map((p) => p.value).filter((v) => Number.isFinite(v));
    if (!vals.length) return '';
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    const dx = w / Math.max(1, series.length - 1);
    const pts = series.map((p, i) => {
      const y = h - (((p.value ?? min) - min) / range) * h;
      return `${(i * dx).toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    return `<polyline fill="none" stroke="currentColor" stroke-width="1.4" points="${pts}" />`;
  }
</script>

{#if loading}
  <Card.Root>
    <Card.Content class="text-muted-foreground flex items-center gap-2 pt-6 text-sm"><LoadingSpinner /> Loading trends…</Card.Content>
  </Card.Root>
{:else if !data || !valid.length}
  <Alert>
    <AlertTitle>No trends indexed</AlertTitle>
    <AlertDescription>Run <code class="text-xs">npm run rag:space-economy</code> to build the 5-year trend series.</AlertDescription>
  </Alert>
{:else}
  <Card.Root>
    <Card.Header class="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
      <div class="min-w-0 space-y-1">
        <Card.Title>Multi-year trends — last {data.years} FY</Card.Title>
        <Card.Description>
          XBRL annual series from companyfacts. Sparkline + first/last values. Click metric to switch.
        </Card.Description>
      </div>
      <div class="space-y-1">
        <Label class="text-muted-foreground text-[10px] uppercase tracking-wide">Metric</Label>
        <Select.Root type="single" value={metric} onValueChange={(v) => v && (metric = v)}>
          <Select.Trigger class="min-w-[200px]">{labels[metric]}</Select.Trigger>
          <Select.Content>
            {#each metricOptions as [k, l]}
              <Select.Item value={k} label={l}>{l}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
    </Card.Header>
    <Card.Content>
      <div class="overflow-x-auto rounded-lg border">
        <table class="w-full text-xs">
          <thead class="bg-muted/40 text-muted-foreground border-b">
            <tr>
              <th scope="col" class="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide">Ticker</th>
              <th scope="col" class="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide">First FY</th>
              <th scope="col" class="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide">Latest FY</th>
              <th scope="col" class="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide">CAGR</th>
              <th scope="col" class="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide">Trend</th>
            </tr>
          </thead>
          <tbody>
            {#each sorted as row (row.ticker)}
              {@const s = row.series[metric]}
              {@const first = s[0]}
              {@const last = s.at(-1)}
              {@const years = s.length - 1}
              {@const cagr = years > 0 && first?.value > 0 && Number.isFinite(last?.value)
                ? (Math.pow(last.value / first.value, 1 / years) - 1) * 100 : null}
              <tr class="border-t hover:bg-muted/30">
                <th scope="row" class="px-3 py-2 text-left font-mono font-semibold">{row.ticker}</th>
                <td class="px-3 py-2 text-right tabular-nums">
                  {fmtValue(first?.value, metric)}
                  {#if first}<span class="text-muted-foreground ml-1 text-[9px]">FY{first.fy}</span>{/if}
                </td>
                <td class="px-3 py-2 text-right tabular-nums font-semibold">
                  {fmtValue(last?.value, metric)}
                  {#if last}<span class="text-muted-foreground ml-1 text-[9px]">FY{last.fy}</span>{/if}
                </td>
                <td class="px-3 py-2 text-right tabular-nums">
                  {#if cagr != null}
                    <span class={cagr >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}>
                      {cagr >= 0 ? '+' : ''}{cagr.toFixed(1)}%
                    </span>
                  {:else}—{/if}
                </td>
                <td class="px-3 py-2"><svg viewBox="0 0 96 24" width="96" height="24" class="text-primary">{@html sparkline(s)}</svg></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </Card.Content>
  </Card.Root>
{/if}
