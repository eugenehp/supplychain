<script>
  import { groupSourcesByKind, isExternalUrl, normalizeSource } from './source-links.js';

  /** @type {{ sources?: object[] }} */
  let { sources = [] } = $props();

  const groups = $derived(groupSourcesByKind(sources));
</script>

{#if sources?.length}
  <div class="grid gap-4">
    {#each groups as group}
      <section>
        <h4 class="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">{group.title}</h4>
        <ul class="text-muted-foreground list-disc space-y-1 pl-5 text-sm leading-relaxed">
          {#each group.items as source}
            {@const s = normalizeSource(source)}
            <li>
              {#if s.url}
                <a
                  href={s.url}
                  class="text-primary hover:underline"
                  target={isExternalUrl(s.url) ? '_blank' : undefined}
                  rel={isExternalUrl(s.url) ? 'noreferrer noopener' : undefined}
                >
                  {s.label}
                  {#if isExternalUrl(s.url)}
                    <span class="opacity-75" aria-hidden="true">↗</span>
                  {/if}
                </a>
              {:else}
                {s.label}
              {/if}
            </li>
          {/each}
        </ul>
      </section>
    {/each}
  </div>
{:else}
  <p class="text-muted-foreground text-sm">No sources listed.</p>
{/if}
