<script>
  /** @type {{ size?: number, class?: string }} */
  let { size = 40, class: className = '' } = $props();
</script>

<img
  src="/favicon.svg"
  alt="Supply Chain Research"
  width={size}
  height={size}
  class="site-logo shrink-0 rounded-lg {className}"
  decoding="async"
/>

<style>
  .site-logo {
    display: block;
    object-fit: contain;
  }
</style>
