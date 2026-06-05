<script>
  import { onMount } from 'svelte';
  import LoadingSpinner from '../LoadingSpinner.svelte';
  import * as Card from '$lib/components/ui/card/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
  import { cn } from '$lib/utils.js';
  import { loadSpaceEconomyResearchAnswers, groupQuestionsByCategory } from './research-answers.js';

  /** @type {{
   *   onRunQuery?: (query: string, mode: string) => void,
   *   onOpenFiling?: (card: object) => void,
   * }} */
  let { onRunQuery, onOpenFiling } = $props();

  let answers = $state(/** @type {object | null} */ (null));
  let loading = $state(true);

  const groups = $derived(answers ? groupQuestionsByCategory(answers) : []);
  const totalAnswers = $derived(answers?.questions?.reduce((n, q) => n + (q.answerCount ?? 0), 0) ?? 0);
  const totalDisclosing = $derived(answers?.tickerCount ?? 0);

  onMount(() => {
    loadSpaceEconomyResearchAnswers().then((data) => {
      answers = data;
      loading = false;
    });
  });

  function formatNumeric(numeric) {
    if (!numeric) return null;
    if (numeric.unit?.includes('%')) return `${numeric.raw}${numeric.unit.replace('%', '%')}`;
    const value = numeric.value;
    if (typeof value !== 'number') return null;
    const scale = value >= 1000 ? 'B' : 'M';
    const display = value >= 1000 ? (value / 1000).toFixed(1) : Math.round(value);
    return `$${display}${scale}${numeric.unit ? ` (${numeric.unit})` : ''}`;
  }

  function highlightMatch(excerpt, matchedText) {
    if (!excerpt || !matchedText) return excerpt;
    const escaped = matchedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(${escaped})`, 'i');
    return excerpt.replace(re, '<mark>$1</mark>');
  }

  function formatRange(numeric) {
    if (!numeric) return null;
    const fmt = (v) => (Number.isFinite(v) ? Math.round(v * 10) / 10 : '—');
    const unit = numeric.unit?.includes('%') ? '%' : numeric.unit ?? '';
    if (numeric.min === numeric.max) return `${fmt(numeric.min)}${unit} (n=${numeric.samples})`;
    return `${fmt(numeric.min)}${unit} – ${fmt(numeric.max)}${unit} · median ${fmt(numeric.median)}${unit} (n=${numeric.samples})`;
  }

  function summaryHeadlineAction(q) {
    if (!q.summary?.attribution || !q.summary?.headline) return null;
    return {
      ticker: q.summary.attribution.ticker,
      sectionHeader: q.summary.attribution.sectionHeader,
      filingDate: q.summary.attribution.filingDate,
      charOffset: q.summary.attribution.charOffset,
      excerpt: q.summary.headline,
    };
  }
</script>

{#if loading}
  <Card.Root>
    <Card.Content class="text-muted-foreground flex items-center gap-2 pt-6 text-sm">
      <LoadingSpinner />
      Loading research questions…
    </Card.Content>
  </Card.Root>
{:else if !answers || !groups.length}
  <Alert>
    <AlertTitle>No research answers indexed yet</AlertTitle>
    <AlertDescription>
      Run <code class="text-xs">npm run rag:space-economy</code> to extract per-question evidence from SEC filings.
    </AlertDescription>
  </Alert>
{:else}
  <Card.Root>
    <Card.Header>
      <Card.Title>Research questions — answered from the corpus</Card.Title>
      <Card.Description>
        {answers.questions.length} questions · {totalAnswers} evidence excerpts from {totalDisclosing} SEC filers.
        Click a passage to open the filing at that page, or rerun any question as a live hybrid search.
      </Card.Description>
    </Card.Header>

    <Card.Content class="space-y-4">
      {#each groups as group, gi (group.category)}
        <details class="group rounded-lg border" open={gi === 0}>
          <summary
            class="hover:bg-muted/40 flex cursor-pointer list-none items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold select-none focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
          >
            <span
              class="text-muted-foreground inline-block transition-transform group-open:rotate-90"
              aria-hidden="true">▶</span
            >
            <span class="text-foreground">{group.category}</span>
            <Badge variant="outline" class="ml-auto text-xs">{group.questions.length} questions · {group.totalAnswers} excerpts</Badge>
          </summary>

          <div class="divide-y border-t">
            {#each group.questions as q (q.id)}
              <section class="px-4 py-4">
                <header class="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div class="min-w-0 flex-1 space-y-1">
                    <h3 class="text-foreground m-0 text-sm font-semibold leading-snug">{q.question}</h3>
                    <p class="text-muted-foreground m-0 text-xs leading-relaxed">{q.hint}</p>
                  </div>
                  <div class="flex shrink-0 items-center gap-2">
                    <Badge variant="secondary" class="text-[10px]">
                      {q.tickersDisclosing}/{totalDisclosing} disclose
                    </Badge>
                    {#if onRunQuery && q.defaultQuery}
                      <Button
                        size="sm"
                        variant="outline"
                        onclick={() => onRunQuery(q.defaultQuery, q.defaultMode ?? 'hybrid')}
                        title="Run this as a live hybrid search"
                      >
                        Run as query
                      </Button>
                    {/if}
                  </div>
                </header>

                {#if q.summary?.headline}
                  <div class="bg-primary/5 border-primary/30 mb-3 rounded-md border-l-4 p-3">
                    <div class="text-foreground text-[11px] font-semibold uppercase tracking-wide opacity-70">
                      Summary
                    </div>
                    <div class="text-muted-foreground mt-1 text-xs leading-relaxed">
                      {q.summary.coverage}
                    </div>
                    {#if q.summary.numeric}
                      <div class="mt-1.5 flex items-center gap-2 text-[11px]">
                        <Badge variant="default" class="text-[10px]">{formatRange(q.summary.numeric)}</Badge>
                      </div>
                    {/if}
                    <button
                      type="button"
                      class="text-foreground hover:text-primary mt-2 block w-full text-left text-xs leading-relaxed italic focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none rounded-sm"
                      onclick={() => onOpenFiling?.(summaryHeadlineAction(q))}
                      title="Open this passage in the filing"
                    >
                      "{q.summary.headline}"
                      <span class="text-muted-foreground mt-1 block not-italic text-[10px]">
                        — {q.summary.attribution.ticker}{q.summary.attribution.sectionHeader ? ', ' + q.summary.attribution.sectionHeader : ''}{q.summary.attribution.filingDate ? ' · ' + q.summary.attribution.filingDate : ''}
                        <span class="text-primary ml-1 underline">open →</span>
                      </span>
                    </button>
                    {#if q.summary.topTickers?.length > 1}
                      <div class="mt-2 flex flex-wrap gap-1">
                        <span class="text-muted-foreground text-[10px] uppercase tracking-wide">Most exposed:</span>
                        {#each q.summary.topTickers as t}
                          <Badge variant="outline" class="font-mono text-[10px]">{t.ticker} · {t.cardCount}</Badge>
                        {/each}
                      </div>
                    {/if}
                    {#if q.summary.themes?.length}
                      <div class="mt-1.5 flex flex-wrap gap-1">
                        <span class="text-muted-foreground text-[10px] uppercase tracking-wide">Themes:</span>
                        {#each q.summary.themes as theme}
                          <Badge variant="secondary" class="text-[10px]">{theme.phrase} ({theme.count})</Badge>
                        {/each}
                      </div>
                    {/if}
                  </div>
                {/if}

                {#if q.answers?.length}
                  <div class="flex flex-col gap-2">
                    {#each q.answers as card, ci (card.ticker + ci)}
                      <button
                        type="button"
                        class={cn(
                          'border-primary/30 bg-muted/30 hover:bg-muted/50 m-0 w-full border-l-2 p-3 text-left text-xs leading-relaxed transition-colors',
                          'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none rounded-r-md',
                        )}
                        onclick={() => onOpenFiling?.(card)}
                        title="Open filing at this passage"
                      >
                        <span class="mb-1.5 flex flex-wrap items-center gap-2">
                          <Badge variant="outline" class="font-mono text-[10px]">{card.ticker}</Badge>
                          {#if card.form}
                            <span class="text-muted-foreground text-[10px]">{card.form}{card.filingDate ? ' · ' + card.filingDate : ''}</span>
                          {/if}
                          {#if card.sectionHeader}
                            <span class="text-muted-foreground text-[10px] truncate">{card.sectionHeader}</span>
                          {/if}
                          {#if card.numericValue}
                            <Badge variant="default" class="text-[10px]">{formatNumeric(card.numericValue)}</Badge>
                          {/if}
                          <span class="text-primary ml-auto text-[10px] font-medium underline">Open in filing →</span>
                        </span>
                        <p class="text-muted-foreground research-excerpt m-0 italic">
                          {@html highlightMatch(card.excerpt, card.matchedText)}
                        </p>
                      </button>
                    {/each}
                  </div>
                {:else}
                  <p class="text-muted-foreground text-xs italic">No filer in the watchlist discloses this. Try "Run as query" to search the full corpus.</p>
                {/if}
              </section>
            {/each}
          </div>
        </details>
      {/each}
    </Card.Content>
  </Card.Root>
{/if}

<style>
  .research-excerpt :global(mark) {
    background: rgba(118, 185, 0, 0.35);
    color: inherit;
    border-radius: 2px;
    padding: 0 0.1em;
  }
  summary::-webkit-details-marker {
    display: none;
  }
</style>
