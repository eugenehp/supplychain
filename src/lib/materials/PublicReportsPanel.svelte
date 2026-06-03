<script>
  import * as Card from '$lib/components/ui/card/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { highlightMatch } from './materials-search.js';
  import { cn } from '$lib/utils.js';
  import { useMaterialsExcerpt, payloadFromReportExcerpt } from './use-materials-excerpt.js';
  import { effectiveSourceUrl } from './materials-source-link.js';

  /** @type {{ publicReports: object | null, searchQuery?: string }} */
  let { publicReports = null, searchQuery = '' } = $props();

  const openExcerpt = useMaterialsExcerpt();

  const reports = $derived(publicReports?.reports ?? []);
  /** @type {Set<string>} */
  let expanded = $state(new Set());

  /** @param {string} id */
  function toggle(id) {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    expanded = next;
  }
</script>

{#if reports.length}
  <section id="public-reports" class="ui-section" aria-label="Public commodity reports">
    <h2 class="text-foreground mb-2 text-lg font-semibold">Public reports & statistics</h2>
    <p class="text-muted-foreground mb-4 max-w-[720px] text-sm leading-relaxed">
      Government and industry publications (USGS MCS, DOE, IEA, BGS, EU CRMA) parsed with the same REE extraction
      pipeline. Expand a report to read indexed excerpts; use search above to query across all report text.
    </p>
    <div class="grid gap-3 md:grid-cols-2">
      {#each reports as row (row.id)}
        <Card.Root class={row.excerpts?.length ? 'border-primary/20' : ''}>
          <Card.Header class="pb-2">
            <Card.Title class="text-base">{row.title}</Card.Title>
            <Card.Description>
              {row.publisher} · {row.year}
              {#if row.topics?.length}
                <span class="mt-1 flex flex-wrap gap-1">
                  {#each row.topics as topic}
                    <Badge variant="secondary" class="text-[10px] font-normal">{topic}</Badge>
                  {/each}
                </span>
              {/if}
            </Card.Description>
          </Card.Header>
          <Card.Content class="text-sm">
            {#if row.fetched}
              <p class="mt-0 m-0 text-xs">
                {#if row.fetched.textLength > 2000}
                  <span class="text-primary">Parsed</span> — {row.fetched.textLength.toLocaleString()} chars
                  {#if row.fetched.sourceType}
                    ({row.fetched.sourceType})
                  {/if}
                  {#if row.mentionCount}
                    · {row.mentionCount} REE mentions indexed
                  {/if}
                  {#if effectiveSourceUrl(row)}
                    · <a
                      href={effectiveSourceUrl(row)}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-primary underline-offset-2 hover:underline">full report</a
                    >
                  {/if}
                {:else}
                  <span class="text-amber-600">Awaiting text</span> — {row.fetched.error ?? 'fetch failed'}
                {/if}
              </p>
            {/if}

            {#if row.elementMentions?.length}
              <div class="mt-3 flex flex-wrap gap-1">
                {#each row.elementMentions as sym}
                  <Badge variant="outline" class="font-mono text-[10px]">{sym}</Badge>
                {/each}
              </div>
            {/if}

            {#if row.excerpts?.length}
              <button
                type="button"
                class="text-primary mt-3 text-xs font-medium underline-offset-2 hover:underline"
                onclick={() => toggle(row.id)}
              >
                {expanded.has(row.id) ? 'Hide excerpts' : `Show ${row.excerpts.length} excerpt${row.excerpts.length === 1 ? '' : 's'}`}
              </button>

              {#if expanded.has(row.id)}
                <div class="mt-3 flex flex-col gap-2">
                  {#each row.excerpts as ex}
                    <button
                      type="button"
                      class={cn(
                        'border-primary/30 bg-muted/30 text-muted-foreground hover:bg-muted/50 m-0 w-full border-l-2 py-2 pl-3 text-left text-xs leading-relaxed transition-colors',
                        'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                      )}
                      onclick={() => openExcerpt?.(payloadFromReportExcerpt(row, ex))}
                      title="View full report with excerpt highlighted"
                    >
                      {#if ex.symbol}
                        <Badge variant="outline" class="mb-1 font-mono text-[10px]">{ex.symbol}</Badge>
                      {/if}
                      <span class="result-snippet italic">
                        "{@html highlightMatch(ex.text, searchQuery)}"
                      </span>
                      <span class="text-primary mt-1 block text-[10px] not-italic underline">View in report →</span>
                    </button>
                  {/each}
                </div>
              {/if}
            {:else if row.fetched?.textLength > 2000}
              <p class="text-muted-foreground mt-2 m-0 text-xs">
                No REE excerpts indexed yet — run <code class="text-[10px]">npm run rag</code> after fetching reports.
              </p>
            {/if}
          </Card.Content>
        </Card.Root>
      {/each}
    </div>
  </section>
{/if}

<style>
  .result-snippet :global(mark) {
    background: rgba(118, 185, 0, 0.35);
    color: inherit;
    border-radius: 2px;
    padding: 0 0.1em;
  }
</style>
