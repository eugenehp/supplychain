<script>
  import { onMount } from 'svelte';
  import { untrack } from 'svelte';
  import { geoNaturalEarth1, geoPath, geoGraticule10 } from 'd3-geo';
  import { select } from 'd3-selection';
  import { zoom, zoomIdentity, zoomTransform } from 'd3-zoom';
  import { scaleSqrt } from 'd3-scale';
  import { transition } from 'd3-transition';
  import { easeCubicInOut } from 'd3-ease';
  import { feature } from 'topojson-client';
  import { clampSankeyTier } from './sankey-data.js';
  import {
    prepareMapData,
    NUMERIC_TO_ALPHA,
    curvedLinkPath,
    countryMatchesHighlight,
    assignFlowLanes,
  } from './geo-map-data.js';
  import { formatFlowUsd } from './flow-format.js';
  import { geoLabelForNode } from './vendor-geography.js';
  import ChartTooltip from './ChartTooltip.svelte';
  import { pointerViewport } from './chart-tooltip.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import * as Card from '$lib/components/ui/card/index.js';
  import * as Table from '$lib/components/ui/table/index.js';
  import * as ScrollArea from '$lib/components/ui/scroll-area/index.js';
  import { cn } from '$lib/utils.js';

  /** @type {{ data: object, maxTier?: number, highlightCountry?: string | null }} */
  let { data, maxTier = 5, highlightCountry = null } = $props();

  let container;
  let mapWrap;
  let svgRoot;
  let gViewport;
  let zoomBehavior;
  let gMap;
  let gFlows;
  let gFlowLabels;
  let gMarkers;
  let gLabels;
  let worldLoaded = $state(false);
  let loadError = $state('');
  let tooltip = $state({ show: false, x: 0, y: 0, html: '' });

  const DIM_COUNTRY = 0.18;
  const DIM_FLOW = 0.07;
  const FULL_FLOW = 0.72;
  const HOVER_FLOW = 0.95;
  const MAP_FLOW_LABEL_MIN = 5;
  const MAP_FLOW_LABEL_LIMIT = 40;
  const ZOOM_MIN = 0.65;
  const ZOOM_MAX = 10;
  const ZOOM_STEP = 1.35;
  /** Mild stroke tame so arcs stay visible when zoomed in. */
  const ZOOM_STROKE_TAME = 0.55;
  /** Hide country $ sublabels above this zoom (they overlap when panning). */
  const ZOOM_HIDE_FLOW_SUBLABEL = 2.2;

  let zoomK = $state(1);
  /** @type {import('d3-geo').GeoProjection | null} */
  let activeProjection = null;

  const mapModel = $derived(prepareMapData(data, clampSankeyTier(maxTier)));

  const visibleVendorFlows = $derived(
    assignFlowLanes(
      highlightCountry
        ? mapModel.vendorFlows.filter((f) => f.from === highlightCountry || f.to === highlightCountry)
        : mapModel.vendorFlows,
    ),
  );

  const visibleCountries = $derived(
    highlightCountry
      ? mapModel.countries.filter((c) => c.code === highlightCountry)
      : mapModel.countries,
  );

  function overlayScale(k) {
    return 1 / Math.max(ZOOM_MIN, k);
  }

  /** Counter-scale at map point so overlays stay ~constant screen size. */
  function counterScaleAt(x, y, k, localY = 0) {
    const s = overlayScale(k);
    return `translate(${x},${y}) scale(${s}) translate(0,${localY})`;
  }

  function zoomStrokeDiv(k) {
    const kk = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, k));
    return Math.pow(kk, ZOOM_STROKE_TAME);
  }

  function zoomTranslateExtent(width, height) {
    const padX = width * ZOOM_MAX;
    const padY = height * ZOOM_MAX;
    return [[-padX, -padY], [width + padX, height + padY]];
  }

  function labeledFlowsAtZoom(k) {
    const kk = Math.max(ZOOM_MIN, k);
    if (kk <= 1.25) {
      return visibleVendorFlows
        .filter((f) => f.value >= MAP_FLOW_LABEL_MIN)
        .slice(0, MAP_FLOW_LABEL_LIMIT);
    }
    if (kk <= 3) {
      const min = Math.max(3, MAP_FLOW_LABEL_MIN / kk);
      const limit = Math.min(50, Math.round(MAP_FLOW_LABEL_LIMIT * Math.sqrt(kk)));
      return visibleVendorFlows.filter((f) => f.value >= min).slice(0, limit);
    }
    // High zoom: thin on-map arc labels — tooltips + table carry detail
    const min = Math.max(10, MAP_FLOW_LABEL_MIN);
    const limit = Math.max(10, Math.round(22 / Math.sqrt(kk)));
    return visibleVendorFlows.filter((f) => f.value >= min).slice(0, limit);
  }

  function flowWidthScale() {
    const maxFlow = Math.max(1, ...mapModel.vendorFlows.map((f) => f.value));
    return scaleSqrt().domain([1, maxFlow]).range([0.8, 5.5]);
  }

  function markerRadiusScale() {
    return scaleSqrt()
      .domain([1, Math.max(...mapModel.countries.map((c) => c.vendors.length), 1)])
      .range([5, 14]);
  }

  const anim = () => transition().duration(220).ease(easeCubicInOut);

  function countryOpacity(code) {
    return countryMatchesHighlight(code, highlightCountry) ? 1 : DIM_COUNTRY;
  }

  function vendorFlowMatches(f) {
    if (!highlightCountry) return true;
    return f.from === highlightCountry || f.to === highlightCountry;
  }

  function initSvg() {
    if (!container) return;
    select(container).selectAll('*').remove();

    svgRoot = select(container)
      .append('svg')
      .attr('class', 'world-map-svg');

    const defs = svgRoot.append('defs');
    defs.append('marker')
      .attr('id', 'flow-arrow')
      .attr('viewBox', '0 -4 8 8')
      .attr('refX', 7)
      .attr('refY', 0)
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4 L8,0 L0,4')
      .attr('fill', 'context-stroke');

    gViewport = svgRoot.append('g').attr('class', 'map-viewport');
    gMap = gViewport.append('g').attr('class', 'land');
    gViewport.append('path').attr('class', 'graticule').attr('fill', 'none');
    gFlows = gViewport.append('g').attr('class', 'flows');
    gFlowLabels = gViewport.append('g').attr('class', 'flow-labels');
    gMarkers = gViewport.append('g').attr('class', 'markers');
    gLabels = gViewport.append('g').attr('class', 'labels');
  }

  function mapDimensions() {
    const width = (mapWrap ?? container)?.clientWidth ?? 800;
    const height = Math.max(480, width * 0.55);
    return { width, height };
  }

  function mapCenter() {
    const { width, height } = mapDimensions();
    return [width / 2, height / 2];
  }

  function setupZoom() {
    if (!svgRoot || !gViewport || !container) return;

    const { width, height } = mapDimensions();

    zoomBehavior = zoom()
      .scaleExtent([ZOOM_MIN, ZOOM_MAX])
      .extent([[0, 0], [width, height]])
      .translateExtent(zoomTranslateExtent(width, height))
      .on('zoom', (event) => {
        gViewport.attr('transform', event.transform);
        zoomK = event.transform.k;
        applyZoomVisuals(event.transform.k);
      })
      .on('start', () => {
        svgRoot.style('cursor', 'grabbing');
      })
      .on('end', () => {
        svgRoot.style('cursor', 'grab');
      });

    svgRoot
      .style('touch-action', 'none')
      .style('cursor', 'grab')
      .call(zoomBehavior)
      .on('dblclick.zoom', null);
  }

  function updateZoomExtents() {
    if (!zoomBehavior || !container) return;
    const { width, height } = mapDimensions();
    zoomBehavior
      .extent([[0, 0], [width, height]])
      .translateExtent(zoomTranslateExtent(width, height));
  }

  function zoomIn() {
    if (!svgRoot || !zoomBehavior) return;
    svgRoot.transition().duration(220).call(zoomBehavior.scaleBy, ZOOM_STEP, mapCenter());
  }

  function zoomOut() {
    if (!svgRoot || !zoomBehavior) return;
    svgRoot.transition().duration(220).call(zoomBehavior.scaleBy, 1 / ZOOM_STEP, mapCenter());
  }

  function zoomReset() {
    if (!svgRoot || !zoomBehavior) return;
    svgRoot.transition().duration(280).call(zoomBehavior.transform, zoomIdentity);
  }

  function layoutFlowLabel(g, d, projection, k) {
    const pts = projectFlowEndpoints(projection, d);
    if (!pts) return;

    g.attr('transform', counterScaleAt(pts.cx, pts.cy, k));
    const companies = `${d.sourceName} → ${d.targetName}`;
    const value = formatFlowUsd(d.value);
    const companiesText = g.select('.flow-companies')
      .attr('text-anchor', 'middle')
      .attr('y', -6)
      .attr('font-size', 10)
      .text(companies);
    g.select('.flow-value')
      .attr('text-anchor', 'middle')
      .attr('y', 8)
      .attr('font-size', 11)
      .text(value);
    const cNode = companiesText.node();
    const vNode = g.select('.flow-value').node();
    if (!cNode || !vNode) return;
    const cBox = cNode.getBBox();
    const vBox = vNode.getBBox();
    const padX = 5;
    const padY = 3;
    const w = Math.max(cBox.width, vBox.width) + padX * 2;
    const h = cBox.height + vBox.height + padY * 2 + 4;
    g.select('.flow-label-bg')
      .attr('x', -w / 2)
      .attr('y', -h / 2 - 2)
      .attr('width', w)
      .attr('height', h)
      .attr('rx', 4)
      .attr('stroke-width', 0.5);
  }

  function renderFlowLabels(projection, k) {
    if (!gFlowLabels) return;
    const labelFlows = labeledFlowsAtZoom(k);
    const flowLabels = gFlowLabels.selectAll('g.vendor-flow-label').data(labelFlows, (d) => `${d.sourceId}|${d.targetId}`);

    flowLabels.exit().remove();

    const flowLabelsEnter = flowLabels.enter()
      .append('g')
      .attr('class', 'vendor-flow-label')
      .attr('pointer-events', 'none');

    flowLabelsEnter.append('rect').attr('class', 'flow-label-bg');
    flowLabelsEnter.append('text').attr('class', 'flow-companies');
    flowLabelsEnter.append('text').attr('class', 'flow-value');

    flowLabelsEnter.merge(flowLabels)
      .attr('opacity', (d) => (vendorFlowMatches(d) ? 1 : 0.12))
      .each(function (d) {
        layoutFlowLabel(select(this), d, projection, k);
      });
  }

  function applyZoomVisuals(k) {
    if (!svgRoot || !gFlows) return;

    const strokeDiv = zoomStrokeDiv(k);
    const widthScale = flowWidthScale();
    const arrowDiv = Math.pow(k, 0.45);
    const radiusScale = markerRadiusScale();
    const showFlowSublabels = k <= ZOOM_HIDE_FLOW_SUBLABEL;

    svgRoot.select('#flow-arrow')
      .attr('markerWidth', 5 / arrowDiv)
      .attr('markerHeight', 5 / arrowDiv);

    gFlows.selectAll('path.flow')
      .attr('stroke-width', (d) => widthScale(d.value) / strokeDiv);

    if (gMarkers && activeProjection) {
      gMarkers.selectAll('g.marker').attr('transform', (d) => {
        const [x, y] = activeProjection(d.centroid);
        return counterScaleAt(x, y, k);
      });
      gMarkers.selectAll('.marker-ring')
        .attr('r', (d) => radiusScale(d.vendors.length) + 3)
        .attr('stroke-width', 1);
      gMarkers.selectAll('.marker-dot')
        .attr('r', (d) => radiusScale(d.vendors.length));
      gMarkers.selectAll('.marker-count')
        .attr('y', 4)
        .attr('font-size', 10);
    }

    if (gLabels && activeProjection) {
      gLabels.selectAll('text.country-label').each(function (d) {
        const [x, y] = activeProjection(d.centroid);
        const r = radiusScale(d.vendors.length);
        select(this).attr('transform', counterScaleAt(x, y, k, r + 14));
        select(this).select('.country-flow-total').attr('opacity', showFlowSublabels ? 1 : 0);
      });
    }

    if (activeProjection) {
      renderFlowLabels(activeProjection, k);
    }
  }

  async function loadWorld() {
    try {
      const res = await fetch('/geo/countries-110m.json');
      if (!res.ok) throw new Error(`Map data ${res.status}`);
      const topology = await res.json();
      worldLoaded = true;
      return feature(topology, topology.objects.countries);
    } catch (err) {
      loadError = err?.message ?? 'Failed to load map';
      return null;
    }
  }

  function projectFlowEndpoints(projection, flow) {
    const from = mapModel.countries.find((c) => c.code === flow.from);
    const to = mapModel.countries.find((c) => c.code === flow.to);
    if (!from?.centroid || !to?.centroid) return null;
    const [x0, y0] = projection(from.centroid);
    const [x1, y1] = projection(to.centroid);
    const curve = curvedLinkPath(x0, y0, x1, y1, 0.2, flow.lane ?? 0);
    return { x0, y0, x1, y1, ...curve };
  }

  function renderChart(world) {
    if (!container || !svgRoot || !world) return;

    const width = (mapWrap ?? container).clientWidth;
    const height = Math.max(480, width * 0.55);
    const margin = { top: 20, right: 24, bottom: 20, left: 24 };

    svgRoot
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    updateZoomExtents();

    const projection = geoNaturalEarth1()
      .fitExtent(
        [[margin.left, margin.top], [width - margin.right, height - margin.bottom]],
        world,
      );

    const path = geoPath(projection);
    const supplyCodes = new Set(mapModel.countries.map((c) => c.code));
    const t = anim();

    svgRoot.select('.graticule')
      .datum(geoGraticule10())
      .attr('d', path)
      .attr('stroke', 'var(--map-graticule, rgba(255,255,255,0.06))')
      .attr('stroke-width', 0.5);

    const land = gMap.selectAll('path.country').data(world.features, (d) => d.id);

    land.exit().remove();

    land.enter()
      .append('path')
      .attr('class', 'country')
      .merge(land)
      .attr('d', path)
      .attr('fill', (d) => {
        const code = NUMERIC_TO_ALPHA[d.id];
        return supplyCodes.has(code) ? 'var(--map-supply-fill)' : 'var(--map-land, rgba(255,255,255,0.04))';
      })
      .attr('stroke', 'var(--map-border, rgba(255,255,255,0.08))')
      .attr('stroke-width', 0.5)
      .transition(t)
      .attr('opacity', (d) => {
        const code = NUMERIC_TO_ALPHA[d.id];
        if (!code || !supplyCodes.has(code)) return highlightCountry ? 0.35 : 1;
        return countryOpacity(code);
      });

    const widthScale = flowWidthScale();

    const vendorArcs = assignFlowLanes(mapModel.vendorFlows);
    const flows = gFlows.selectAll('path.flow').data(vendorArcs, (d) => `${d.sourceId}|${d.targetId}`);

    flows.exit().transition(t).attr('stroke-opacity', 0).remove();

    const flowsEnter = flows.enter()
      .append('path')
      .attr('class', 'flow vendor-flow')
      .attr('fill', 'none')
      .attr('stroke', 'var(--map-flow)')
      .attr('stroke-linecap', 'round')
      .attr('marker-end', 'url(#flow-arrow)')
      .attr('stroke-opacity', 0)
      .on('mouseenter', vendorFlowMouseenter)
      .on('mousemove', flowMousemove)
      .on('mouseleave', vendorFlowMouseleave);

    flowsEnter.merge(flows)
      .attr('stroke-width', (d) => widthScale(d.value))
      .attr('d', (d) => {
        const pts = projectFlowEndpoints(projection, d);
        return pts?.path ?? '';
      })
      .transition(t)
      .attr('stroke-opacity', (d) => (vendorFlowMatches(d) ? 0.55 : DIM_FLOW));

    const radiusScale = markerRadiusScale();

    const markers = gMarkers.selectAll('g.marker').data(mapModel.countries, (d) => d.code);

    markers.exit().remove();

    const markersEnter = markers.enter()
      .append('g')
      .attr('class', 'marker')
      .on('mouseenter', markerMouseenter)
      .on('mousemove', markerMousemove)
      .on('mouseleave', markerMouseleave);

    markersEnter.append('circle').attr('class', 'marker-ring');
    markersEnter.append('circle').attr('class', 'marker-dot');
    markersEnter.append('text').attr('class', 'marker-count');

    const markerMerge = markersEnter.merge(markers);

    markerMerge
      .attr('opacity', (d) => countryOpacity(d.code));

    markerMerge.select('.marker-ring')
      .attr('r', (d) => radiusScale(d.vendors.length) + 3)
      .attr('fill', 'var(--map-marker-ring)')
      .attr('stroke', 'var(--map-flow)')
      .attr('stroke-width', 1);

    markerMerge.select('.marker-dot')
      .attr('r', (d) => radiusScale(d.vendors.length))
      .attr('fill', 'var(--map-flow)');

    markerMerge.select('.marker-count')
      .attr('y', 4)
      .attr('text-anchor', 'middle')
      .attr('font-size', 10)
      .attr('font-weight', 700)
      .attr('fill', 'var(--map-marker-text, #0d1117)')
      .text((d) => d.vendors.length);

    const labels = gLabels.selectAll('text.country-label').data(mapModel.countries, (d) => d.code);

    labels.exit().remove();

    labels.enter()
      .append('text')
      .attr('class', 'country-label')
      .merge(labels)
      .attr('text-anchor', 'middle')
      .attr('opacity', (d) => countryOpacity(d.code))
      .each(function (d) {
        const el = select(this);
        el.selectAll('tspan').remove();
        el.append('tspan')
          .attr('x', 0)
          .attr('dy', 0)
          .attr('font-size', 11)
          .text(`${d.flag} ${d.name}`);
        el.append('tspan')
          .attr('x', 0)
          .attr('dy', '1.15em')
          .attr('class', 'country-flow-total')
          .attr('font-size', 9)
          .text(`↓${formatFlowUsd(d.inValue)} ↑${formatFlowUsd(d.outValue)}`);
      });

    activeProjection = projection;
    const k = svgRoot?.node() ? zoomTransform(svgRoot.node()).k : zoomK;
    zoomK = k;
    applyZoomVisuals(k);
  }

  function vendorFlowMouseenter(event, d) {
    select(event.currentTarget).attr('stroke-opacity', HOVER_FLOW);
    const fromGeo = geoLabelForNode({ country: d.from });
    const toGeo = geoLabelForNode({ country: d.to });
    const { x, y } = pointerViewport(event);
    tooltip = {
      show: true,
      x,
      y,
      html: `<strong>${d.sourceName} → ${d.targetName}</strong><br/>${formatFlowUsd(d.value)} / chip<br/>${fromGeo?.flag ?? ''} ${fromGeo?.name ?? d.from} → ${toGeo?.flag ?? ''} ${toGeo?.name ?? d.to}`,
    };
  }

  function flowMousemove(event) {
    const { x, y } = pointerViewport(event);
    tooltip = { ...tooltip, x, y };
  }

  function vendorFlowMouseleave(event, d) {
    select(event.currentTarget).attr('stroke-opacity', vendorFlowMatches(d) ? 0.55 : DIM_FLOW);
    tooltip = { ...tooltip, show: false };
  }

  function markerMouseenter(event, d) {
    const vendorLines = d.vendorDetails
      .slice(0, 8)
      .map((v) => `${v.name}: ↓${formatFlowUsd(v.inVal)} ↑${formatFlowUsd(v.outVal)}`)
      .join('<br/>');
    const { x, y } = pointerViewport(event);
    tooltip = {
      show: true,
      x,
      y,
      html: `<strong>${d.flag} ${d.name}</strong><br/>${d.vendors.length} vendors<br/>${vendorLines}`,
    };
  }

  function markerMousemove(event) {
    const { x, y } = pointerViewport(event);
    tooltip = { ...tooltip, x, y };
  }

  function markerMouseleave() {
    tooltip = { ...tooltip, show: false };
  }

  function updateHighlight() {
    if (!gMap || !gFlows || !gMarkers || !gLabels || !gFlowLabels) return;
    const t = anim();
    const supplyCodes = new Set(mapModel.countries.map((c) => c.code));
    gMap.selectAll('path.country').transition(t).attr('opacity', (d) => {
      const code = NUMERIC_TO_ALPHA[d.id];
      if (!code || !supplyCodes.has(code)) return highlightCountry ? 0.35 : 1;
      return countryOpacity(code);
    });
    gFlows.selectAll('path.flow').transition(t).attr('stroke-opacity', (d) => (vendorFlowMatches(d) ? 0.55 : DIM_FLOW));
    gFlowLabels.selectAll('g.vendor-flow-label').transition(t).attr('opacity', (d) => (vendorFlowMatches(d) ? 1 : 0.1));
    gMarkers.selectAll('g.marker').transition(t).attr('opacity', (d) => countryOpacity(d.code));
    gLabels.selectAll('text.country-label').transition(t).attr('opacity', (d) => countryOpacity(d.code));
  }

  let worldFeatures = null;

  onMount(async () => {
    initSvg();
    setupZoom();
    worldFeatures = await loadWorld();
    if (worldFeatures) {
      renderChart(worldFeatures);
      const ro = new ResizeObserver(() => renderChart(worldFeatures));
      ro.observe(mapWrap ?? container);
      return () => ro.disconnect();
    }
  });

  $effect(() => {
    mapModel;
    highlightCountry;
    if (container && svgRoot && worldFeatures) untrack(() => renderChart(worldFeatures));
  });

  $effect(() => {
    highlightCountry;
    if (container && svgRoot && worldFeatures) untrack(() => updateHighlight());
  });
</script>

<div class="map-panel flex flex-col gap-[var(--block-gap)]">
  <div class="map-wrap map-wrap-full min-h-chart-min"
    class:filter-active={!!highlightCountry}
    bind:this={mapWrap}
    role="img"
    aria-label="World map of supply chain flows"
  >
    {#if worldLoaded && !loadError}
      <div class="map-zoom-controls bg-background/90 border-border flex gap-0.5 rounded-lg border p-1 shadow-sm backdrop-blur-sm" role="group" aria-label="Map zoom">
        <Button variant="ghost" size="icon-sm" onclick={zoomIn} aria-label="Zoom in" title="Zoom in">+</Button>
        <Button variant="ghost" size="icon-sm" onclick={zoomOut} aria-label="Zoom out" title="Zoom out">−</Button>
        <Button variant="ghost" size="icon-sm" onclick={zoomReset} aria-label="Reset zoom" title="Reset view">↺</Button>
      </div>
      <p class="map-zoom-hint" aria-hidden="true">Scroll to zoom · drag to pan · labels stay fixed size</p>
    {/if}
    <div class="map-canvas" bind:this={container}></div>
    {#if loadError}
      <p class="map-error">{loadError}</p>
    {:else if !worldLoaded}
      <p class="map-loading">Loading world map…</p>
    {/if}
  </div>

  <div class="grid min-h-panel-scroll grid-cols-1 items-stretch gap-[var(--block-gap)] lg:grid-cols-[1.4fr_1fr]">
  <Card.Root class="flow-table-primary ui-panel-fill border-primary/25 border-2">
    <Card.Header class="pb-2">
      <Card.Title class="text-base">Vendor flows</Card.Title>
      <Card.Description>
        {visibleVendorFlows.length} company links · $/chip · same data as Sankey
      </Card.Description>
    </Card.Header>
    <Card.Content class="pt-0">
      <ScrollArea.Root class="ui-scroll-fill max-h-full">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Supplier</Table.Head>
              <Table.Head class="w-8 text-center"></Table.Head>
              <Table.Head>Customer</Table.Head>
              <Table.Head class="text-right">$/chip</Table.Head>
              <Table.Head>Route</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each visibleVendorFlows as flow (`${flow.sourceId}|${flow.targetId}`)}
              {@const fromGeo = geoLabelForNode({ country: flow.from })}
              {@const toGeo = geoLabelForNode({ country: flow.to })}
              <Table.Row class={cn(highlightCountry && !vendorFlowMatches(flow) && 'opacity-40')}>
                <Table.Cell class="font-medium">{flow.sourceName}</Table.Cell>
                <Table.Cell class="text-muted-foreground w-8 text-center">→</Table.Cell>
                <Table.Cell class="font-medium">{flow.targetName}</Table.Cell>
                <Table.Cell class="text-primary text-right font-semibold tabular-nums">{formatFlowUsd(flow.value)}</Table.Cell>
                <Table.Cell class="text-muted-foreground">{fromGeo?.flag ?? ''} → {toGeo?.flag ?? ''}</Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      </ScrollArea.Root>
    </Card.Content>
  </Card.Root>

  <Card.Root class="ui-panel-fill" aria-label="Vendors by country">
    <Card.Header class="pb-2">
      <Card.Title class="text-base">Companies by country</Card.Title>
    </Card.Header>
    <Card.Content class="pt-0">
    <ScrollArea.Root class="ui-scroll-fill max-h-full">
    <div class="country-grid pr-3">
      {#each visibleCountries as country (country.code)}
        <section class="country-block">
          <header>
            <span class="country-name">{country.flag} {country.name}</span>
            <span class="country-total">↓{formatFlowUsd(country.inValue)} ↑{formatFlowUsd(country.outValue)}</span>
          </header>
          <ul>
            {#each country.vendorDetails as vendor (vendor.name)}
              <li>
                <span class="vendor-name">{vendor.name}</span>
                <span class="vendor-flows">
                  {#if vendor.inVal > 0}<span class="in">↓{formatFlowUsd(vendor.inVal)}</span>{/if}
                  {#if vendor.outVal > 0}<span class="out">↑{formatFlowUsd(vendor.outVal)}</span>{/if}
                </span>
              </li>
            {/each}
          </ul>
        </section>
      {/each}
    </div>
    </ScrollArea.Root>
    </Card.Content>
  </Card.Root>
  </div>
</div>

<ChartTooltip show={tooltip.show} x={tooltip.x} y={tooltip.y} html={tooltip.html} maxWidth={320} />

<style>

  .map-row {
    display: none;
  }

  .map-wrap-full {
    width: 100%;
  }

  .map-canvas {
    width: 100%;
    min-height: inherit;
  }

  .map-wrap {
    width: 100%;
    min-height: 380px;
    position: relative;
    border-radius: 8px;
    background: var(--surface-2, var(--surface));
    border: 1px solid var(--border);
    overflow: hidden;
    padding: var(--space-2);
    margin: 0;
  }

  .map-wrap :global(svg) {
    display: block;
    font-family: 'IBM Plex Sans', system-ui, sans-serif;
  }

  .map-zoom-controls {
    position: absolute;
    top: var(--space-3);
    right: var(--space-3);
    z-index: 2;
  }

  .map-zoom-hint {
    position: absolute;
    left: var(--space-3);
    bottom: var(--space-3);
    z-index: 2;
    margin: 0;
    padding: var(--space-1) var(--space-3);
    border-radius: 6px;
    font-size: 0.72rem;
    color: var(--text-subtle);
    background: color-mix(in srgb, var(--surface-solid, var(--surface)) 88%, transparent);
    border: 1px solid var(--border);
    pointer-events: none;
  }

  .map-wrap :global(path.flow) {
    cursor: pointer;
    transition: stroke-opacity 0.15s;
  }

  .map-wrap :global(g.marker) {
    cursor: pointer;
  }

  .map-wrap :global(.country-label) {
    fill: var(--text-subtle);
    font-size: 11px;
    font-weight: 500;
    pointer-events: none;
  }

  .map-wrap :global(.country-flow-total) {
    fill: var(--accent);
    font-size: 9px;
    font-weight: 600;
  }

  .map-wrap :global(.flow-label-bg) {
    fill: var(--surface-solid, var(--surface));
    stroke: var(--border);
    stroke-width: 0.5;
    opacity: 0.94;
  }

  .map-wrap :global(.flow-companies) {
    fill: var(--text);
    font-size: 10px;
    font-weight: 500;
  }

  .map-wrap :global(.flow-value) {
    fill: var(--accent);
    font-size: 11px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .country-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: var(--space-4);
  }

  .country-block {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: var(--space-3);
  }

  .country-block + .country-block {
    margin-top: 0;
    padding-top: var(--space-3);
    border-top: none;
  }

  .sidebar-title {
    margin: 0 0 var(--space-3);
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-subtle);
  }

  .country-block header {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    margin-bottom: var(--space-2);
  }

  .country-name {
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--text);
  }

  .country-total {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--accent);
    font-variant-numeric: tabular-nums;
  }

  .country-block ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .country-block li {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: var(--space-2);
    padding: var(--space-1) 0;
    font-size: 0.78rem;
    border-bottom: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
  }

  .country-block li:last-child {
    border-bottom: none;
  }

  .vendor-name {
    color: var(--text-muted);
    min-width: 0;
    line-height: 1.35;
  }

  .vendor-flows {
    display: flex;
    gap: var(--space-2);
    flex-shrink: 0;
    font-size: 0.72rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .vendor-flows .in {
    color: var(--accent);
  }

  .vendor-flows .out {
    color: var(--text-subtle);
  }

  .flow-table-wrap {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: var(--space-4);
  }

  .table-title {
    margin: 0 0 var(--space-3);
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text);
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--space-2) var(--space-3);
  }

  .table-sub {
    font-size: 0.72rem;
    font-weight: 400;
    color: var(--text-subtle);
  }

  .flow-table th {
    position: sticky;
    top: 0;
    background: var(--surface);
    text-align: left;
    font-size: 0.68rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-subtle);
    padding: var(--space-2) var(--space-3);
    border-bottom: 1px solid var(--border);
  }

  .flow-table td {
    padding: var(--space-2) var(--space-3);
    border-bottom: 1px solid color-mix(in srgb, var(--border) 55%, transparent);
    color: var(--text-muted);
    vertical-align: top;
  }

  .flow-table tbody tr:hover {
    background: var(--surface-2);
  }

  .flow-table tr.dimmed {
    opacity: 0.35;
  }

  .flow-table .num {
    text-align: right;
    font-weight: 700;
    color: var(--accent);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .flow-table th.num {
    text-align: right;
    color: var(--text-subtle);
  }

  .flow-table .route {
    color: var(--text-subtle);
    white-space: nowrap;
    font-size: 0.9em;
  }

  .map-loading,
  .map-error {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    z-index: 1;
    pointer-events: none;
    font-size: 0.9rem;
    color: var(--text-subtle);
  }

  .map-error {
    color: #e63946;
  }

  @media (max-width: 900px) {
    .country-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
