<script>
  import { onMount } from 'svelte';
  import * as Tabs from '$lib/components/ui/tabs/index.js';
  import { cn } from '$lib/utils.js';
  import { mountDebouncedScrollSpy, observeStableHeight } from '../scroll-spy-utils.js';

  const sections = [
    { id: 'space-overview', label: 'Overview' },
    { id: 'space-metrics', label: 'Metrics' },
    { id: 'space-trends', label: 'Trends' },
    { id: 'space-contracts', label: 'Contracts' },
    { id: 'space-compare', label: 'Compare' },
    { id: 'space-risk-diff', label: 'Risk diff' },
    { id: 'space-cross-topic', label: 'Cross-topic' },
    { id: 'space-sankey', label: 'Sankey' },
    { id: 'space-concentration', label: 'HHI' },
    { id: 'space-vendor-network', label: 'Network' },
    { id: 'space-timeline', label: '8-K' },
    { id: 'space-prices', label: 'Prices' },
    { id: 'space-launches', label: 'Launches' },
    { id: 'space-insiders', label: 'Insiders' },
    { id: 'space-sbir', label: 'SBIR' },
    { id: 'space-patents', label: 'Patents' },
    { id: 'space-glossary', label: 'Glossary' },
    { id: 'space-research-questions', label: 'Q&A' },
    { id: 'space-deep-dives', label: 'Deep-dives' },
    { id: 'space-geography', label: 'Geography' },
    { id: 'space-wordcloud', label: 'Cloud' },
    { id: 'space-umap', label: 'UMAP' },
    { id: 'space-query-panel', label: 'Search' },
    { id: 'space-watchlist', label: 'Watchlist' },
    { id: 'space-methodology', label: 'Methodology' },
  ];

  let active = $state('space-overview');
  /** @type {HTMLElement | undefined} */
  let navEl = $state();

  /** Mutable lock — IntersectionObserver callback reads the current value. */
  const scrollLock = { navigating: false };

  onMount(() =>
    mountDebouncedScrollSpy({
      isLocked: () => scrollLock.navigating,
      getActive: () => active,
      onActive: (id) => {
        active = id;
      },
      sections,
      observerInit: { rootMargin: '-12% 0px -55% 0px', threshold: 0.15 },
    }),
  );

  $effect(() => {
    if (!navEl) return;
    return observeStableHeight(navEl, '--page-nav-height');
  });

  /** @param {string} id */
  function onTabSelect(id) {
    if (id === active) {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    scrollLock.navigating = true;
    active = id;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => {
      scrollLock.navigating = false;
    }, 700);
  }
</script>

<nav
  bind:this={navEl}
  aria-label="Space-economy page sections"
  class="page-nav bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky z-40 w-full rounded-xl border p-1 shadow-sm backdrop-blur-md"
  style:top="var(--app-header-height, 4.5rem)"
>
  <Tabs.Root value={active} onValueChange={(v) => v && onTabSelect(v)}>
    <Tabs.List class="bg-muted/50 h-auto w-full flex-wrap justify-start gap-1 p-1">
      {#each sections as section (section.id)}
        <Tabs.Trigger value={section.id} class={cn('text-xs sm:text-sm')}>
          {section.label}
        </Tabs.Trigger>
      {/each}
    </Tabs.List>
  </Tabs.Root>
</nav>
