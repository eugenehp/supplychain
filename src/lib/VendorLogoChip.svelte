<script>
  import BrandLogo from './BrandLogo.svelte';

  /** @type {{ vendor: string, size?: number, secFilings?: object[] }} */
  let { vendor, size = 18, secFilings = [] } = $props();
</script>

<BrandLogo {vendor} {size} />
