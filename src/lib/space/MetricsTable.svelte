<script>
  import { onMount } from 'svelte';
  import LoadingSpinner from '../LoadingSpinner.svelte';
  import * as Card from '$lib/components/ui/card/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
  import { cn } from '$lib/utils.js';
  import { loadSpaceEconomyMetrics } from './research-answers.js';

  /** @type {{ onOpenFiling?: (card: object) => void }} */
  let { onOpenFiling } = $props();

  let data = $state(/** @type {object | null} */ (null));
  let loading = $state(true);
  let sortBy = $state('revenue');
  let sortDir = $state(/** @type {'desc' | 'asc'} */ ('desc'));

  const companies = $derived(data?.companies ?? []);
  const columns = $derived(data?.columns ?? []);

  const sorted = $derived.by(() => {
    if (!companies.length) return [];
    return [...companies].sort((a, b) => {
      const va = sortValue(a, sortBy);
      const vb = sortValue(b, sortBy);
      if (va == null && vb == null) return a.ticker.localeCompare(b.ticker);
      if (va == null) return 1;
      if (vb == null) return -1;
      return sortDir === 'desc' ? vb - va : va - vb;
    });
  });

  function sortValue(row, key) {
    const cell = row[key];
    if (cell == null) return null;
    if (typeof cell === 'number') return cell;
    if (typeof cell === 'object' && cell.value != null) return cell.value;
    return null;
  }

  function toggleSort(key) {
    if (sortBy === key) {
      sortDir = sortDir === 'desc' ? 'asc' : 'desc';
    } else {
      sortBy = key;
      sortDir = 'desc';
    }
  }

  function fmtCurrency(value, signed = false) {
    if (value == null || !Number.isFinite(value)) return '—';
    const abs = Math.abs(value);
    const sign = value < 0 ? '−' : signed ? '+' : '';
    if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
    if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(0)}M`;
    if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`;
    return `${sign}$${abs.toFixed(0)}`;
  }

  function fmtPct(value, precision = 1) {
    if (value == null || !Number.isFinite(value)) return '—';
    return `${value.toFixed(precision)}%`;
  }

  function fmtNumber(value, precision = 1) {
    if (value == null || !Number.isFinite(value)) return '—';
    return value.toFixed(precision);
  }

  function cellDisplay(row, col) {
    const cell = row[col.key];
    if (cell == null) return { text: '—', subtitle: null };
    if (col.kind === 'currency') {
      const v = typeof cell === 'object' ? cell.value : cell;
      return { text: fmtCurrency(v), subtitle: cell.end ?? null };
    }
    if (col.kind === 'currency-signed') {
      const v = typeof cell === 'object' ? cell.value : cell;
      return { text: fmtCurrency(v, true), subtitle: cell.end ?? null };
    }
    if (col.kind === 'percent') {
      return { text: fmtPct(cell, col.precision ?? 1), subtitle: null };
    }
    if (col.kind === 'number') {
      return { text: fmtNumber(cell, col.precision ?? 1), subtitle: null };
    }
    if (col.kind === 'percent-narrative') {
      // From narrative numericValue captures.
      if (cell?.raw) {
        return { text: `${cell.raw}%`, subtitle: cell.sectionHeader ?? null, narrative: cell };
      }
      return { text: '—', subtitle: null };
    }
    return { text: String(cell), subtitle: null };
  }

  function openNarrativeCell(narrative, row) {
    if (!narrative || !onOpenFiling) return;
    onOpenFiling({
      ticker: row.ticker,
      form: row.filing?.form ?? null,
      filingDate: row.filing?.filingDate ?? null,
      sectionId: narrative.sectionId ?? null,
      sectionHeader: narrative.sectionHeader ?? null,
      charOffset: narrative.charOffset,
      excerpt: narrative.excerpt,
      matchedText: `${narrative.raw}%`,
    });
  }

  onMount(() => {
    loadSpaceEconomyMetrics().then((d) => {
      data = d;
      loading = false;
    });
  });
</script>

{#if loading}
  <Card.Root>
    <Card.Content class="text-muted-foreground flex items-center gap-2 pt-6 text-sm">
      <LoadingSpinner />
      Loading cross-filer metrics…
    </Card.Content>
  </Card.Root>
{:else if !data || !columns.length}
  <Alert>
    <AlertTitle>No metrics data</AlertTitle>
    <AlertDescription>Run <code class="text-xs">npm run rag:space-economy</code> to extract XBRL facts.</AlertDescription>
  </Alert>
{:else}
  <Card.Root>
    <Card.Header>
      <Card.Title>Side-by-side metrics — all 15 filers</Card.Title>
      <Card.Description>
        Pulled from XBRL company facts (revenue, R&D, capex, cash) and narrative captures (gov %, top-customer %).
        Click a column header to sort. Click a percentage cell to open the supporting passage.
      </Card.Description>
    </Card.Header>
    <Card.Content class="pb-2">
      <div class="overflow-x-auto rounded-lg border">
        <table class="w-full text-xs">
          <thead class="bg-muted/40 text-muted-foreground border-b">
            <tr>
              <th scope="col" class="sticky left-0 z-10 bg-muted/40 px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide">
                Ticker
              </th>
              {#each columns as col}
                <th scope="col" class={cn('whitespace-nowrap p-0 text-right', sortBy === col.key && 'text-foreground')}>
                  <button
                    type="button"
                    class="group flex w-full items-center justify-end gap-1 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    onclick={() => toggleSort(col.key)}
                    aria-sort={sortBy === col.key ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
                    title={`Sort by ${col.label}`}
                  >
                    <span>{col.label}</span>
                    {#if sortBy === col.key}
                      <span aria-hidden="true">{sortDir === 'desc' ? '▼' : '▲'}</span>
                    {:else}
                      <span class="text-muted-foreground/60 opacity-0 group-hover:opacity-100" aria-hidden="true">▾</span>
                    {/if}
                  </button>
                </th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each sorted as row (row.ticker)}
              <tr class="border-t hover:bg-muted/30">
                <th scope="row" class="sticky left-0 z-10 bg-card px-3 py-2 text-left font-mono font-semibold">
                  <div class="flex flex-col gap-0.5">
                    <span>{row.ticker}</span>
                    {#if row.filing?.filingDate}
                      <span class="text-muted-foreground text-[9px] font-normal">{row.filing.filingDate}</span>
                    {/if}
                  </div>
                </th>
                {#each columns as col}
                  {@const display = cellDisplay(row, col)}
                  <td class="px-3 py-2 text-right tabular-nums">
                    {#if display.narrative}
                      <button
                        type="button"
                        class="text-primary underline-offset-2 hover:underline"
                        onclick={() => openNarrativeCell(display.narrative, row)}
                        title={display.narrative.excerpt}
                      >
                        {display.text}
                      </button>
                    {:else}
                      <span class={display.text === '—' ? 'text-muted-foreground/60' : ''}>{display.text}</span>
                    {/if}
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <p class="text-muted-foreground mt-3 text-[10px]">
        Currency cells reflect the most recent reported fiscal-year value from companyfacts XBRL.
        Percentages with a citation are narrative captures from the Q&A panel — click to view the source passage.
      </p>
    </Card.Content>
  </Card.Root>
{/if}
