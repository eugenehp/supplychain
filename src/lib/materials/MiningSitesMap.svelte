<script>
  import { onMount } from 'svelte';
  import { geoNaturalEarth1, geoPath } from 'd3-geo';
  import { select } from 'd3-selection';
  import { scaleSqrt } from 'd3-scale';
  import { feature } from 'topojson-client';
  import ChartTooltip from '../ChartTooltip.svelte';
  import { pointerViewport } from '../chart-tooltip.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { CHAIN_STAGE_BY_ID, CHAIN_STAGE_OPTIONS } from './value-chain-labels.js';

  /** @type {{ miningSites: object | null, highlightCountry?: string | null }} */
  let { miningSites = null, highlightCountry = null } = $props();

  let container;
  /** @type {import('d3-selection').Selection<SVGSVGElement, unknown, null, undefined> | null} */
  let svgRoot = null;
  /** @type {import('d3-selection').Selection<SVGGElement, unknown, null, undefined> | null} */
  let mapGroup = null;
  /** @type {object | null} */
  let worldFeatures = $state(null);
  let loadError = $state('');
  let tooltip = $state({ show: false, x: 0, y: 0, html: '' });

  let filterCountry = $state('');
  let filterSource = $state('curated');
  let filterStatus = $state('');
  let filterChainStage = $state('');
  let transform = $state({ k: 1, x: 0, y: 0 });
  let panning = $state(false);
  /** @type {{ x: number, y: number, tx: number, ty: number } | null} */
  let panStart = $state(null);
  let mapSize = $state({ width: 720, height: 400 });

  const allSites = $derived(miningSites?.sites ?? []);
  const countries = $derived(miningSites?.byCountry ?? []);

  const effectiveCountry = $derived(filterCountry || highlightCountry || '');

  const filteredSites = $derived(
    allSites.filter((site) => {
      if (effectiveCountry && site.countryCode !== effectiveCountry) return false;
      if (filterStatus && site.status !== filterStatus) return false;
      if (filterChainStage && site.chainStage !== filterChainStage) return false;
      if (filterSource === 'curated' && (site.source === 'USGS-MRDS' || site.source === 'EU-CRMA-strategic')) {
        return false;
      }
      if (filterSource === 'mrds' && site.source !== 'USGS-MRDS') return false;
      if (filterSource === 'strategic' && site.source !== 'EU-CRMA-strategic') return false;
      return true;
    }),
  );

  const countryLabel = $derived(
    filterCountry
      ? countries.find((c) => c.code === filterCountry)?.name ?? filterCountry
      : 'All countries',
  );
  const sourceLabel = $derived(
    { '': 'All types', curated: 'Curated', mrds: 'USGS MRDS', strategic: 'EU strategic' }[filterSource] ??
      'All types',
  );
  const statusLabel = $derived(
    filterStatus
      ? filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)
      : 'All statuses',
  );
  const chainStageLabel = $derived(
    filterChainStage ? (CHAIN_STAGE_BY_ID[filterChainStage]?.label ?? filterChainStage) : 'All chain stages',
  );

  /** Stable key so D3 updates do not run on unrelated parent re-renders. */
  const sitesRenderKey = $derived(
    [effectiveCountry, filterStatus, filterChainStage, filterSource, filteredSites.length].join('|'),
  );

  const statusColor = {
    operating: '#22c55e',
    processing: '#38bdf8',
    development: '#fbbf24',
    deposit: '#a78bfa',
    historic: '#94a3b8',
  };

  const radius = scaleSqrt().domain([0, 8]).range([4, 14]);

  function siteRadius(site) {
    if (site.source === 'USGS-MRDS') return 2.5;
    if (site.source === 'EU-CRMA-strategic') return 5;
    return radius(Math.max(1, site.secMentions || 1));
  }

  function siteFill(site) {
    if (site.source === 'EU-CRMA-strategic') return '#f97316';
    if (effectiveCountry && site.countryCode !== effectiveCountry) return 'var(--muted)';
    return statusColor[site.status] ?? 'var(--primary)';
  }

  function siteOpacity(site) {
    if (!effectiveCountry) return 0.9;
    return site.countryCode === effectiveCountry ? 1 : 0.25;
  }

  /** @type {number | null} */
  let tipRaf = null;
  /** @type {{ event: PointerEvent, site: object } | null} */
  let tipPending = null;

  function showTip(event, site) {
    tipPending = { event, site };
    if (tipRaf != null) return;
    tipRaf = requestAnimationFrame(() => {
      tipRaf = null;
      const pending = tipPending;
      tipPending = null;
      if (!pending) return;
      const el = /** @type {SVGElement} */ (pending.event.currentTarget);
      const { x, y } = pointerViewport(pending.event, el);
      const s = pending.site;
      tooltip = {
        show: true,
        x,
        y,
        html: `<strong>${s.flag} ${s.name}</strong><br/>
        ${s.status}${s.chainStage ? ` · ${CHAIN_STAGE_BY_ID[s.chainStage]?.shortLabel ?? s.chainStage}` : ''} · ${s.operators.join(', ')}<br/>
        Elements: ${s.elements.join(', ')}${s.source ? `<br/>Source: ${s.source}` : ''}${s.notes ? `<br/><span class="text-muted-foreground">${s.notes}</span>` : ''}`,
      };
    });
  }

  function hideTip() {
    tooltip = { show: false, x: 0, y: 0, html: '' };
  }

  function applyTransform() {
    mapGroup?.attr('transform', `translate(${transform.x},${transform.y}) scale(${transform.k})`);
  }

  function zoomBy(factor) {
    transform = {
      ...transform,
      k: Math.min(8, Math.max(0.4, transform.k * factor)),
    };
    applyTransform();
  }

  function resetZoom() {
    transform = { k: 1, x: 0, y: 0 };
    applyTransform();
  }

  function onWheel(event) {
    event.preventDefault();
    const factor = event.deltaY > 0 ? 0.88 : 1.12;
    zoomBy(factor);
  }

  function onPointerDown(event) {
    if (event.button !== 0) return;
    panning = true;
    panStart = { x: event.clientX, y: event.clientY, tx: transform.x, ty: transform.y };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  /** @param {PointerEvent} event */
  function onPointerMove(event) {
    if (!panning || !panStart) return;
    transform = {
      ...transform,
      x: panStart.tx + (event.clientX - panStart.x),
      y: panStart.ty + (event.clientY - panStart.y),
    };
    applyTransform();
  }

  function onPointerUp() {
    panning = false;
    panStart = null;
  }

  function setupMap() {
    if (!container || !worldFeatures) return;

    const width = container.clientWidth || 720;
    const height = Math.min(420, Math.max(280, width * 0.52));
    mapSize = { width, height };

    const projection = geoNaturalEarth1().fitSize([width, height], { type: 'Sphere' });
    const path = geoPath(projection);

    select(container).selectAll('svg').remove();
    svgRoot = select(container)
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', '100%')
      .attr('height', height)
      .attr('role', 'img')
      .attr('aria-label', 'World map of rare earth mining and processing sites')
      .style('touch-action', 'none')
      .on('wheel', onWheel)
      .on('pointerdown', onPointerDown)
      .on('pointermove', onPointerMove)
      .on('pointerup', onPointerUp)
      .on('pointerleave', onPointerUp);

    mapGroup = svgRoot.append('g');

    mapGroup
      .selectAll('path.country')
      .data(worldFeatures.features)
      .join('path')
      .attr('class', 'country')
      .attr('d', path)
      .attr('fill', 'var(--muted)')
      .attr('fill-opacity', 0.35)
      .attr('stroke', 'var(--border)')
      .attr('stroke-width', 0.5);

    applyTransform();
    updateSites(projection);
  }

  /** @param {import('d3-geo').GeoProjection} projection */
  function updateSites(projection) {
    if (!mapGroup) return;
    if (!projection) {
      const width = mapSize.width;
      const height = mapSize.height;
      projection = geoNaturalEarth1().fitSize([width, height], { type: 'Sphere' });
    }

    const siteG = mapGroup
      .selectAll('g.site')
      .data(filteredSites, (d) => d.id ?? `${d.name}:${d.lat}:${d.lon}`)
      .join(
        (enter) => {
          const g = enter
            .append('g')
            .attr('class', 'site')
            .attr('transform', (d) => {
              const p = projection([d.lon, d.lat]);
              return p ? `translate(${p[0]},${p[1]})` : 'translate(-999,-999)';
            });
          g.append('circle')
            .attr('class', 'site-dot')
            .attr('stroke', '#fff')
            .attr('stroke-width', 0.75)
            .style('cursor', 'pointer')
            .on('mouseenter', showTip)
            .on('mousemove', showTip)
            .on('mouseleave', hideTip);
          g.append('circle')
            .attr('class', 'site-core')
            .attr('r', 2.5)
            .attr('fill', '#fff')
            .attr('pointer-events', 'none');
          return g;
        },
        (update) =>
          update.attr('transform', (d) => {
            const p = projection([d.lon, d.lat]);
            return p ? `translate(${p[0]},${p[1]})` : 'translate(-999,-999)';
          }),
        (exit) => exit.remove(),
      );

    siteG.select('.site-dot').attr('r', (d) => siteRadius(d)).attr('fill', (d) => siteFill(d)).attr('fill-opacity', (d) =>
      d.source === 'USGS-MRDS' ? 0.55 : siteOpacity(d),
    );

    siteG
      .select('.site-core')
      .attr('display', (d) => (d.status === 'operating' && d.source !== 'USGS-MRDS' ? null : 'none'));
  }

  onMount(async () => {
    try {
      const res = await fetch('/geo/countries-110m.json');
      const topo = await res.json();
      worldFeatures = feature(topo, topo.objects.countries);
    } catch (e) {
      loadError = e?.message ?? 'Failed to load map';
    }
  });

  let mapInitialized = false;

  $effect(() => {
    if (worldFeatures && container && !mapInitialized) {
      setupMap();
      mapInitialized = true;
    }
  });

  /** @type {number | null} */
  let sitesRaf = null;

  $effect(() => {
    sitesRenderKey;
    if (!mapGroup || !worldFeatures) return;

    if (sitesRaf != null) cancelAnimationFrame(sitesRaf);
    sitesRaf = requestAnimationFrame(() => {
      sitesRaf = null;
      if (!mapGroup || !worldFeatures) return;
      const { width, height } = mapSize;
      const projection = geoNaturalEarth1().fitSize([width, height], { type: 'Sphere' });
      updateSites(projection);
    });

    return () => {
      if (sitesRaf != null) cancelAnimationFrame(sitesRaf);
    };
  });
</script>

<div class="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
  <div class="space-y-2">
    <Label>Country</Label>
    <Select.Root type="single" value={filterCountry} onValueChange={(v) => (filterCountry = v ?? '')}>
      <Select.Trigger class="w-full">{countryLabel}</Select.Trigger>
      <Select.Content>
        <Select.Item value="" label="All countries">All countries</Select.Item>
        {#each countries as c (c.code)}
          <Select.Item value={c.code} label="{c.flag} {c.name}">{c.flag} {c.name} ({c.sites.length})</Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>
  </div>

  <div class="space-y-2">
    <Label>Site type</Label>
    <Select.Root type="single" value={filterSource} onValueChange={(v) => (filterSource = v ?? '')}>
      <Select.Trigger class="w-full">{sourceLabel}</Select.Trigger>
      <Select.Content>
        <Select.Item value="" label="All types">All types</Select.Item>
        <Select.Item value="curated" label="Curated">Curated (SEC-boosted)</Select.Item>
        <Select.Item value="mrds" label="USGS MRDS">USGS MRDS deposits</Select.Item>
        <Select.Item value="strategic" label="EU strategic">EU CRMA strategic</Select.Item>
      </Select.Content>
    </Select.Root>
  </div>

  <div class="space-y-2">
    <Label>Status</Label>
    <Select.Root type="single" value={filterStatus} onValueChange={(v) => (filterStatus = v ?? '')}>
      <Select.Trigger class="w-full">{statusLabel}</Select.Trigger>
      <Select.Content>
        <Select.Item value="" label="All statuses">All statuses</Select.Item>
        <Select.Item value="operating" label="Operating">Operating</Select.Item>
        <Select.Item value="processing" label="Processing">Processing</Select.Item>
        <Select.Item value="development" label="Development">Development</Select.Item>
        <Select.Item value="deposit" label="Deposit">Deposit</Select.Item>
        <Select.Item value="historic" label="Historic">Historic</Select.Item>
      </Select.Content>
    </Select.Root>
  </div>

  <div class="space-y-2">
    <Label>Value chain stage</Label>
    <Select.Root type="single" value={filterChainStage} onValueChange={(v) => (filterChainStage = v ?? '')}>
      <Select.Trigger class="w-full">{chainStageLabel}</Select.Trigger>
      <Select.Content>
        <Select.Item value="" label="All chain stages">All chain stages</Select.Item>
        {#each CHAIN_STAGE_OPTIONS as stage (stage.id)}
          <Select.Item value={stage.id} label={stage.label}>{stage.label}</Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>
  </div>

  <div class="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-1">
    <Button variant="outline" size="sm" onclick={() => zoomBy(1.25)} aria-label="Zoom in">+</Button>
    <Button variant="outline" size="sm" onclick={() => zoomBy(0.8)} aria-label="Zoom out">−</Button>
    <Button variant="ghost" size="sm" onclick={resetZoom}>Reset</Button>
    <span class="text-muted-foreground ml-auto text-xs tabular-nums">{filteredSites.length} / {allSites.length} sites</span>
  </div>
</div>

<div class="mining-map relative w-full overflow-hidden rounded-lg border" bind:this={container}>
  {#if loadError}
    <p class="text-muted-foreground p-4 text-sm">{loadError}</p>
  {:else if !miningSites}
    <p class="text-muted-foreground p-4 text-sm">No mining site data.</p>
  {/if}
</div>

<p class="text-muted-foreground mt-2 text-xs">
  Scroll to zoom · drag to pan · map defaults to curated sites (change “Site type” to include all {allSites.length} MRDS deposits)
</p>

<div class="text-muted-foreground mt-3 flex flex-wrap gap-3 text-xs">
  <span class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-full bg-[#22c55e]"></span> Operating</span>
  <span class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-full bg-[#38bdf8]"></span> Processing</span>
  <span class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-full bg-[#fbbf24]"></span> Development</span>
  <span class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-full bg-[#a78bfa]"></span> Deposit</span>
  <span class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-full bg-[#f97316]"></span> EU strategic</span>
  <span class="ml-auto">Large = curated; orange = EU CRMA; small dots = MRDS</span>
</div>

<ChartTooltip show={tooltip.show} x={tooltip.x} y={tooltip.y} html={tooltip.html} />
