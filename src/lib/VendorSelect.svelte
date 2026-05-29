<script>
  import * as Select from '$lib/components/ui/select/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import VendorLogoChip from './VendorLogoChip.svelte';

  /** @type {{ value?: string, vendors?: string[], secFilings?: object[], count?: number }} */
  let {
    value = $bindable('all'),
    vendors = [],
    secFilings = [],
    count = 0,
  } = $props();

  const selectedLabel = $derived(
    value === 'all' ? `All vendors (${count || vendors.length})` : value,
  );
</script>

<div class="flex min-w-[200px] flex-col gap-2">
  <Label>Vendor</Label>
  <Select.Root type="single" bind:value>
    <Select.Trigger class="vendor-trigger h-auto min-h-8 w-full max-w-[280px] py-1.5">
      <span class="flex min-w-0 items-center gap-2 overflow-hidden">
        {#if value !== 'all'}
          <VendorLogoChip vendor={value} size={16} {secFilings} />
        {/if}
        <span class="truncate text-sm">{selectedLabel}</span>
      </span>
    </Select.Trigger>
    <Select.Content class="vendor-content max-h-80">
      <Select.Item value="all" label="All vendors">
        {#snippet children()}
          <span class="flex items-center gap-2">
            <span class="text-muted-foreground flex size-[18px] shrink-0 items-center justify-center text-sm">∗</span>
            <span>All vendors ({count || vendors.length})</span>
          </span>
        {/snippet}
      </Select.Item>
      <Select.Separator />
      {#each vendors as vendor (vendor)}
        <Select.Item value={vendor} label={vendor}>
          {#snippet children()}
            <span class="flex min-w-0 items-center gap-2">
              <VendorLogoChip {vendor} size={18} {secFilings} />
              <span class="truncate">{vendor}</span>
            </span>
          {/snippet}
        </Select.Item>
      {/each}
    </Select.Content>
  </Select.Root>
</div>
