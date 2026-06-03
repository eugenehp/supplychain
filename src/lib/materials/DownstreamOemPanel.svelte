<script>
  import * as Card from '$lib/components/ui/card/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { cn } from '$lib/utils.js';
  import { useMaterialsExcerpt, payloadFromMinerSnippet } from './use-materials-excerpt.js';

  /** @type {{ downstream: object | null, selectedSymbol?: string | null, onElementSelect?: (s: string) => void }} */
  let { downstream = null, selectedSymbol = $bindable('Nd'), onElementSelect } = $props();

  const openExcerpt = useMaterialsExcerpt();
  const byElement = $derived(downstream?.byElement ?? []);
  const companies = $derived(downstream?.companies ?? []);

  const activeElement = $derived(
    byElement.find((e) => e.symbol === selectedSymbol) ?? byElement.find((e) => e.symbol === 'Nd') ?? byElement[0],
  );

  const elementLabel = $derived(activeElement?.symbol ?? selectedSymbol ?? 'Nd');

  /** @param {object} consumer @param {object} snip */
  function openSnippet(consumer, snip) {
    openExcerpt?.(
      payloadFromMinerSnippet(
        {
          company: consumer.name,
          ticker: consumer.ticker,
          sourceId: consumer.sourceId,
          sourceRegime: 'US-SEC',
          filingUrl: consumer.filingUrl,
          filing: null,
        },
        snip,
        activeElement?.symbol,
      ),
    );
  }
</script>

{#if companies.length || byElement.length}
  <section id="downstream-oem" class="ui-section" aria-label="Downstream OEM demand">
    <h2 class="text-foreground mb-2 text-lg font-semibold">Manufacturing & OEM demand (SEC 10-K)</h2>
    <p class="text-muted-foreground mb-4 max-w-[720px] text-sm leading-relaxed">
      {downstream?.methodology ??
        'Automotive, defense, wind, and semiconductor filers disclosing REE supply risk — not bill-of-materials.'}
    </p>

    {#if byElement.length}
      <div class="mb-4 flex flex-wrap items-end gap-3">
        <div class="space-y-2">
          <Label for="oem-element">Element</Label>
          <Select.Root
            type="single"
            value={activeElement?.symbol ?? ''}
            onValueChange={(v) => {
              if (v) {
                selectedSymbol = v;
                onElementSelect?.(v);
              }
            }}
          >
            <Select.Trigger id="oem-element" class="w-[min(100%,12rem)]">{elementLabel}</Select.Trigger>
            <Select.Content>
              {#each byElement as el (el.symbol)}
                <Select.Item value={el.symbol} label={el.symbol}>{el.symbol} — {el.name}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>
      </div>

      {#if activeElement?.consumers?.length}
        <div class="mb-6 grid gap-3 md:grid-cols-2">
          {#each activeElement.consumers as consumer (consumer.ticker)}
            <Card.Root>
              <Card.Header class="pb-2">
                <Card.Title class="flex flex-wrap items-center gap-2 text-base">
                  {consumer.name}
                  <Badge variant="outline" class="font-mono text-[10px]">{consumer.ticker}</Badge>
                </Card.Title>
                <Card.Description>{consumer.sector} · {consumer.mentionCount} mentions</Card.Description>
              </Card.Header>
              <Card.Content class="flex flex-col gap-2 text-sm">
                {#each consumer.snippets ?? [] as snip}
                  {@const text = typeof snip === 'string' ? snip : snip.text}
                  <button
                    type="button"
                    class={cn(
                      'border-primary/30 bg-muted/30 text-muted-foreground hover:bg-muted/50 m-0 w-full border-l-2 py-2 pl-3 text-left text-xs leading-relaxed italic transition-colors',
                    )}
                    onclick={() => openSnippet(consumer, snip)}
                  >
                    "{text.slice(0, 200)}{text.length > 200 ? '…' : ''}"
                    <span class="text-primary mt-1 block text-[10px] not-italic underline">View in 10-K →</span>
                  </button>
                {/each}
              </Card.Content>
            </Card.Root>
          {/each}
        </div>
      {:else}
        <p class="text-muted-foreground mb-6 text-sm">No downstream OEM excerpts for {elementLabel} in indexed 10-Ks.</p>
      {/if}
    {/if}

    {#if companies.length}
      <h3 class="text-foreground mb-3 text-sm font-semibold">All indexed OEM filers</h3>
      <div class="flex flex-wrap gap-2">
        {#each companies as co (co.ticker)}
          <Badge variant="secondary" class="text-xs font-normal">
            {co.ticker} · {co.sector} · {co.mentionCount}
          </Badge>
        {/each}
      </div>
    {/if}
  </section>
{/if}
