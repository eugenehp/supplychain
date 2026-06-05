<script>
  import { onMount } from 'svelte';
  import LoadingSpinner from '../LoadingSpinner.svelte';
  import * as Card from '$lib/components/ui/card/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
  import { loadSpaceEconomyGlossary } from './research-answers.js';

  /** @type {{ onRunQuery?: (query: string, mode: string) => void }} */
  let { onRunQuery } = $props();

  let data = $state(/** @type {object | null} */ (null));
  let loading = $state(true);
  let categoryFilter = $state('all');
  let q = $state('');

  const entries = $derived(data?.entries ?? []);
  const filtered = $derived(
    entries.filter((e) => {
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
      if (q.trim()) {
        const needle = q.toLowerCase();
        if (
          !e.acronym.toLowerCase().includes(needle) &&
          !e.expansion?.toLowerCase().includes(needle) &&
          !(e.definition ?? '').toLowerCase().includes(needle)
        )
          return false;
      }
      return true;
    }),
  );

  const categories = $derived(['all', ...(data?.categories ?? [])]);

  onMount(() => {
    loadSpaceEconomyGlossary().then((d) => {
      data = d;
      loading = false;
    });
  });
</script>

{#if loading}
  <Card.Root>
    <Card.Content class="text-muted-foreground flex items-center gap-2 pt-6 text-sm">
      <LoadingSpinner />
      Loading glossary…
    </Card.Content>
  </Card.Root>
{:else if !data || !entries.length}
  <Alert>
    <AlertTitle>No glossary indexed</AlertTitle>
    <AlertDescription>Run <code class="text-xs">npm run rag:space-economy</code> to build the glossary.</AlertDescription>
  </Alert>
{:else}
  <Card.Root>
    <Card.Header>
      <Card.Title>Glossary — space-industry terms & acronyms</Card.Title>
      <Card.Description>
        {data.termCount} terms — {data.entries.filter((e) => e.source === 'curated').length} curated, {data.entries.filter((e) => e.source === 'corpus').length} auto-discovered from the corpus.
        Click "Run as query" on any term to search filings for it.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <div class="grid items-end gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div class="space-y-1">
          <Label class="text-muted-foreground text-[10px] uppercase tracking-wide">Search</Label>
          <Input bind:value={q} placeholder="ITAR, sole source, Part 450 …" />
        </div>
        <div class="space-y-1">
          <Label class="text-muted-foreground text-[10px] uppercase tracking-wide">Category</Label>
          <Select.Root type="single" value={categoryFilter} onValueChange={(v) => v && (categoryFilter = v)}>
            <Select.Trigger class="min-w-[160px]">{categoryFilter === 'all' ? 'All categories' : categoryFilter}</Select.Trigger>
            <Select.Content>
              {#each categories as cat}
                <Select.Item value={cat} label={cat === 'all' ? 'All categories' : cat}>
                  {cat === 'all' ? 'All categories' : cat}
                </Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>
        <Badge variant="secondary" class="text-xs">{filtered.length} of {entries.length}</Badge>
      </div>

      <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {#each filtered as entry (entry.acronym)}
          <div class="hover:border-primary/30 rounded-lg border bg-card p-3 transition-colors">
            <div class="mb-1 flex items-baseline justify-between gap-2">
              <span class="text-foreground font-mono text-sm font-semibold">{entry.acronym}</span>
              {#if entry.source === 'curated'}
                <Badge variant="default" class="text-[10px]">curated</Badge>
              {:else}
                <Badge variant="outline" class="text-[10px]">auto · {entry.corpusCount}×</Badge>
              {/if}
            </div>
            <div class="text-muted-foreground mb-1 text-xs italic">{entry.expansion}</div>
            {#if entry.definition}
              <p class="text-foreground/90 m-0 text-xs leading-relaxed">{entry.definition}</p>
            {:else if entry.sampleExcerpt}
              <p class="text-muted-foreground m-0 line-clamp-3 text-[11px] italic">"{entry.sampleExcerpt}"</p>
            {/if}
            <div class="mt-2 flex flex-wrap items-center justify-between gap-1 text-[10px]">
              <Badge variant="outline" class="text-[10px]">{entry.category}</Badge>
              {#if onRunQuery}
                <button
                  type="button"
                  class="text-primary hover:underline font-medium"
                  onclick={() => onRunQuery(entry.acronym, 'hybrid')}
                >Run as query →</button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </Card.Content>
  </Card.Root>
{/if}
