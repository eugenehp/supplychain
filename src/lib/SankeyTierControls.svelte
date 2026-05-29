<script>
  import { MIN_SANKEY_TIER, MAX_SANKEY_TIER, clampSankeyTier, tierDepthLabel } from './sankey-data.js';
  import { TIER_LABELS } from './topics.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Label } from '$lib/components/ui/label/index.js';

  /** @type {{ maxTier?: number }} */
  let { maxTier = $bindable(MAX_SANKEY_TIER) } = $props();

  const canRemove = $derived(maxTier > MIN_SANKEY_TIER);
  const canAdd = $derived(maxTier < MAX_SANKEY_TIER);
  const visibleLabels = $derived(TIER_LABELS.slice(0, maxTier + 1));

  function removeTier() {
    maxTier = clampSankeyTier(maxTier - 1);
  }

  function addTier() {
    maxTier = clampSankeyTier(maxTier + 1);
  }
</script>

<div class="bg-muted/40 flex flex-wrap items-center gap-3 rounded-lg border p-3 sm:gap-5">
  <Label class="text-muted-foreground text-xs uppercase tracking-wide">Supply chain depth</Label>
  <div class="bg-background inline-flex items-center gap-2 rounded-lg border p-1" role="group" aria-label="Number of tiers shown">
    <Button variant="outline" size="icon-sm" disabled={!canRemove} onclick={removeTier} aria-label="Hide deepest tier">−</Button>
    <span class="text-foreground min-w-36 text-center text-sm font-medium">{tierDepthLabel(maxTier)}</span>
    <Button variant="outline" size="icon-sm" disabled={!canAdd} onclick={addTier} aria-label="Show next tier">+</Button>
  </div>
  <div class="ml-auto flex flex-wrap gap-2" aria-hidden="true">
    {#each visibleLabels as label, i}
      <Badge variant={i === visibleLabels.length - 1 && i > 0 ? 'default' : 'secondary'} class="text-[0.65rem] uppercase">
        {label}
      </Badge>
    {/each}
  </div>
</div>
