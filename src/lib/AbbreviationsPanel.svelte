<script>
  import { onMount } from 'svelte';
  import { GLOSSARY_GROUPS as FALLBACK_GROUPS } from './glossary.js';
  import LoadingSpinner from './LoadingSpinner.svelte';
  import * as Card from '$lib/components/ui/card/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js';

  let filter = $state('');
  let loading = $state(true);
  let error = $state('');
  /** @type {{ title: string, items: object[] }[]} */
  let groups = $state([]);
  /** @type {{ termCount?: number, uniqueAcronymsInCorpus?: number } | null} */
  let meta = $state(null);

  onMount(async () => {
    try {
      const res = await fetch('/rag/glossary.json');
      if (!res.ok) throw new Error('missing');
      const data = await res.json();
      groups = data.groups ?? [];
      meta = {
        termCount: data.termCount,
        uniqueAcronymsInCorpus: data.uniqueAcronymsInCorpus,
      };
    } catch {
      groups = FALLBACK_GROUPS;
      error = 'RAG glossary not built — run npm run pipeline. Showing core terms only.';
    } finally {
      loading = false;
    }
  });

  const filteredGroups = $derived.by(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return groups;

    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.abbr.toLowerCase().includes(q) ||
            item.name.toLowerCase().includes(q) ||
            item.definition.toLowerCase().includes(q),
        ),
      }))
      .filter((group) => group.items.length > 0);
  });

  const matchCount = $derived(
    filteredGroups.reduce((sum, group) => sum + group.items.length, 0),
  );
</script>

<Card.Root class="flex flex-col">
  <Card.Header class="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
    <div class="space-y-1">
      <Card.Title>Abbreviations</Card.Title>
      <Card.Description>
        {#if meta?.termCount}
          {meta.termCount} terms extracted from SEC filing chunks and evidence in the RAG index
          {#if meta.uniqueAcronymsInCorpus}
            ({meta.uniqueAcronymsInCorpus.toLocaleString()} raw acronym forms in corpus).
          {/if}
        {:else}
          Short forms used in filings, the Sankey chart, and search — explained in plain language.
        {/if}
      </Card.Description>
      {#if error}
        <Alert class="mt-2 py-2">
          <AlertDescription class="text-primary text-xs">{error}</AlertDescription>
        </Alert>
      {/if}
    </div>
    <div class="w-full max-w-[14rem] min-w-[10rem] space-y-2">
      <Label for="abbr-filter" class="sr-only">Filter abbreviations</Label>
      <Input
        id="abbr-filter"
        type="search"
        bind:value={filter}
        placeholder="Filter terms…"
        disabled={loading}
      />
    </div>
  </Card.Header>

  <Card.Content class="pt-0">
    {#if loading}
      <p class="text-muted-foreground flex items-center gap-2 text-sm">
        <LoadingSpinner />
        Loading glossary from RAG index…
      </p>
    {:else if matchCount === 0}
      <p class="text-muted-foreground text-sm">No terms match “{filter}”.</p>
    {:else}
      <div class="ui-card-scroll ui-card-scroll-sm space-y-6 pr-1">
          {#each filteredGroups as group}
            <section>
              <h3 class="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
                {group.title}
                <span class="font-normal opacity-75">({group.items.length})</span>
              </h3>
              <dl>
                {#each group.items as item}
                  <div class="border-t py-3 first:border-t-0 first:pt-0">
                    <dt class="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span class="text-primary font-mono text-sm font-bold">{item.abbr}</span>
                      <span class="text-muted-foreground text-sm">{item.name}</span>
                      {#if item.count}
                        <Badge variant="outline" class="font-mono text-[0.65rem]" title="Occurrences in RAG corpus">
                          {item.count}×
                        </Badge>
                      {/if}
                    </dt>
                    <dd class="text-muted-foreground m-0 text-sm leading-relaxed">{item.definition}</dd>
                  </div>
                {/each}
              </dl>
            </section>
          {/each}
      </div>
    {/if}
  </Card.Content>
</Card.Root>
