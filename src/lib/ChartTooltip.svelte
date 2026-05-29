<script>
  import { clampTooltipPosition } from './chart-tooltip.js';

  /** @type {{ show?: boolean, x?: number, y?: number, html?: string, maxWidth?: number }} */
  let { show = false, x = 0, y = 0, html = '', maxWidth = 300 } = $props();

  let el = $state(null);
  let pos = $state({ left: 0, top: 0 });

  $effect(() => {
    if (!show) return;
    const cx = x;
    const cy = y;
    const content = html;

    void content;
    pos = { left: cx + 14, top: cy + 12 };
    requestAnimationFrame(() => {
      if (!el) return;
      const { width, height } = el.getBoundingClientRect();
      pos = clampTooltipPosition(cx, cy, width, height);
    });
  });
</script>

{#if show}
  <div
    bind:this={el}
    class="chart-tooltip"
    style:left="{pos.left}px"
    style:top="{pos.top}px"
    style:max-width="{maxWidth}px"
  >
    {@html html}
  </div>
{/if}

<style>
  .chart-tooltip {
    position: fixed;
    z-index: 100;
    background: var(--tooltip-bg);
    border: 1px solid var(--tooltip-border);
    border-radius: 6px;
    padding: var(--space-2) var(--space-3);
    font-size: 13px;
    line-height: 1.45;
    color: var(--text);
    pointer-events: none;
    backdrop-filter: blur(8px);
  }

  .chart-tooltip :global(strong) {
    color: var(--text);
  }

  .chart-tooltip :global(em) {
    color: var(--text-subtle);
    font-style: normal;
    font-size: 12px;
  }
</style>
