<script>
  import { onMount } from 'svelte';
  import LoadingSpinner from '../LoadingSpinner.svelte';
  import * as Card from '$lib/components/ui/card/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
  import { cn } from '$lib/utils.js';
  import { loadSpaceEconomyInsiders } from './research-answers.js';

  let data = $state(/** @type {object | null} */ (null));
  let loading = $state(true);
  let sortBy = $state('total');

  const rows = $derived(data?.rows ?? []);
  const sorted = $derived.by(() => {
    return [...rows].sort((a, b) => {
      if (sortBy === 'ticker') return a.ticker.localeCompare(b.ticker);
      if (sortBy === 'form4') return (b.form4Count ?? 0) - (a.form4Count ?? 0);
      if (sortBy === 'sc13') return (b.sc13Count ?? 0) - (a.sc13Count ?? 0);
      return (b.total ?? 0) - (a.total ?? 0);
    });
  });

  function toggleSort(key) {
    sortBy = key;
  }

  onMount(() => {
    loadSpaceEconomyInsiders().then((d) => {
      data = d;
      loading = false;
    });
  });

  function sparkline(row, maxCount) {
    const months = row.monthlyCounts ?? [];
    if (!months.length) return '';
    const w = 80;
    const h = 18;
    const dx = w / Math.max(1, months.length - 1);
    const max = maxCount ?? Math.max(1, ...months.map((m) => m.count));
    const pts = months.map((m, i) => `${(i * dx).toFixed(1)},${(h - (m.count / max) * h).toFixed(1)}`).join(' ');
    return `<polyline fill="none" stroke="currentColor" stroke-width="1.2" points="${pts}" />`;
  }
</script>

{#if loading}
  <Card.Root>
    <Card.Content class="text-muted-foreground flex items-center gap-2 pt-6 text-sm">
      <LoadingSpinner />
      Loading insider filings…
    </Card.Content>
  </Card.Root>
{:else if !data || !rows.length}
  <Alert>
    <AlertTitle>No insider data</AlertTitle>
    <AlertDescription>Run <code class="text-xs">npm run rag:space-economy</code> to extract Form 3/4/5/SC 13 filings.</AlertDescription>
  </Alert>
{:else}
  <Card.Root>
    <Card.Header>
      <Card.Title>Insider transactions — last {data.windowDays}d</Card.Title>
      <Card.Description>
        Form 3/4/5 (officer & 10%-owner) and SC 13D/G (beneficial-ownership) filings from SEC submissions index.
        Cadence is the signal — high recent counts often mark lock-up expirations or coordinated divestment.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <div class="overflow-x-auto rounded-lg border">
        <table class="w-full text-xs">
          <thead class="bg-muted/40 text-muted-foreground border-b">
            <tr>
              <th scope="col" class="p-0 text-left">
                <button type="button" class="w-full px-3 py-2 text-[10px] font-semibold uppercase tracking-wide hover:bg-muted/60" onclick={() => toggleSort('ticker')}>Ticker</button>
              </th>
              <th scope="col" class="p-0 text-right">
                <button type="button" class="w-full px-3 py-2 text-[10px] font-semibold uppercase tracking-wide hover:bg-muted/60" onclick={() => toggleSort('total')}>Total</button>
              </th>
              <th scope="col" class="p-0 text-right">
                <button type="button" class="w-full px-3 py-2 text-[10px] font-semibold uppercase tracking-wide hover:bg-muted/60" onclick={() => toggleSort('form4')}>Form 4</button>
              </th>
              <th scope="col" class="p-0 text-right">
                <button type="button" class="w-full px-3 py-2 text-[10px] font-semibold uppercase tracking-wide hover:bg-muted/60" onclick={() => toggleSort('sc13')}>SC 13</button>
              </th>
              <th scope="col" class="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide">Monthly cadence</th>
              <th scope="col" class="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide">Latest 5</th>
            </tr>
          </thead>
          <tbody>
            {#each sorted as row (row.ticker)}
              <tr class="border-t hover:bg-muted/30">
                <th scope="row" class="px-3 py-2 text-left font-mono font-semibold">
                  {row.ticker}
                </th>
                <td class="px-3 py-2 text-right tabular-nums font-semibold">{row.total ?? 0}</td>
                <td class="px-3 py-2 text-right tabular-nums">{row.form4Count ?? 0}</td>
                <td class="px-3 py-2 text-right tabular-nums">{row.sc13Count ?? 0}</td>
                <td class="px-3 py-2">
                  <svg viewBox="0 0 80 18" width="80" height="18" class="text-primary">
                    {@html sparkline(row)}
                  </svg>
                </td>
                <td class="px-3 py-2">
                  <div class="flex flex-wrap gap-1">
                    {#each row.latest?.slice(0, 5) ?? [] as f}
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-primary hover:underline text-[10px] font-mono"
                        title={`${f.form} · ${f.filingDate} — open on EDGAR`}
                      >
                        {f.form}·{f.filingDate.slice(5)}
                      </a>
                    {/each}
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <p class="text-muted-foreground mt-3 text-[10px]">
        Counts are from each company's <code>submissions.json</code> recent block.
        Sparkline = monthly filing cadence over the past {data.windowDays} days. Click any badge to open the filing on EDGAR.
      </p>
    </Card.Content>
  </Card.Root>
{/if}
