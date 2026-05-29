<script>
  import * as Card from '$lib/components/ui/card/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { computeTopicSimilarityReport } from './topic-similarity.js';
  import { hashForTopicId, getTopicMeta } from './topics.js';
  import TopicLogo from './TopicLogo.svelte';
  import SharedVendorLogos from './SharedVendorLogos.svelte';

  /** @type {{ topicId: string, topicMeta: object | null | undefined, data: object | null | undefined }} */
  let { topicId, topicMeta, data } = $props();

  const report = $derived(computeTopicSimilarityReport(topicId, data));
</script>

<section id="similarity" class="ui-section" aria-label="Supply chain similarity">
  <div class="mb-[var(--block-gap)]">
    <h2 class="text-foreground mb-2 text-lg font-bold">Supply chain similarity</h2>
    <p class="text-muted-foreground max-w-[720px] text-sm leading-relaxed">
      Pairwise overlap with each other research topic — overall match plus geographic and supply-category
      breakdown for that specific accelerator.
    </p>
  </div>

  <ul class="flex flex-col gap-[var(--stack-gap)]">
    {#each report.topics as row (row.id)}
      {@const peerMeta = getTopicMeta(row.id)}
      <li>
        <Card.Root class="overflow-hidden">
          <Card.Header class="gap-3 pb-3">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <a
                href={hashForTopicId(row.id)}
                class="group flex min-w-0 items-center gap-2.5 hover:opacity-90"
              >
                {#if peerMeta}
                  <TopicLogo topicMeta={peerMeta} size={28} />
                {/if}
                <div class="min-w-0">
                  <Card.Title class="group-hover:text-primary text-base leading-snug transition-colors">
                    {row.label}
                  </Card.Title>
                  {#if row.status === 'limited'}
                    <Badge variant="outline" class="mt-1 text-[0.6rem] tracking-wide uppercase">
                      Limited SEC
                    </Badge>
                  {/if}
                </div>
              </a>
              <span class="text-foreground shrink-0 text-sm font-semibold tabular-nums">{row.percent}%</span>
            </div>
            <div
              class="bg-muted h-2.5 overflow-hidden rounded-full"
              role="progressbar"
              aria-valuenow={row.percent}
              aria-valuemin="0"
              aria-valuemax="100"
              aria-label="Overall similarity with {row.label}"
            >
              <div
                class="bg-primary h-full rounded-full transition-[width] duration-500"
                style:width="{Math.min(100, row.percent)}%"
              ></div>
            </div>
          </Card.Header>

          <Card.Content class="flex flex-col gap-[var(--block-gap)] border-t pt-4">
            {#if row.sharedVendors.length}
              <div>
                <h3 class="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
                  Shared vendors
                  <span class="text-muted-foreground/80 ml-1.5 font-normal normal-case tracking-normal">
                    ({row.sharedVendors.length})
                  </span>
                </h3>
                <SharedVendorLogos vendors={row.sharedVendors} size={26} />
              </div>
            {/if}

            <div class="grid gap-[var(--block-gap)] sm:grid-cols-2">
            <div>
              <h3 class="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
                By country
              </h3>
              <ul class="space-y-2.5">
                {#each row.countries as country (country.code)}
                  <li>
                    <div class="mb-1 flex items-center justify-between gap-2">
                      <span class="text-foreground text-sm">{country.flag} {country.name}</span>
                      <span class="text-muted-foreground text-xs tabular-nums">{country.percent}%</span>
                    </div>
                    <div
                      class="bg-muted h-1.5 overflow-hidden rounded-full"
                      role="progressbar"
                      aria-valuenow={country.percent}
                      aria-valuemin="0"
                      aria-valuemax="100"
                      aria-label="{row.label} — {country.name} overlap"
                    >
                      <div
                        class="h-full rounded-full transition-[width] duration-500"
                        style:width="{Math.min(100, country.percent)}%"
                        style:background="var(--map-flow, var(--primary))"
                      ></div>
                    </div>
                  </li>
                {/each}
              </ul>
            </div>

            <div>
              <h3 class="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
                By supply category
              </h3>
              <ul class="space-y-2.5">
                {#each row.categories as category (category.key)}
                  <li>
                    <div class="mb-1 flex items-center justify-between gap-2">
                      <span class="text-foreground flex items-center gap-2 text-sm">
                        <span
                          class="inline-block h-2 w-2 shrink-0 rounded-full"
                          style:background={category.color}
                          aria-hidden="true"
                        ></span>
                        {category.label}
                      </span>
                      <span class="text-muted-foreground text-xs tabular-nums">{category.percent}%</span>
                    </div>
                    <div
                      class="bg-muted h-1.5 overflow-hidden rounded-full"
                      role="progressbar"
                      aria-valuenow={category.percent}
                      aria-valuemin="0"
                      aria-valuemax="100"
                      aria-label="{row.label} — {category.label} overlap"
                    >
                      <div
                        class="h-full rounded-full transition-[width] duration-500"
                        style:width="{Math.min(100, category.percent)}%"
                        style:background={category.color}
                      ></div>
                    </div>
                  </li>
                {/each}
              </ul>
            </div>
            </div>
          </Card.Content>
        </Card.Root>
      </li>
    {/each}
  </ul>
</section>
