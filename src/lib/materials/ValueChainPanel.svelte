<script>
  import * as Card from '$lib/components/ui/card/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Button } from '$lib/components/ui/button/index.js';

  /** @type {{ valueChain: object | null, selectedSymbol?: string | null, onElementSelect?: (s: string) => void, onScrollToMap?: () => void }} */
  let { valueChain = null, selectedSymbol = 'Nd', onElementSelect, onScrollToMap } = $props();

  const stages = $derived(valueChain?.byStage ?? []);
  const walkthrough = $derived(valueChain?.walkthrough ?? []);

  /** @param {string} stageId */
  function scrollToStageSites(stageId) {
    onScrollToMap?.();
    document.getElementById('mining-sites-map')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
</script>

{#if stages.length}
  <section id="value-chain" class="ui-section" aria-label="Rare earth value chain">
    <h2 class="text-foreground mb-2 text-lg font-semibold">Value chain: mine → magnet → OEM</h2>
    <p class="text-muted-foreground mb-4 max-w-[720px] text-sm leading-relaxed">
      {valueChain?.methodology ??
        'Physical stages from ore extraction through separation, magnet manufacturing, and end-use OEMs.'}
    </p>

    <div class="mb-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {#each stages as stage (stage.id)}
        <Card.Root class="border-muted">
          <Card.Header class="p-3 pb-1">
            <Card.Title class="text-xs font-semibold tracking-wide uppercase">{stage.shortLabel}</Card.Title>
          </Card.Header>
          <Card.Content class="p-3 pt-0">
            <p class="text-muted-foreground m-0 text-[11px] leading-snug">{stage.description}</p>
            <p class="text-foreground mt-2 mb-0 text-sm font-medium tabular-nums">
              {stage.sites?.length ?? 0} sites · {stage.companies?.length ?? 0} cos.
            </p>
          </Card.Content>
        </Card.Root>
      {/each}
    </div>

    <h3 class="text-foreground mb-2 text-sm font-semibold">Walkthrough: {selectedSymbol ?? 'Nd'} supply path</h3>
    <ol class="m-0 flex flex-col gap-2 p-0 list-none">
      {#each walkthrough as step, i}
        <li class="flex gap-3 rounded-lg border p-3 text-sm">
          <span
            class="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
            aria-hidden="true">{i + 1}</span
          >
          <div class="min-w-0 flex-1">
            <div class="mb-1 flex flex-wrap items-center gap-2">
              <Badge variant="outline" class="text-[10px] uppercase">{step.stage}</Badge>
              <strong class="text-foreground">{step.label}</strong>
            </div>
            <p class="text-muted-foreground m-0 text-xs">
              {step.entity}
              {#if step.ticker}
                · <span class="font-mono">{step.ticker}</span>
              {/if}
            </p>
            <p class="text-muted-foreground mt-1 m-0 text-xs leading-relaxed">{step.note}</p>
            <div class="mt-2 flex flex-wrap gap-2">
              {#if step.stage === 'oem' && selectedSymbol !== 'Nd'}
                <Button variant="ghost" size="sm" class="h-7 px-2 text-xs" onclick={() => onElementSelect?.('Nd')}>
                  View Nd
                </Button>
              {/if}
              {#if step.siteId}
                <Button variant="ghost" size="sm" class="h-7 px-2 text-xs" onclick={() => scrollToStageSites(step.stage)}>
                  Show on map →
                </Button>
              {/if}
            </div>
          </div>
        </li>
      {/each}
    </ol>
  </section>
{/if}
