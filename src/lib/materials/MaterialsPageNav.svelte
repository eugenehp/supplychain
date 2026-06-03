<script>
  import { onMount } from 'svelte';
  import * as Tabs from '$lib/components/ui/tabs/index.js';
  import { cn } from '$lib/utils.js';
  import { MATERIALS_SECTIONS } from './materials-sections.js';
  import { mountDebouncedScrollSpy, observeStableHeight } from '../scroll-spy-utils.js';

  let active = $state('materials-overview');
  /** @type {HTMLElement | undefined} */
  let navEl = $state();

  const scrollLock = { navigating: false };

  onMount(() => {
    const disconnectSpy = mountDebouncedScrollSpy({
      isLocked: () => scrollLock.navigating,
      getActive: () => active,
      onActive: (id) => {
        active = id;
      },
      sections: MATERIALS_SECTIONS,
    });

    return disconnectSpy;
  });

  $effect(() => {
    if (!navEl) return;
    return observeStableHeight(navEl, '--page-nav-height');
  });

  /** @param {string} id */
  function onTabSelect(id) {
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
  id="materials-toc"
  aria-label="Materials page contents"
  class="page-nav bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky z-40 mb-4 w-full rounded-xl border p-1 shadow-sm backdrop-blur-md"
  style:top="var(--app-header-height, 4.5rem)"
>
  <Tabs.Root value={active} onValueChange={(v) => v && onTabSelect(v)}>
    <Tabs.List class="bg-muted/50 h-auto max-h-32 w-full flex-wrap justify-start gap-1 overflow-y-auto p-1">
      {#each MATERIALS_SECTIONS as section (section.id)}
        <Tabs.Trigger value={section.id} class={cn('text-xs sm:text-sm')}>
          {section.label}
        </Tabs.Trigger>
      {/each}
    </Tabs.List>
  </Tabs.Root>
</nav>
