<script>
  import { mergePeriodicWithSec, PERIODIC_CATEGORY_COLORS } from './periodic-table.js';
  import { cn } from '$lib/utils.js';

  /** @type {{ elements: object[], selectedSymbol?: string | null, industryFilter?: string | null, onselect?: (symbol: string) => void }} */
  let { elements = [], selectedSymbol = null, industryFilter = null, onselect } = $props();

  const cells = $derived(mergePeriodicWithSec(elements));
  const maxRow = 9;

  /** @param {object} cell */
  function matchesIndustry(cell) {
    if (!industryFilter) return true;
    return cell.industries?.includes(industryFilter);
  }

  /** @param {object} cell */
  function cellClass(cell) {
    const hasData = cell.hasSecProfile && (cell.mentionCount ?? 0) > 0;
    const dimmed = industryFilter && !matchesIndustry(cell);
    return cn(
      'periodic-cell relative flex flex-col items-center justify-center rounded-md border p-1 text-center transition-all',
      'min-h-[2.75rem] min-w-[2.25rem] sm:min-h-[3.25rem] sm:min-w-[2.5rem]',
      'cursor-pointer hover:-translate-y-px hover:shadow-sm',
      !cell.hasSecProfile && 'opacity-90',
      dimmed && 'opacity-25 saturate-0',
      hasData && !dimmed && 'hover:shadow-md',
      selectedSymbol === cell.symbol && 'ring-primary z-10 ring-2 ring-offset-1',
    );
  }

  /** @param {object} cell */
  function categoryStyle(cell) {
    const key = cell.reeCategory ?? cell.category;
    const c = PERIODIC_CATEGORY_COLORS[key] ?? '#94a3b8';
    return `border-color: color-mix(in srgb, ${c} 45%, transparent); background: color-mix(in srgb, ${c} 14%, transparent);`;
  }

  const legend = [
    { key: 'alkali', label: 'Alkali' },
    { key: 'alkaline', label: 'Alkaline earth' },
    { key: 'transition', label: 'Transition' },
    { key: 'post-transition', label: 'Post-transition' },
    { key: 'metalloid', label: 'Metalloid' },
    { key: 'nonmetal', label: 'Nonmetal' },
    { key: 'halogen', label: 'Halogen' },
    { key: 'noble', label: 'Noble gas' },
    { key: 'lanthanide', label: 'Lanthanide' },
    { key: 'actinide', label: 'Actinide' },
    { key: 'light', label: 'Light REE' },
    { key: 'heavy', label: 'Heavy REE' },
    { key: 'scandium', label: 'Sc (REE)' },
    { key: 'synthetic', label: 'Synthetic' },
  ];
</script>

<div class="mendeleev-root flex flex-col gap-3" aria-label="Periodic table of elements">
  <div class="overflow-x-auto pb-2">
    <div
      class="periodic-grid mx-auto min-w-[min(100%,42rem)]"
      style="--pt-cols: 18; --pt-rows: {maxRow}"
      role="grid"
    >
      <span
        class="text-muted-foreground flex items-center justify-end pr-0.5 text-xs font-medium"
        style="grid-row: 8; grid-column: 2"
        aria-hidden="true"
        title="Lanthanides"
      >*</span>
      <span
        class="text-muted-foreground flex items-center justify-end pr-0.5 text-xs font-medium"
        style="grid-row: 9; grid-column: 2"
        aria-hidden="true"
        title="Actinides"
      >*</span>
      {#each cells as cell (cell.symbol)}
        <button
          type="button"
          class={cellClass(cell)}
          style="{categoryStyle(cell)} grid-row: {cell.gridRow}; grid-column: {cell.gridCol}"
          role="gridcell"
          aria-pressed={selectedSymbol === cell.symbol}
          aria-label="{cell.name}, atomic number {cell.atomicNumber}"
          title="{cell.importance ? `${cell.name}: ${cell.importance}` : cell.name}"
          onclick={() => onselect?.(cell.symbol)}
        >
          <span class="text-muted-foreground text-[8px] leading-none sm:text-[9px]">{cell.atomicNumber}</span>
          <span class="text-foreground text-xs leading-none font-bold sm:text-sm">{cell.symbol}</span>
          {#if cell.hasSecProfile && cell.mentionCount > 0}
            <span
              class="bg-primary/20 text-primary absolute -top-0.5 -right-0.5 max-w-[2rem] truncate rounded-full px-0.5 text-[7px] font-semibold sm:text-[8px]"
            >
              {cell.mentionCount > 999 ? '999+' : cell.mentionCount}
            </span>
          {/if}
        </button>
      {/each}
    </div>
  </div>

  <div class="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] sm:text-xs">
    {#each legend as item}
      <span class="flex items-center gap-1">
        <span class="legend-swatch" style:background={PERIODIC_CATEGORY_COLORS[item.key]}></span>
        {item.label}
      </span>
    {/each}
    <span class="w-full sm:ml-auto sm:w-auto">Badge = SEC mentions (rare-earth watchlist indexed)</span>
  </div>
</div>

<style>
  .periodic-grid {
    display: grid;
    grid-template-columns: repeat(18, minmax(2.25rem, 1fr));
    grid-template-rows: repeat(var(--pt-rows), minmax(2.75rem, auto));
    gap: 3px;
  }

  .legend-swatch {
    display: inline-block;
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 2px;
    flex-shrink: 0;
  }

  @media (min-width: 640px) {
    .periodic-grid {
      gap: 4px;
    }
  }
</style>
