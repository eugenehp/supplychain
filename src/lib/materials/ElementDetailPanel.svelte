<script>
  import * as Card from '$lib/components/ui/card/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { isRareEarthElement } from './periodic-table.js';
  import { cn } from '$lib/utils.js';
  import { useMaterialsExcerpt, payloadFromMinerSnippet } from './use-materials-excerpt.js';

  /** @type {{ element: object | null }} */
  let { element = null } = $props();

  const openExcerpt = useMaterialsExcerpt();

  const hasSec = $derived(Boolean(element?.hasSecProfile && (element?.mentionCount ?? 0) > 0));
  const isRee = $derived(element ? isRareEarthElement(element) : false);
  const hasNotes = $derived(Boolean(element?.usesDetail || element?.importance));

  const fields = [
    { key: 'geography', label: 'Geography & sites' },
    { key: 'cost', label: 'Cost language' },
    { key: 'pipeline', label: 'Pipeline & processing' },
    { key: 'suppliers', label: 'Suppliers & offtake' },
    { key: 'impact', label: 'Impact & permitting' },
  ];
</script>

{#if element}
  <Card.Root class="border-primary/20">
    <Card.Header>
      <div class="flex flex-wrap items-baseline gap-2">
        <Card.Title class="text-2xl">
          <span class="text-primary font-mono">{element.symbol}</span>
          {element.name}
        </Card.Title>
        <Badge variant="secondary">{element.categoryLabel}</Badge>
        {#if hasSec}
          <Badge>{element.mentionCount} SEC mentions</Badge>
        {:else if isRee}
          <Badge variant="outline">REE · no miner excerpts yet</Badge>
        {:else}
          <Badge variant="outline">Periodic table · SEC mining index pending</Badge>
        {/if}
      </div>
      <Card.Description class="text-sm leading-relaxed">
        Atomic number {element.atomicNumber}.
      </Card.Description>
    </Card.Header>

    <Card.Content class="flex flex-col gap-6">
      {#if hasNotes}
        <section aria-label="Element overview" class="bg-muted/30 rounded-lg border p-4">
          {#if element.industries?.length}
            <h3 class="text-foreground mb-2 text-sm font-semibold">Important for</h3>
            <ul class="text-foreground m-0 mb-4 flex flex-wrap gap-1.5 p-0 list-none">
              {#each element.industries as ind}
                <li>
                  <Badge variant="default" class="text-xs font-normal">{ind}</Badge>
                </li>
              {/each}
            </ul>
          {/if}

          <h3 class="text-foreground mb-3 text-sm font-semibold">What it is used for</h3>
          {#if element.uses?.length}
            <ul class="text-foreground m-0 mb-3 flex flex-wrap gap-1.5 p-0 list-none">
              {#each element.uses as use}
                <li>
                  <Badge variant="secondary" class="text-xs font-normal">{use}</Badge>
                </li>
              {/each}
            </ul>
          {/if}
          {#if element.usesDetail}
            <p class="text-muted-foreground m-0 text-sm leading-relaxed">{element.usesDetail}</p>
          {/if}

          {#if element.importance}
            <h3 class="text-foreground mb-2 mt-4 text-sm font-semibold">Why it matters</h3>
            <p class="text-muted-foreground m-0 text-sm leading-relaxed">{element.importance}</p>
          {/if}
        </section>
      {/if}

      {#if element.countries?.length}
        <section aria-label="Country distribution">
          <h3 class="text-foreground mb-3 text-sm font-semibold">Distribution by country</h3>
          <ul class="space-y-2.5">
            {#each element.countries as country (country.code)}
              <li>
                <div class="mb-1 flex justify-between gap-2 text-sm">
                  <span>{country.flag} {country.name}</span>
                  <span class="text-muted-foreground text-xs tabular-nums">{country.share}%</span>
                </div>
                <div class="bg-muted h-1.5 overflow-hidden rounded-full">
                  <div class="bg-primary h-full rounded-full" style:width="{Math.min(100, country.share)}%"></div>
                </div>
              </li>
            {/each}
          </ul>
        </section>
      {/if}

      {#if element.aggregated}
        <section aria-label="Aggregated SEC fields">
          <h3 class="text-foreground mb-3 text-sm font-semibold">Across all indexed filers</h3>
          <div class="grid gap-3 sm:grid-cols-2">
            {#each fields as { key, label }}
              {@const items = element.aggregated[key] ?? []}
              <div class="bg-muted/40 rounded-lg border p-3">
                <h4 class="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">{label}</h4>
                {#if items.length}
                  <ul class="m-0 list-disc space-y-1 pl-4 text-sm leading-snug">
                    {#each items as item}
                      <li>{item}</li>
                    {/each}
                  </ul>
                {:else}
                  <p class="text-muted-foreground m-0 text-sm">Not disclosed in extracted excerpts.</p>
                {/if}
              </div>
            {/each}
          </div>
        </section>
      {/if}

      {#if element.downstreamConsumers?.length}
        <section aria-label="Downstream OEM consumers">
          <h3 class="text-foreground mb-3 text-sm font-semibold">Downstream OEM & manufacturing (10-K)</h3>
          <div class="flex flex-col gap-3">
            {#each element.downstreamConsumers.slice(0, 6) as consumer}
              <article class="rounded-lg border p-3">
                <header class="mb-2 flex flex-wrap items-center gap-2">
                  <span class="text-foreground font-semibold">{consumer.company}</span>
                  <Badge variant="outline" class="font-mono">{consumer.ticker}</Badge>
                  <span class="text-muted-foreground text-xs">{consumer.mentionCount} mentions</span>
                </header>
                {#each consumer.snippets ?? [] as snip}
                  {@const text = typeof snip === 'string' ? snip : snip.text}
                  <button
                    type="button"
                    class={cn(
                      'border-primary/30 bg-muted/30 text-muted-foreground hover:bg-muted/50 m-0 mb-2 w-full border-l-2 py-1 pl-3 text-left text-xs leading-relaxed italic transition-colors',
                    )}
                    onclick={() =>
                      openExcerpt?.(
                        payloadFromMinerSnippet(
                          {
                            company: consumer.company,
                            ticker: consumer.ticker,
                            sourceId: consumer.sourceId,
                            sourceRegime: 'US-SEC',
                            filingUrl: consumer.filingUrl,
                          },
                          snip,
                          element.symbol,
                        ),
                      )}
                  >
                    "{text}"
                    <span class="text-primary mt-1 block text-[10px] not-italic underline">View in 10-K →</span>
                  </button>
                {/each}
              </article>
            {/each}
          </div>
        </section>
      {/if}

      {#if hasSec && element.miners?.length}
        <section aria-label="Mining companies">
          <h3 class="text-foreground mb-3 text-sm font-semibold">Public miners & processors (10-K)</h3>
          <div class="flex flex-col gap-4">
            {#each element.miners as miner}
              <article class="rounded-lg border p-4">
                <header class="mb-2 flex flex-wrap items-center gap-2">
                  <span class="text-foreground font-semibold">{miner.company}</span>
                  <Badge variant="outline" class="font-mono">{miner.ticker}</Badge>
                  <span class="text-muted-foreground text-xs">{miner.role} · {miner.mentionCount} mentions</span>
                </header>

                {#if miner.extracted}
                  <div class="mb-3 grid gap-2 sm:grid-cols-2">
                    {#each fields as { key, label }}
                      {@const items = miner.extracted[key] ?? []}
                      {#if items.length}
                        <div>
                          <span class="text-muted-foreground text-[10px] font-semibold uppercase">{label}</span>
                          <ul class="m-0 mt-1 list-disc pl-4 text-xs leading-snug">
                            {#each items.slice(0, 4) as item}
                              <li>{item}</li>
                            {/each}
                          </ul>
                        </div>
                      {/if}
                    {/each}
                  </div>
                {/if}

                {#if miner.snippets?.length}
                  <div class="flex flex-col gap-2">
                    {#each miner.snippets as snip}
                      {@const text = typeof snip === 'string' ? snip : snip.text}
                      <button
                        type="button"
                        class={cn(
                          'border-primary/30 bg-muted/30 text-muted-foreground hover:bg-muted/50 m-0 w-full border-l-2 py-1 pl-3 text-left text-xs leading-relaxed italic transition-colors',
                          'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                        )}
                        onclick={() => openExcerpt?.(payloadFromMinerSnippet(miner, snip, element.symbol))}
                        title="View full source with excerpt highlighted"
                      >
                        "{text}"
                        <span class="text-primary mt-1 block text-[10px] not-italic underline">View in source →</span>
                      </button>
                    {/each}
                  </div>
                {/if}
              </article>
            {/each}
          </div>
        </section>
      {:else if isRee && !hasNotes}
        <p class="text-muted-foreground text-sm leading-relaxed">
          No miner 10-K in the current watchlist names {element.name} explicitly. Check general rare-earth risk
          language in semiconductor filings.
        </p>
      {:else if !isRee}
        <p class="text-muted-foreground text-sm leading-relaxed">
          SEC-grounded mining data is indexed for rare earth elements (Sc, Y, La–Lu). Select an REE cell in the
          Mendeleev table for full use cases and supply-chain excerpts.
        </p>
      {/if}
    </Card.Content>
  </Card.Root>
{/if}
