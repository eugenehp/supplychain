<script>
  import { onMount } from 'svelte';
  import LoadingSpinner from '../LoadingSpinner.svelte';
  import * as Card from '$lib/components/ui/card/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
  import { cn } from '$lib/utils.js';
  import { loadSpaceEconomyWordCloud } from './research-answers.js';

  /** @type {{ onRunQuery?: (query: string, mode: string) => void }} */
  let { onRunQuery } = $props();

  let data = $state(/** @type {object | null} */ (null));
  let loading = $state(true);

  const terms = $derived(data?.terms ?? []);
  const maxCount = $derived(terms[0]?.count ?? 1);
  const minCount = $derived(terms[terms.length - 1]?.count ?? 1);

  // Log-scaled font size 11px → 38px.
  function fontSize(count) {
    const span = Math.log(maxCount) - Math.log(minCount);
    if (span <= 0) return 18;
    const t = (Math.log(count) - Math.log(minCount)) / span;
    return Math.round(11 + t * 27);
  }

  function fontWeight(count) {
    const t = (count - minCount) / Math.max(1, maxCount - minCount);
    if (t > 0.6) return 700;
    if (t > 0.3) return 600;
    return 500;
  }

  function tone(count, idx) {
    const t = (count - minCount) / Math.max(1, maxCount - minCount);
    if (t > 0.55) return 'text-primary';
    if (t > 0.3) return 'text-foreground';
    if (idx % 3 === 0) return 'text-muted-foreground';
    return 'text-foreground/80';
  }

  function handleClick(term) {
    if (!onRunQuery) return;
    onRunQuery(term.term, 'hybrid');
  }

  onMount(() => {
    loadSpaceEconomyWordCloud().then((d) => {
      data = d;
      loading = false;
    });
  });
</script>

{#if loading}
  <Card.Root>
    <Card.Content class="text-muted-foreground flex items-center gap-2 pt-6 text-sm">
      <LoadingSpinner />
      Loading word cloud…
    </Card.Content>
  </Card.Root>
{:else if !data || !terms.length}
  <Alert>
    <AlertTitle>No word cloud indexed</AlertTitle>
    <AlertDescription>Run <code class="text-xs">npm run rag:space-economy</code> to build the word cloud.</AlertDescription>
  </Alert>
{:else}
  <Card.Root>
    <Card.Header class="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
      <div class="min-w-0 space-y-1">
        <Card.Title>Corpus word cloud</Card.Title>
        <Card.Description>
          {data.termCount} terms · {data.tokenCount?.toLocaleString()} tokens · {data.chunkCount?.toLocaleString()} chunks scanned.
          Document-frequency weighted (each term counts once per chunk). Click any term to run it as a hybrid search.
        </Card.Description>
      </div>
      <Badge variant="secondary" class="shrink-0 text-xs">Top {Math.min(terms.length, 250)}</Badge>
    </Card.Header>
    <Card.Content>
      <div
        class="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-2 rounded-lg border bg-muted/10 p-6"
        aria-label="Word cloud — click a term to search"
      >
        {#each terms as t, idx (t.key)}
          <button
            type="button"
            class={cn(
              'hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring rounded-sm',
              'transition-transform hover:scale-105',
              tone(t.count, idx),
            )}
            style="font-size:{fontSize(t.count)}px; font-weight:{fontWeight(t.count)}; line-height:1.05;"
            onclick={() => handleClick(t)}
            title={`${t.term} · ${t.count} chunks · top: ${t.byShard?.[0]?.shard ?? '—'}`}
          >
            {t.term}
          </button>
        {/each}
      </div>
      <p class="text-muted-foreground mt-3 text-[10px]">
        Drawn from indexed text after stopword + SEC-boilerplate removal. Font size is logarithmic in document frequency.
        Click a term to seed the search panel below with a hybrid query.
      </p>
    </Card.Content>
  </Card.Root>
{/if}
