<script>
  import * as Card from '$lib/components/ui/card/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { getLimitedTopics, hashForTopicId } from './topics.js';
  import { brandForNode } from './vendor-colors.js';
  import { topicCountryDisplay } from './topic-meta.js';
  import TopicLogo from './TopicLogo.svelte';
  import { cn } from '$lib/utils.js';

  /** @type {{ currentTopicId?: string }} */
  let { currentTopicId = '' } = $props();

  const limited = getLimitedTopics();
</script>

{#if limited.length}
  <section id="limited-topics" class="ui-section" aria-label="Limited SEC disclosure topics">
    <div class="mb-[var(--block-gap)]">
      <h2 class="text-foreground mb-2 text-lg font-bold">Limited SEC disclosure</h2>
      <p class="text-muted-foreground max-w-[720px] text-sm leading-relaxed">
        Same accelerator class as H200/MI325X, but chip-level supplier detail is missing from public SEC filings.
        These maps use industry-modeled tier-1 flows anchored on supplier 10-K / 20-F data where available.
      </p>
    </div>

    <div class="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-[var(--stack-gap)]">
      {#each limited as topic (topic.id)}
        {@const brand = brandForNode({ id: topic.label })}
        {@const geo = topicCountryDisplay(topic)}
        {@const isCurrent = topic.id === currentTopicId}
        <a
          href={hashForTopicId(topic.id)}
          class={cn(
            'group block rounded-xl border transition-colors hover:-translate-y-px hover:shadow-sm focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
            isCurrent ? 'border-primary/50 bg-primary/5' : 'hover:border-primary/30',
          )}
          aria-current={isCurrent ? 'page' : undefined}
        >
          <Card.Root class="h-full border-0 bg-transparent shadow-none">
            <div
              class="h-1 rounded-t-xl"
              style:background={brand?.color ?? 'var(--muted-foreground)'}
              aria-hidden="true"
            ></div>
            <Card.Header class="gap-2 pb-2">
              <div class="flex flex-wrap items-center gap-2">
                <Badge variant="outline" class="text-[0.65rem] tracking-wide uppercase">
                  Limited SEC
                </Badge>
                {#if topic.category}
                  <span class="text-muted-foreground text-[0.65rem] tracking-wide uppercase">{topic.category}</span>
                {/if}
              </div>
              <Card.Title class="flex items-center gap-2 text-base leading-snug">
                <TopicLogo topicMeta={topic} size={28} />
                {#if geo?.flag}
                  <span role="img" aria-label={geo.name} title={geo.name}>{geo.flag}</span>
                {/if}
                <span>{topic.label}</span>
              </Card.Title>
              {#if topic.anchorCompany}
                <Card.Description class="text-xs">{topic.anchorCompany}</Card.Description>
              {/if}
            </Card.Header>
            <Card.Content class="pt-0">
              <p class="text-muted-foreground line-clamp-3 text-sm leading-relaxed">
                {topic.subtitle ?? topic.description}
              </p>
            </Card.Content>
          </Card.Root>
        </a>
      {/each}
    </div>
  </section>
{/if}
