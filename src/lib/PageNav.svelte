<script>
  import { onMount } from 'svelte';
  import * as Tabs from '$lib/components/ui/tabs/index.js';
  import { cn } from '$lib/utils.js';
  import { mountDebouncedScrollSpy, observeStableHeight } from './scroll-spy-utils.js';

  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'search', label: 'Search' },
    { id: 'sankey', label: 'Supply map' },
    { id: 'sec-evidence', label: 'Evidence' },
    { id: 'reference', label: 'Reference' },
    { id: 'similarity', label: 'Similarity' },
  ];

  let active = $state('overview');
  /** @type {HTMLElement | undefined} */
  let navEl = $state();

  /** Mutable lock — IntersectionObserver callback must read current value (not a stale closure). */
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
  aria-label="Page sections"
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
