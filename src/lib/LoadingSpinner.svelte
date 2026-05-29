<script>
  import Loader2 from '@lucide/svelte/icons/loader-2';
  import { cn } from '$lib/utils.js';

  /** @type {{ class?: string }} */
  let { class: className = '' } = $props();
</script>

<Loader2 class={cn('size-4 animate-spin text-muted-foreground', className)} aria-hidden="true" />
