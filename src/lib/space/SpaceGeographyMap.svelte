<script>
  import { onMount } from 'svelte';
  import { geoNaturalEarth1, geoPath } from 'd3-geo';
  import { select } from 'd3-selection';
  import { feature } from 'topojson-client';
  import LoadingSpinner from '../LoadingSpinner.svelte';
  import ChartTooltip from '../ChartTooltip.svelte';
  import { pointerViewport } from '../chart-tooltip.js';
  import * as Card from '$lib/components/ui/card/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { loadSpaceEconomyGeography } from './research-answers.js';

  let data = $state(/** @type {object | null} */ (null));
  let loading = $state(true);
  let loadError = $state('');
  let typeFilter = $state('all');
  let itarFilter = $state('all');
  /** @type {HTMLDivElement | null} */
  let container = $state(null);
  let worldFeatures = $state(/** @type {any} */ (null));
  let mapInitialized = false;
  let mapSize = $state({ width: 720, height: 400 });
  let tooltip = $state({ show: false, x: 0, y: 0, html: '' });

  const sites = $derived(data?.sites ?? []);
  const itarByCountry = $derived(data?.countries ?? {});
  const itarLegend = $derived(data?.itarLegend ?? []);
  const legendById = $derived(Object.fromEntries(itarLegend.map((l) => [l.id, l])));

  const TYPE_LABELS = {
    all: 'All site types',
    hq: 'HQ',
    factory: 'Factory',
    launch: 'Launch site',
    ground: 'Ground station',
  };

  const typeColors = {
    hq: '#2563eb',
    factory: '#a855f7',
    launch: '#ef4444',
    ground: '#22c55e',
  };

  const filteredSites = $derived(
    sites.filter((s) => {
      if (typeFilter !== 'all' && s.type !== typeFilter) return false;
      if (itarFilter !== 'all') {
        const klass = itarByCountry[s.country];
        if (klass !== itarFilter) return false;
      }
      return true;
    }),
  );

  const renderKey = $derived([typeFilter, itarFilter, filteredSites.length].join('|'));

  function classForCountry(code) {
    return itarByCountry[code] ?? 'neutral';
  }

  function fillForCountry(props) {
    const code = props.iso_a2 ?? props.ISO_A2 ?? props.iso_a3 ?? props.ISO_A3 ?? null;
    const klass = code ? itarByCountry[code] : null;
    const entry = klass ? legendById[klass] : null;
    return entry?.color ?? '#1f2937';
  }

  function showTip(event, site) {
    const el = /** @type {SVGElement} */ (event.currentTarget);
    const { x, y } = pointerViewport(event, el);
    const klass = classForCountry(site.country);
    const legend = legendById[klass];
    const typeLabel = (TYPE_LABELS[site.type] ?? site.type).toString();
    tooltip = {
      show: true,
      x,
      y,
      html: `<strong>${site.name}</strong><br/>
        ${typeLabel}${site.ticker ? ` · <span class="font-mono">${site.ticker}</span>` : site.operator ? ` · ${site.operator}` : ''}<br/>
        ${site.city ?? ''}${site.country ? ` · ${site.country}` : ''}<br/>
        <span style="color:${legend?.color ?? '#94a3b8'}">●</span> ${legend?.label ?? 'Other'}`,
    };
  }

  function hideTip() {
    tooltip = { show: false, x: 0, y: 0, html: '' };
  }

  function setupMap() {
    if (!container || !worldFeatures) return;
    const width = container.clientWidth || 720;
    const height = Math.min(440, Math.max(280, width * 0.52));
    mapSize = { width, height };

    const projection = geoNaturalEarth1().fitSize([width, height], { type: 'Sphere' });
    const path = geoPath(projection);

    select(container).selectAll('svg').remove();
    const svg = select(container)
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', '100%')
      .attr('height', height)
      .attr('role', 'img')
      .attr('aria-label', 'World map of space-industry sites, colored by ITAR jurisdictional class');

    const g = svg.append('g');

    g.selectAll('path.country')
      .data(worldFeatures.features)
      .join('path')
      .attr('class', 'country')
      .attr('d', path)
      .attr('fill', (d) => fillForCountry(d.properties ?? {}))
      .attr('fill-opacity', 0.18)
      .attr('stroke', 'var(--border)')
      .attr('stroke-width', 0.4);

    updateSites(g, projection);
  }

  function updateSites(group, projection) {
    if (!projection) {
      projection = geoNaturalEarth1().fitSize([mapSize.width, mapSize.height], { type: 'Sphere' });
    }
    group
      .selectAll('g.site')
      .data(filteredSites, (d) => d.id)
      .join(
        (enter) => {
          const node = enter
            .append('g')
            .attr('class', 'site')
            .attr('transform', (d) => {
              const p = projection([d.lon, d.lat]);
              return p ? `translate(${p[0]},${p[1]})` : 'translate(-999,-999)';
            });
          node
            .append('circle')
            .attr('class', 'site-ring')
            .attr('r', (d) => (d.type === 'launch' ? 6 : 5))
            .attr('fill', (d) => typeColors[d.type] ?? '#94a3b8')
            .attr('fill-opacity', 0.85)
            .attr('stroke', '#fff')
            .attr('stroke-width', 1)
            .style('cursor', 'pointer')
            .on('mouseenter', showTip)
            .on('mousemove', showTip)
            .on('mouseleave', hideTip);
          node
            .append('circle')
            .attr('r', 1.4)
            .attr('fill', '#fff')
            .attr('pointer-events', 'none');
          return node;
        },
        (update) =>
          update.attr('transform', (d) => {
            const p = projection([d.lon, d.lat]);
            return p ? `translate(${p[0]},${p[1]})` : 'translate(-999,-999)';
          }),
        (exit) => exit.remove(),
      );
  }

  onMount(async () => {
    try {
      const [geoData, topoRes] = await Promise.all([
        loadSpaceEconomyGeography(),
        fetch('/geo/countries-110m.json'),
      ]);
      data = geoData;
      if (topoRes.ok) {
        const topo = await topoRes.json();
        worldFeatures = feature(topo, topo.objects.countries);
      } else {
        loadError = 'Failed to load world topology';
      }
    } catch (e) {
      loadError = e?.message ?? 'Map load failed';
    } finally {
      loading = false;
    }
  });

  $effect(() => {
    if (worldFeatures && container && !mapInitialized) {
      setupMap();
      mapInitialized = true;
    }
  });

  $effect(() => {
    // Re-render markers when filters change.
    renderKey;
    if (!container || !worldFeatures || !mapInitialized) return;
    const root = select(container).select('svg g');
    if (root.empty()) return;
    const projection = geoNaturalEarth1().fitSize([mapSize.width, mapSize.height], { type: 'Sphere' });
    updateSites(root, projection);
  });
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>Geography & ITAR overlay</Card.Title>
    <Card.Description>
      {#if data}
        {data.summary}
      {:else}
        Loading…
      {/if}
    </Card.Description>
  </Card.Header>

  <Card.Content class="space-y-4">
    {#if loading}
      <p class="text-muted-foreground flex items-center gap-2 text-sm">
        <LoadingSpinner />
        Loading geography…
      </p>
    {:else if loadError}
      <p class="text-destructive text-sm">{loadError}</p>
    {:else if !data}
      <p class="text-muted-foreground text-sm">No geography data — run <code class="text-xs">npm run rag:space-economy</code>.</p>
    {:else}
      <div class="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
        <div class="space-y-1">
          <Label class="text-muted-foreground text-[10px] uppercase tracking-wide">Site type</Label>
          <Select.Root type="single" value={typeFilter} onValueChange={(v) => v && (typeFilter = v)}>
            <Select.Trigger class="w-full">{TYPE_LABELS[typeFilter]}</Select.Trigger>
            <Select.Content>
              {#each Object.entries(TYPE_LABELS) as [v, label]}
                <Select.Item value={v} {label}>{label}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>
        <div class="space-y-1">
          <Label class="text-muted-foreground text-[10px] uppercase tracking-wide">ITAR class</Label>
          <Select.Root type="single" value={itarFilter} onValueChange={(v) => v && (itarFilter = v)}>
            <Select.Trigger class="w-full">
              {itarFilter === 'all' ? 'All jurisdictions' : (legendById[itarFilter]?.label ?? itarFilter)}
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="all" label="All jurisdictions">All jurisdictions</Select.Item>
              {#each itarLegend as l}
                <Select.Item value={l.id} label={l.label}>{l.label}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>
        <Badge variant="secondary" class="text-xs">{filteredSites.length} sites</Badge>
      </div>

      <div class="relative rounded-lg border bg-muted/10" bind:this={container}></div>

      <div class="grid gap-3 sm:grid-cols-2">
        <div class="space-y-2">
          <h4 class="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">Site type legend</h4>
          <div class="flex flex-wrap gap-3 text-xs">
            {#each Object.entries(typeColors) as [t, color]}
              <span class="inline-flex items-center gap-1.5">
                <span class="inline-block size-2.5 rounded-full" style="background:{color}"></span>
                <span>{TYPE_LABELS[t]}</span>
              </span>
            {/each}
          </div>
        </div>
        <div class="space-y-2">
          <h4 class="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">ITAR jurisdictional class</h4>
          <div class="flex flex-wrap gap-3 text-xs">
            {#each itarLegend as l}
              <span class="inline-flex items-center gap-1.5" title={l.note}>
                <span class="inline-block size-2.5 rounded-sm" style="background:{l.color}; opacity:0.6"></span>
                <span>{l.label}</span>
              </span>
            {/each}
          </div>
        </div>
      </div>
    {/if}
  </Card.Content>
</Card.Root>

<ChartTooltip show={tooltip.show} x={tooltip.x} y={tooltip.y} html={tooltip.html} />
