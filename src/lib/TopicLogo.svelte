<script>
  import BrandLogo from './BrandLogo.svelte';

  /** @type {{ topicMeta?: object | null, filings?: object[], size?: number }} */
  let { topicMeta, filings = [], size = 40 } = $props();
</script>

<BrandLogo {topicMeta} {size} />
