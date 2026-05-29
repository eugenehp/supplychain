<script>
  import BrandLogo from './BrandLogo.svelte';
  import ChartTooltip from './ChartTooltip.svelte';

  /** @type {{ vendors?: object[], size?: number }} */
  let { vendors = [], size = 24 } = $props();

  let tooltip = $state({ show: false, x: 0, y: 0, html: '' });

  /** @param {object} vendor */
  function tooltipHtml(vendor) {
    const geo =
      vendor.flag && vendor.countryName
        ? `${vendor.flag} ${vendor.countryName}`
        : vendor.countryName ?? '';
    const ticker = vendor.ticker ? ` · ${vendor.ticker}` : '';
    const detail = geo ? `<em>${geo}${ticker}</em>` : vendor.ticker ? `<em>${vendor.ticker}</em>` : '';
    return `<strong>${vendor.name}</strong>${detail ? `<br/>${detail}` : ''}`;
  }

  /** @param {object} vendor @param {MouseEvent | FocusEvent} e */
  function showTip(vendor, e) {
    const target = /** @type {HTMLElement} */ (e.currentTarget);
    const rect = target.getBoundingClientRect();
    const x = 'clientX' in e ? e.clientX : rect.left + rect.width / 2;
    const y = 'clientY' in e ? e.clientY : rect.bottom;
    tooltip = {
      show: true,
      x,
      y,
      html: tooltipHtml(vendor),
    };
  }

  /** @param {MouseEvent} e */
  function moveTip(e) {
    if (!tooltip.show) return;
    tooltip = { ...tooltip, x: e.clientX, y: e.clientY };
  }

  function hideTip() {
    tooltip = { ...tooltip, show: false };
  }

  /** @param {object} vendor */
  function ariaLabel(vendor) {
    const parts = [vendor.name];
    if (vendor.countryName) parts.push(vendor.countryName);
    if (vendor.ticker) parts.push(vendor.ticker);
    return parts.join(', ');
  }
</script>

{#if vendors.length}
  <ul class="vendor-list" aria-label="{vendors.length} shared vendors">
    {#each vendors as vendor (vendor.id)}
      <li>
        <button
          type="button"
          class="vendor-chip"
          aria-label={ariaLabel(vendor)}
          onmouseenter={(e) => showTip(vendor, e)}
          onmousemove={moveTip}
          onmouseleave={hideTip}
          onfocus={(e) => showTip(vendor, e)}
          onblur={hideTip}
        >
          <BrandLogo ticker={vendor.ticker} vendor={vendor.ticker ? null : vendor.id} {size} alt={vendor.name} />
        </button>
      </li>
    {/each}
  </ul>
{/if}

<ChartTooltip show={tooltip.show} x={tooltip.x} y={tooltip.y} html={tooltip.html} maxWidth={240} />

<style>
  .vendor-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .vendor-chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
    border-radius: 8px;
    background: var(--surface);
    cursor: default;
    line-height: 0;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .vendor-chip:hover,
  .vendor-chip:focus-visible {
    border-color: var(--primary);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary) 25%, transparent);
    outline: none;
  }
</style>
