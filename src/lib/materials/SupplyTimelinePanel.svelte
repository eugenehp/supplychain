<script>
  import * as Card from '$lib/components/ui/card/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { useMaterialsExcerpt, payloadFromReportExcerpt } from './use-materials-excerpt.js';

  /** @type {{ supplyTimeline: object | null, publicReports?: object | null }} */
  let { supplyTimeline = null, publicReports = null } = $props();

  const openExcerpt = useMaterialsExcerpt();
  const events = $derived(supplyTimeline?.events ?? []);
  const categories = $derived(
    Object.fromEntries((supplyTimeline?.categories ?? []).map((c) => [c.id, c])),
  );

  /** @param {object} event */
  function openEventSource(event) {
    const report = publicReports?.reports?.find((r) => r.id === event.sourceId);
    if (report?.excerpts?.length) {
      openExcerpt?.(payloadFromReportExcerpt(report, report.excerpts[0]));
      return;
    }
    if (event.sourceUrl) window.open(event.sourceUrl, '_blank', 'noopener,noreferrer');
  }
</script>

{#if events.length}
  <section id="supply-timeline" class="ui-section" aria-label="Supply chain timeline">
    <h2 class="text-foreground mb-2 text-lg font-semibold">Timeline: policy & price shocks</h2>
    <p class="text-muted-foreground mb-4 max-w-[720px] text-sm leading-relaxed">
      {supplyTimeline?.methodology ?? 'Key events affecting REE mining, separation, and manufacturing supply chains.'}
    </p>

    <div class="mb-4 flex flex-wrap gap-2">
      {#each supplyTimeline?.categories ?? [] as cat}
        <span class="inline-flex items-center rounded-md border px-2 py-0.5 text-[10px]" style:border-color={cat.color}>
          <span class="mr-1 inline-block size-2 rounded-full" style:background={cat.color}></span>
          {cat.label}
        </span>
      {/each}
    </div>

    <ol class="relative m-0 border-l border-dashed pl-6">
      {#each events as event (event.id)}
        {@const cat = categories[event.category]}
        <li class="relative mb-4 pb-1 last:mb-0">
          <span
            class="absolute -left-[1.65rem] top-1 size-3 rounded-full ring-2 ring-background"
            style:background={cat?.color ?? 'var(--primary)'}
            aria-hidden="true"
          ></span>
          <Card.Root>
            <Card.Header class="pb-2">
              <div class="flex flex-wrap items-baseline gap-2">
                <Card.Title class="text-sm">{event.title}</Card.Title>
                <Badge variant="secondary" class="font-mono text-[10px]">{event.year}</Badge>
                {#if event.category}
                  <Badge variant="outline" class="text-[10px] capitalize">{event.category}</Badge>
                {/if}
              </div>
            </Card.Header>
            <Card.Content class="pt-0 text-sm">
              <p class="text-muted-foreground m-0 leading-relaxed">{event.summary}</p>
              {#if event.elements?.length}
                <div class="mt-2 flex flex-wrap gap-1">
                  {#each event.elements as sym}
                    <Badge variant="outline" class="font-mono text-[10px]">{sym}</Badge>
                  {/each}
                </div>
              {/if}
              {#if event.sourceId || event.sourceUrl}
                <Button variant="link" class="mt-2 h-auto p-0 text-xs" onclick={() => openEventSource(event)}>
                  View source →
                </Button>
              {/if}
            </Card.Content>
          </Card.Root>
        </li>
      {/each}
    </ol>
  </section>
{/if}
