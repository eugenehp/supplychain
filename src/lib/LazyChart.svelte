<script>
  import { onMount } from 'svelte';
  import LoadingSpinner from './LoadingSpinner.svelte';
  import { cn } from '$lib/utils.js';

  /**
   * @type {{
   *   view: 'sankey' | 'world' | 'pack' | 'radial',
   *   data?: object,
   *   maxTier?: number,
   *   tierLabels?: string[],
   *   secFilings?: object[],
   *   highlightCountry?: string | null,
   *   class?: string,
   * }}
   */
  let {
    view,
    data = null,
    maxTier = 5,
    tierLabels = [],
    secFilings = [],
    highlightCountry = null,
    class: className = '',
  } = $props();

  /** @type {import('svelte').Component | null} */
  let Chart = $state(null);
  let loadGen = 0;

  const LOADERS = {
    sankey: () => import('./SankeyChart.svelte'),
    world: () => import('./SupplyMapChart.svelte'),
    pack: () => import('./PackChart.svelte'),
    radial: () => import('./RadialTreeChart.svelte'),
  };

  $effect(() => {
    const v = view;
    Chart = null;
    const gen = ++loadGen;
    LOADERS[v]?.().then((mod) => {
      if (gen === loadGen) Chart = mod.default;
    });
  });

  onMount(() => {
    const idle = /** @type {Record<string, () => Promise<unknown>>} */ (LOADERS);
    const preload = idle.sankey;
    if (preload && view !== 'sankey') {
      requestIdleCallback?.(() => preload(), { timeout: 8000 });
    }
  });
</script>

<div class={cn('relative min-h-[920px] w-full', className)}>
  {#if Chart}
    <Chart {data} {maxTier} {tierLabels} {secFilings} {highlightCountry} />
  {:else}
    <div
      class="text-muted-foreground flex min-h-[920px] flex-col items-center justify-center gap-3"
      aria-busy="true"
      aria-label="Loading chart"
    >
      <LoadingSpinner />
      <span class="text-sm">Loading chart…</span>
    </div>
  {/if}
</div>
