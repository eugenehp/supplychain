<script>
  import { onMount } from 'svelte';
  import LoadingSpinner from '../LoadingSpinner.svelte';
  import * as Card from '$lib/components/ui/card/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
  import { cn } from '$lib/utils.js';
  import { loadSpaceEconomyDeepDives } from './research-answers.js';

  /** @type {{ onOpenFiling?: (card: object) => void }} */
  let { onOpenFiling } = $props();

  let data = $state(/** @type {object | null} */ (null));
  let loading = $state(true);
  let selected = $state(/** @type {string | null} */ (null));

  const dives = $derived(data?.deepDives ?? []);
  const current = $derived(dives.find((d) => d.id === selected) ?? dives[0] ?? null);

  onMount(() => {
    loadSpaceEconomyDeepDives().then((d) => {
      data = d;
      loading = false;
      if (d?.deepDives?.length) selected = d.deepDives[0].id;
    });
  });

  function highlightMatch(excerpt, matchedText) {
    if (!excerpt || !matchedText) return excerpt;
    const escaped = matchedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(${escaped})`, 'i');
    return excerpt.replace(re, '<mark>$1</mark>');
  }
</script>

{#if loading}
  <Card.Root>
    <Card.Content class="text-muted-foreground flex items-center gap-2 pt-6 text-sm">
      <LoadingSpinner />
      Loading deep-dive case studies…
    </Card.Content>
  </Card.Root>
{:else if !current}
  <Alert>
    <AlertTitle>No deep-dives indexed</AlertTitle>
    <AlertDescription>Run <code class="text-xs">npm run rag:space-economy</code> to generate deep-dive evidence.</AlertDescription>
  </Alert>
{:else}
  <Card.Root>
    <Card.Header class="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
      <div class="min-w-0 space-y-1">
        <Card.Title>Deep-dive case studies</Card.Title>
        <Card.Description>{current.subtitle}</Card.Description>
      </div>
      <div class="flex shrink-0 items-end gap-2">
        <div class="space-y-1">
          <Label for="deepdive-pick" class="text-muted-foreground text-[10px] uppercase tracking-wide">Case study</Label>
          <Select.Root type="single" value={current.id} onValueChange={(v) => v && (selected = v)}>
            <Select.Trigger id="deepdive-pick" class="min-w-[220px]">{current.title}</Select.Trigger>
            <Select.Content>
              {#each dives as d}
                <Select.Item value={d.id} label={d.title}>
                  <span class="flex flex-col gap-0.5">
                    <span>{d.title}</span>
                    <span class="text-muted-foreground text-[10px]">{d.totalCards} excerpts</span>
                  </span>
                </Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>
      </div>
    </Card.Header>

    <Card.Content class="space-y-4">
      <div class="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="secondary">{current.totalCards} evidence excerpts</Badge>
        {#if current.anchorTicker}
          <Badge variant="outline" class="font-mono">{current.anchorTicker}</Badge>
        {/if}
        {#if current.tickerScope?.length && current.tickerScope.length <= 6}
          <span class="text-muted-foreground">
            Scope: {current.tickerScope.join(', ')}
          </span>
        {:else if current.tickerScope?.length}
          <span class="text-muted-foreground">Scope: {current.tickerScope.length} filers</span>
        {/if}
      </div>

      {#each current.sections as section (section.id)}
        <section class="rounded-lg border">
          <header class="bg-muted/30 flex flex-wrap items-center justify-between gap-2 rounded-t-lg border-b px-4 py-2">
            <div class="min-w-0 space-y-0.5">
              <h3 class="text-foreground m-0 text-sm font-semibold leading-snug">{section.title}</h3>
              <p class="text-muted-foreground m-0 text-xs leading-relaxed">{section.hint}</p>
            </div>
            <Badge variant="outline" class="text-[10px]">
              {section.cardCount} excerpts · {section.tickersDisclosing} filer{section.tickersDisclosing === 1 ? '' : 's'}
            </Badge>
          </header>

          <div class="space-y-2 p-3">
            {#if section.cards?.length}
              {#each section.cards as card, ci (card.ticker + ci)}
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
                    <span class="text-primary ml-auto text-[10px] font-medium underline">Open in filing →</span>
                  </span>
                  <p class="text-muted-foreground deepdive-excerpt m-0 italic">
                    {@html highlightMatch(card.excerpt, card.matchedText)}
                  </p>
                </button>
              {/each}
            {:else}
              <p class="text-muted-foreground p-2 text-xs italic">No disclosures in scope.</p>
            {/if}
          </div>
        </section>
      {/each}
    </Card.Content>
  </Card.Root>
{/if}

<style>
  .deepdive-excerpt :global(mark) {
    background: rgba(118, 185, 0, 0.35);
    color: inherit;
    border-radius: 2px;
    padding: 0 0.1em;
  }
</style>
