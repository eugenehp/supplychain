<script>
  import * as Card from '$lib/components/ui/card/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';

  /** @type {{ resourceEstimates: object | null }} */
  let { resourceEstimates = null } = $props();

  const projects = $derived(resourceEstimates?.projects ?? []);
</script>

{#if projects.length}
  <section id="asx-resources" class="ui-section" aria-label="ASX NI 43-101 resource estimates">
    <h2 class="text-foreground mb-2 text-lg font-semibold">ASX resource estimates (NI 43-101 / JORC)</h2>
    <p class="text-muted-foreground mb-4 max-w-[720px] text-sm leading-relaxed">
      {resourceEstimates?.methodology ??
        'Parsed from ASX annual and technical report text. Verify tonnage and grade against official competent-person tables.'}
    </p>
    <div class="grid gap-3 md:grid-cols-2">
      {#each projects as project (project.companyId)}
        <Card.Root>
          <Card.Header class="pb-2">
            <Card.Title class="text-base">{project.companyName ?? project.companyId}</Card.Title>
            <Card.Description>{project.standard ?? 'Technical report'}</Card.Description>
          </Card.Header>
          <Card.Content class="text-sm">
            <ul class="m-0 space-y-2 p-0 list-none">
              {#each project.estimates as est}
                <li>
                  <Badge variant="outline" class="mr-1 font-mono text-[10px]">{est.label}</Badge>
                  <span class="tabular-nums">{est.value} {est.unit}</span>
                  {#if est.snippet}
                    <p class="text-muted-foreground mt-1 m-0 text-xs leading-snug italic">"{est.snippet.slice(0, 120)}…"</p>
                  {/if}
                </li>
              {/each}
            </ul>
          </Card.Content>
        </Card.Root>
      {/each}
    </div>
  </section>
{/if}
