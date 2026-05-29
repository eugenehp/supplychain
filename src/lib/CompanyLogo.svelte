<script>
  import BrandLogo from './BrandLogo.svelte';

  /** @type {{ ticker: string, size?: number, showName?: boolean, filing?: object | null }} */
  let { ticker, size = 36, showName = false, filing = null } = $props();
</script>

<BrandLogo {ticker} {size} {showName} alt={filing?.name} />
