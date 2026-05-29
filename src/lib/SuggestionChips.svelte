<script>
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Label } from '$lib/components/ui/label/index.js';

  /** @type {{ suggestions?: string[], onselect?: (value: string) => void, label?: string }} */
  let { suggestions = [], onselect, label = 'Try' } = $props();
</script>

{#if suggestions.length}
  <div class="mt-2 space-y-2">
    <Label class="text-muted-foreground text-xs uppercase tracking-wide">{label}</Label>
    <div class="flex flex-wrap gap-2">
      {#each suggestions as suggestion}
        <button type="button" onclick={() => onselect?.(suggestion)}>
          <Badge variant="outline" class="cursor-pointer hover:bg-muted">{suggestion}</Badge>
        </button>
      {/each}
    </div>
  </div>
{/if}
