<script>
  import * as Card from '$lib/components/ui/card/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { cn } from '$lib/utils.js';
  import { useMaterialsExcerpt } from './use-materials-excerpt.js';
  import { effectiveSourceUrl } from './materials-source-link.js';
  import { CHAIN_STAGE_BY_ID } from './value-chain-labels.js';

  /** @type {{ international: object | null, searchQuery?: string }} */
  let { international = null, searchQuery = '' } = $props();

  const openExcerpt = useMaterialsExcerpt();
  const regimes = $derived(international?.regimes ?? []);
  /** @type {Set<string>} */
  let expanded = $state(new Set());

  /** @param {string} id */
  function toggle(id) {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    expanded = next;
  }

  /** @param {object} row @param {object} ex */
  function openIntlExcerpt(row, ex) {
    openExcerpt?.({
      text: ex.text,
      charStart: ex.charStart ?? null,
      charEnd: ex.charEnd ?? null,
      symbol: ex.symbol ?? undefined,
      sourceId: ex.sourceId ?? row.id,
      ticker: row.localTicker ?? row.id,
      sourceRegime: row.listingRegime,
      title: row.name,
      subtitle: `${row.listingRegime} · ${row.homeFormLabel ?? ''}`,
      filingUrl: effectiveSourceUrl(row),
    });
  }

  /** @param {string} stage */
  function stageLabel(stage) {
    return CHAIN_STAGE_BY_ID[stage]?.shortLabel ?? stage;
  }
</script>

{#if regimes.length}
  <section id="international-filings" class="ui-section" aria-label="International filings">
    <h2 class="text-foreground mb-2 text-lg font-semibold">International filings (SEC counterparts)</h2>
    <p class="text-muted-foreground mb-4 max-w-[720px] text-sm leading-relaxed">
      Annual reports from non-U.S. exchanges parsed with the same rare-earth extraction pipeline. Click excerpts
      to open full source text with highlighted passages.
    </p>
    <div class="grid gap-3 md:grid-cols-2">
      {#each regimes as row (row.id)}
        <Card.Root class={row.excerpts?.length ? 'border-primary/20' : ''}>
          <Card.Header class="pb-2">
            <Card.Title class="flex flex-wrap items-center gap-2 text-base">
              <span>{row.flag ?? ''}</span>
              <span>{row.name}</span>
              <Badge variant="outline" class="font-mono text-[10px]">{row.localTicker}</Badge>
              {#if row.chainStage}
                <Badge variant="secondary" class="text-[10px]">{stageLabel(row.chainStage)}</Badge>
              {/if}
            </Card.Title>
            <Card.Description>
              {row.listingRegime} · {row.homeFormLabel}
            </Card.Description>
          </Card.Header>
          <Card.Content class="text-sm">
            <p class="text-muted-foreground m-0">
              <span class="text-foreground font-medium">SEC counterpart:</span>
              {row.secCounterpart}
            </p>
            {#if row.primaryElements?.length}
              <div class="mt-2 flex flex-wrap gap-1">
                {#each row.primaryElements as sym}
                  <Badge variant="outline" class="font-mono text-[10px]">{sym}</Badge>
                {/each}
              </div>
            {/if}
            {#if row.fetched}
              <p class="mt-2 m-0 text-xs">
                {#if row.fetched.textLength > 3000}
                  <span class="text-primary">Parsed</span> — {row.fetched.textLength.toLocaleString()} chars
                  {#if row.fetched.sourceType}
                    ({row.fetched.sourceType})
                  {/if}
                  {#if effectiveSourceUrl(row)}
                    · <a
                      href={effectiveSourceUrl(row)}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-primary underline-offset-2 hover:underline">source</a
                    >
                  {/if}
                {:else}
                  <span class="text-amber-600">Awaiting text</span> — {row.fetched.error ?? 'fetch failed'}
                {/if}
              </p>
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
                      )}
                      onclick={() => openIntlExcerpt(row, ex)}
                      title="View full filing with excerpt highlighted"
                    >
                      {#if ex.symbol}
                        <Badge variant="outline" class="mb-1 font-mono text-[10px]">{ex.symbol}</Badge>
                      {/if}
                      <span class="italic">"{ex.text.slice(0, 180)}{ex.text.length > 180 ? '…' : ''}"</span>
                      <span class="text-primary mt-1 block text-[10px] not-italic underline">View in filing →</span>
                    </button>
                  {/each}
                </div>
              {/if}
            {:else if row.fetched?.textLength > 3000}
              <p class="text-muted-foreground mt-2 m-0 text-xs">No REE excerpts indexed for this filing yet.</p>
            {/if}
          </Card.Content>
        </Card.Root>
      {/each}
    </div>
  </section>
{/if}
