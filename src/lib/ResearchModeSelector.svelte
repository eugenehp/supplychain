<script>
  import { RESEARCH_MODES, saveResearchMode } from './research-mode.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Label } from '$lib/components/ui/label/index.js';

  /** @type {{ mode: string, onchange?: (mode: string) => void }} */
  let { mode = $bindable('accelerators'), onchange } = $props();

  const selected = $derived(RESEARCH_MODES.find((m) => m.id === mode));

  function onModeChange(value) {
    if (!value || !RESEARCH_MODES.some((m) => m.id === value)) return;
    mode = value;
    saveResearchMode(value);
    onchange?.(value);
  }
</script>

<div class="flex min-w-0 items-center gap-3">
  <Label for="research-mode-trigger" class="text-muted-foreground shrink-0 text-xs uppercase tracking-wide">
    Research area
  </Label>
  <Select.Root type="single" value={mode} onValueChange={onModeChange}>
    <Select.Trigger id="research-mode-trigger" class="w-full min-w-[180px]">
      <span class="truncate">{selected?.label ?? 'Select area'}</span>
    </Select.Trigger>
    <Select.Content>
      {#each RESEARCH_MODES as m}
        <Select.Item value={m.id} label={m.label}>
          <span class="flex flex-col items-start gap-0.5">
            <span>{m.label}</span>
            <span class="text-muted-foreground text-[10px]">{m.description}</span>
          </span>
        </Select.Item>
      {/each}
    </Select.Content>
  </Select.Root>
</div>
