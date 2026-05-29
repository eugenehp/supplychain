<script>
  import { onMount } from 'svelte';
  import { getThemeMode, setThemeMode, subscribeTheme } from './theme.js';
  import { cn } from '$lib/utils.js';

  let mode = $state(getThemeMode());

  onMount(() => subscribeTheme((m) => {
    mode = m;
  }));

  const options = [
    { id: 'system', label: 'System', icon: '◐' },
    { id: 'light', label: 'Light', icon: '☀' },
    { id: 'dark', label: 'Dark', icon: '☾' },
  ];
</script>

<div
  class="bg-muted/80 inline-flex gap-0.5 rounded-lg border p-0.5 shadow-inner"
  role="group"
  aria-label="Color theme"
>
  {#each options as opt}
    {@const selected = mode === opt.id}
    <button
      type="button"
      class={cn(
        'inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-all',
        'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none',
        selected
          ? 'bg-background text-foreground shadow-sm ring-1 ring-border/70'
          : 'text-muted-foreground hover:text-foreground hover:bg-background/40',
      )}
      title={opt.label}
      aria-pressed={selected}
      aria-label={opt.label}
      onclick={() => setThemeMode(/** @type {'system' | 'light' | 'dark'} */ (opt.id))}
    >
      <span class={cn('text-base leading-none', selected && 'text-primary')} aria-hidden="true">{opt.icon}</span>
      <span class="hidden sm:inline">{opt.label}</span>
    </button>
  {/each}
</div>
