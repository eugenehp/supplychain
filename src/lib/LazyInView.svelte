<script>
  import { onMount } from 'svelte';
  import { cn } from '$lib/utils.js';

  /** @type {{ rootMargin?: string, minHeight?: string, class?: string, children?: import('svelte').Snippet }} */
  let {
    rootMargin = '240px',
    minHeight = '10rem',
    class: className = '',
    children,
  } = $props();

  let visible = $state(false);
  let rootEl = $state(null);

  onMount(() => {
    if (!rootEl) return;
    if (typeof IntersectionObserver === 'undefined') {
      visible = true;
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          visible = true;
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(rootEl);
    return () => observer.disconnect();
  });
</script>

<div
  bind:this={rootEl}
  class={cn('min-h-[var(--lazy-min-h)]', className)}
  style:--lazy-min-h={visible ? '0px' : minHeight}
>
  {#if visible}
    {@render children?.()}
  {/if}
</div>
