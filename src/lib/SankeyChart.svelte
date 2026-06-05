<script>
  import { onMount } from 'svelte';
  import { untrack } from 'svelte';
  import { sankey } from 'd3-sankey';
  import { select } from 'd3-selection';
  import { transition } from 'd3-transition';
  import { easeCubicInOut } from 'd3-ease';
  import {
    filterSankeyByMaxTier,
    visibleTierLabels,
    tierColumnX,
    clampSankeyTier,
  } from './sankey-data.js';
  import { filingMapFromList, nodeLogoMeta, logoSize, logoLayout, appendChartLogoImage } from './sankey-logos.js';
  import { geoLabelForNode, countryForNode } from './vendor-geography.js';
  import { formatFlowUsd, nodeFlowLabel, shouldShowLinkLabel, nodeHasRoomForValue } from './flow-format.js';
  import { nodeFillColor, linkFillColor } from './vendor-colors.js';
  import ChartTooltip from './ChartTooltip.svelte';
  import { pointerViewport } from './chart-tooltip.js';
  import { getResolvedTheme, subscribeTheme } from './theme.js';
  import { debounce, prefersReducedMotion } from './performance.js';

  const LINK_LABEL_CAP = 14;
  const PX_PER_NODE = 36;
  const MIN_CHART_HEIGHT = 920;
  const MAX_CHART_HEIGHT = 3200;

  const DIM_NODE_OPACITY = 0.14;
  const DIM_LINK_OPACITY = 0.07;
  const FULL_LINK_OPACITY = 0.42;
  const HOVER_LINK_OPACITY = 0.55;

  /** @type {{ data: object, maxTier?: number, tierLabels?: string[], secFilings?: object[], highlightCountry?: string | null }} */
  let {
    data,
    maxTier = 5,
    tierLabels = ['Product', 'Tier 1', 'Tier 2', 'Tier 3', 'Tier 4', 'Tier 5'],
    secFilings = [],
    highlightCountry = null,
  } = $props();

  let container;
  let tooltip = $state({ show: false, x: 0, y: 0, html: '' });
  let svgRoot;
  let gLabels;
  let gLinks;
  let gLinkLabels;
  let gNodes;
  let firstDraw = true;
  let resolvedTheme = $state(getResolvedTheme());
  const reduceMotion = prefersReducedMotion();

  const filteredData = $derived(filterSankeyByMaxTier(data, clampSankeyTier(maxTier)));
  const activeTierLabels = $derived(visibleTierLabels(tierLabels, clampSankeyTier(maxTier)));
  const filingMap = $derived(filingMapFromList(secFilings));
  const chartHeight = $derived(
    Math.max(
      MIN_CHART_HEIGHT,
      Math.min(MAX_CHART_HEIGHT, (filteredData?.nodes?.length ?? 0) * PX_PER_NODE + 140),
    ),
  );

  const anim = () => {
    const ms = reduceMotion ? 0 : firstDraw ? 900 : 650;
    return transition().duration(ms).ease(easeCubicInOut);
  };

  /** Map present tiers to contiguous columns — avoids empty columns when maxTier > data depth. */
  function buildTierNodeAlign(nodes) {
    const tiers = [...new Set(nodes.map((n) => n.tier ?? 0))].sort((a, b) => a - b);
    const minTier = tiers[0] ?? 0;
    const maxTier = tiers[tiers.length - 1] ?? 0;
    const span = Math.max(1, maxTier - minTier);
    return (node, n) => {
      const col = Math.round((1 - ((node.tier ?? 0) - minTier) / span) * (n - 1));
      return Math.max(0, Math.min(n - 1, col));
    };
  }

  /** Filled ribbon — edges stay vertical at node faces (thick stroke on curves looks misaligned). */
  function sankeyLinkRibbon(d) {
    const w = Math.max(d.width ?? 1, 0);
    const half = w / 2;
    const x0 = d.source.x1;
    const x1 = d.target.x0;
    const y0 = d.y0 ?? 0;
    const y1 = d.y1 ?? 0;
    const xi = (x0 + x1) / 2;
    return `M${x0},${y0 - half}C${xi},${y0 - half} ${xi},${y1 - half} ${x1},${y1 - half}L${x1},${y1 + half}C${xi},${y1 + half} ${xi},${y0 + half} ${x0},${y0 + half}Z`;
  }

  function linkMidpoint(d) {
    const x = (d.source.x1 + d.target.x0) / 2;
    const y = ((d.y0 ?? 0) + (d.y1 ?? 0)) / 2;
    return { x, y };
  }

  function annotateNodeFlow(nodes, links) {
    const flow = new Map(nodes.map((n) => [n.id, 0]));
    for (const l of links) {
      const v = l.value ?? 0;
      flow.set(l.source, (flow.get(l.source) ?? 0) + v);
      flow.set(l.target, (flow.get(l.target) ?? 0) + v);
    }
    for (const n of nodes) n._flow = flow.get(n.id) ?? 0;
  }

  function layoutGraph(width, height, margin, tierCap) {
    const nodes = filteredData.nodes.map((n) => ({ ...n }));
    const links = filteredData.links.map((l) => ({
      source: l.source,
      target: l.target,
      value: Math.max(l.value ?? 0, 0.01),
    }));
    annotateNodeFlow(nodes, links);

    const innerHeight = height - margin.top - margin.bottom - 16;
    const nodePadding = Math.max(22, Math.min(42, innerHeight / Math.max(nodes.length, 1) - 2));

    const sankeyGen = sankey()
      .nodeId((d) => d.id)
      .nodeAlign(buildTierNodeAlign(nodes))
      .nodeWidth(20)
      .nodePadding(nodePadding)
      .iterations(96)
      .nodeSort((a, b) => (b._flow ?? 0) - (a._flow ?? 0) || String(a.name ?? '').localeCompare(b.name ?? ''))
      .linkSort((a, b) => b.value - a.value)
      .extent([
        [margin.left, margin.top + 12],
        [width - margin.right, height - margin.bottom],
      ]);

    return sankeyGen({ nodes, links });
  }

  /** Rank links by $ value for selective labeling. */
  function rankedLabelLinks(links) {
    const sorted = [...links].sort((a, b) => b.value - a.value);
    const rank = new Map(sorted.map((l, i) => [`${l.source.id}→${l.target.id}`, i]));
    return links.filter((l) => {
      const r = rank.get(`${l.source.id}→${l.target.id}`) ?? 999;
      return shouldShowLinkLabel(l.value, l.width ?? 0, r, LINK_LABEL_CAP);
    });
  }

  function updateTierLabels(width, margin, tierCap, graphNodes = []) {
    const labels = visibleTierLabels(tierLabels, tierCap);
    const labelData = labels.map((label, tier) => {
      const tierNodes = graphNodes.filter((n) => n.tier === tier);
      let x = tierColumnX(tier, tierCap, margin, width);
      if (tierNodes.length) {
        x = tierNodes.reduce((s, n) => s + (n.x0 + n.x1) / 2, 0) / tierNodes.length;
      }
      return { label, tier, x };
    });

    const sel = gLabels.selectAll('text.tier-label').data(labelData, (d) => d.tier);

    sel.exit()
      .transition(anim())
      .attr('opacity', 0)
      .remove();

    const enter = sel.enter()
      .append('text')
      .attr('class', 'tier-label')
      .attr('y', 28)
      .attr('text-anchor', 'middle')
      .attr('opacity', 0)
      .text((d) => d.label);

    enter.merge(sel)
      .transition(anim())
      .attr('x', (d) => d.x)
      .attr('opacity', 1)
      .text((d) => d.label);
  }

  function renderNodeBadge(selection, width, filingLookup) {
    selection.each(function (d) {
      const badge = select(this);
      badge.selectAll('*').remove();

      const meta = nodeLogoMeta(d, filingLookup);
      const size = logoSize(d);
      const { x, y, cy } = logoLayout(d, width, size);

      badge
        .transition(anim())
        .attr('transform', `translate(${x},${y})`);

      const addInitials = () => {
        badge
          .append('rect')
          .attr('class', 'logo-initials')
          .attr('width', size)
          .attr('height', size)
          .attr('rx', 4)
          .attr('fill', meta.bg)
          .attr('stroke', '#1a1a2e')
          .attr('stroke-width', 0.5);
        badge
          .append('text')
          .attr('class', 'logo-initials-text')
          .attr('x', size / 2)
          .attr('y', size / 2)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'central')
          .attr('fill', meta.color)
          .text(meta.initials);
      };

      if (meta.type === 'image' && meta.primary) {
        appendChartLogoImage(badge, meta, size, { onInitials: addInitials });
      } else {
        addInitials();
      }
    });
  }

  function nodeLabelText(d) {
    const geo = geoLabelForNode(d);
    return geo?.flag ? `${geo.flag} ${d.name}` : d.name;
  }

  function nodeMatchesCountry(d) {
    if (!highlightCountry) return true;
    return countryForNode(d) === highlightCountry;
  }

  function linkMatchesCountry(d) {
    if (!highlightCountry) return true;
    return countryForNode(d.source) === highlightCountry || countryForNode(d.target) === highlightCountry;
  }

  function nodeOpacity(d) {
    return nodeMatchesCountry(d) ? 1 : DIM_NODE_OPACITY;
  }

  function linkOpacity(d) {
    return linkMatchesCountry(d) ? FULL_LINK_OPACITY : DIM_LINK_OPACITY;
  }

  function updateCountryHighlight() {
    if (!gNodes || !gLinks) return;
    const t = transition().duration(220).ease(easeCubicInOut);

    gNodes.selectAll('g.node')
      .transition(t)
      .attr('opacity', nodeOpacity);

    gLinks.selectAll('path')
      .transition(t)
      .attr('fill-opacity', linkOpacity);

    if (gLinkLabels) {
      gLinkLabels.selectAll('g.link-label')
        .transition(t)
        .attr('opacity', (d) => (linkMatchesCountry(d) ? 1 : 0.12));
    }
  }

  function renderChart() {
    if (!container || !svgRoot || !filteredData?.nodes?.length) return;

    const width = container.clientWidth;
    const height = chartHeight;
    const margin = { top: 52, right: 220, bottom: 36, left: 220 };
    const tierCap = clampSankeyTier(maxTier);

    svgRoot
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    const graph = layoutGraph(width, height, margin, tierCap);
    updateTierLabels(width, margin, tierCap, graph.nodes);
    const t = anim();

    // Links
    const link = gLinks.selectAll('path').data(graph.links, (d) => `${d.source.id}→${d.target.id}`);

    link.exit()
      .transition(t)
      .attr('fill-opacity', 0)
      .remove();

    const linkEnter = link.enter()
      .append('path')
      .attr('class', 'sankey-link')
      .attr('fill', (d) => linkFillColor(d))
      .attr('fill-opacity', 0)
      .attr('stroke', 'none')
      .attr('d', sankeyLinkRibbon)
      .on('mouseenter', linkMouseenter)
      .on('mousemove', linkMousemove)
      .on('mouseleave', linkMouseleave);

    const linkMerge = linkEnter.merge(link);
    linkMerge
      .attr('fill', (d) => linkFillColor(d))
      .attr('d', sankeyLinkRibbon);
    linkMerge
      .transition(t)
      .attr('fill-opacity', linkOpacity);

    // Link $ labels — top flows only to reduce clutter
    const labelLinks = rankedLabelLinks(graph.links);
    const linkLabel = gLinkLabels.selectAll('g.link-label').data(labelLinks, (d) => `${d.source.id}→${d.target.id}`);

    linkLabel.exit().remove();

    const linkLabelEnter = linkLabel.enter()
      .append('g')
      .attr('class', 'link-label')
      .attr('pointer-events', 'none');

    linkLabelEnter.append('text').attr('class', 'link-value');

    linkLabelEnter.merge(linkLabel)
      .attr('opacity', (d) => (linkMatchesCountry(d) ? 1 : 0.12))
      .attr('transform', (d) => {
        const { x, y } = linkMidpoint(d);
        return `translate(${x},${y})`;
      })
      .select('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .text((d) => formatFlowUsd(d.value));

    // Nodes
    const node = gNodes.selectAll('g.node').data(graph.nodes, (d) => d.id);

    node.exit()
      .transition(t)
      .attr('opacity', 0)
      .remove();

    const nodeEnter = node.enter()
      .append('g')
      .attr('class', 'node')
      .attr('opacity', 0);

    nodeEnter.append('rect')
      .attr('stroke', '#1a1a2e')
      .attr('stroke-width', 0.5)
      .attr('rx', 2)
      .attr('width', 0)
      .attr('height', 0)
      .on('mouseenter', nodeMouseenter)
      .on('mousemove', nodeMousemove)
      .on('mouseleave', nodeMouseleave);

    nodeEnter.append('text')
      .attr('class', 'node-label')
      .attr('dy', (d) => (nodeHasRoomForValue(d) ? '-0.55em' : '0.35em'))
      .attr('opacity', 0);

    nodeEnter.append('text')
      .attr('class', 'node-value')
      .attr('dy', '0.95em')
      .attr('opacity', 0);

    nodeEnter.append('g')
      .attr('class', 'node-badge')
      .attr('opacity', 0);

    const nodeMerge = nodeEnter.merge(node);

    nodeMerge
      .transition(t)
      .attr('opacity', nodeOpacity);

    nodeMerge.select('rect')
      .attr('fill', (d) => nodeFillColor(d))
      .transition(t)
      .attr('x', (d) => d.x0)
      .attr('y', (d) => d.y0)
      .attr('width', (d) => Math.max(0, d.x1 - d.x0))
      .attr('height', (d) => Math.max(1, d.y1 - d.y0));

    nodeMerge.select('.node-badge')
      .transition(t)
      .attr('opacity', 1);

    renderNodeBadge(nodeMerge.select('.node-badge'), width, filingMap);

    nodeMerge.select('text.node-label')
      .transition(t)
      .attr('x', (d) => {
        const size = logoSize(d);
        const { textX } = logoLayout(d, width, size);
        return textX;
      })
      .attr('y', (d) => (d.y1 + d.y0) / 2)
      .attr('text-anchor', (d) => logoLayout(d, width, logoSize(d)).textAnchor)
      .attr('opacity', 1)
      .text((d) => nodeLabelText(d));

    nodeMerge.select('text.node-value')
      .transition(t)
      .attr('x', (d) => {
        const size = logoSize(d);
        const { textX } = logoLayout(d, width, size);
        return textX;
      })
      .attr('y', (d) => (d.y1 + d.y0) / 2)
      .attr('text-anchor', (d) => logoLayout(d, width, logoSize(d)).textAnchor)
      .attr('opacity', (d) => (nodeHasRoomForValue(d) && nodeFlowLabel(d) ? 1 : 0))
      .text((d) => nodeFlowLabel(d));

    firstDraw = false;
  }

  function linkMouseenter(event, d) {
    select(event.currentTarget).attr('fill-opacity', HOVER_LINK_OPACITY);
    const { x, y } = pointerViewport(event);
    tooltip = {
      show: true,
      x,
      y,
      html: `<strong>${d.source.name}</strong> → <strong>${d.target.name}</strong><br/>$${d.value.toFixed(1)} / chip`,
    };
  }

  function linkMousemove(event) {
    const { x, y } = pointerViewport(event);
    tooltip = { ...tooltip, x, y };
  }

  function linkMouseleave(event, d) {
    select(event.currentTarget).attr('fill-opacity', linkOpacity(d));
    tooltip = { ...tooltip, show: false };
  }

  function nodeMouseenter(event, d) {
    const inVal = d.targetLinks?.reduce((s, l) => s + l.value, 0) ?? 0;
    const outVal = d.sourceLinks?.reduce((s, l) => s + l.value, 0) ?? 0;
    const geo = geoLabelForNode(d);
    const geoLine = geo ? `<br/>${geo.flag} ${geo.name}` : '';
    const { x, y } = pointerViewport(event);
    tooltip = {
      show: true,
      x,
      y,
      html: `<strong>${d.name}</strong>${geoLine}${d.description ? `<br/><em>${d.description}</em>` : ''}<br/>In: $${inVal.toFixed(1)} · Out: $${outVal.toFixed(1)}`,
    };
  }

  function nodeMousemove(event) {
    const { x, y } = pointerViewport(event);
    tooltip = { ...tooltip, x, y };
  }

  function nodeMouseleave() {
    tooltip = { ...tooltip, show: false };
  }

  function refreshLogosOnly() {
    if (!gNodes || !container) return;
    const width = container.clientWidth || container.getBoundingClientRect().width;
    gNodes.selectAll('g.node-badge').call((sel) => renderNodeBadge(sel, width, filingMap));
  }

  function initSvg() {
    if (!container) return;
    select(container).selectAll('*').remove();

    svgRoot = select(container)
      .append('svg')
      .attr('class', 'sankey-svg');

    gLabels = svgRoot.append('g').attr('class', 'tier-labels');
    gLinks = svgRoot.append('g').attr('class', 'links');
    gNodes = svgRoot.append('g').attr('class', 'nodes');
    gLinkLabels = svgRoot.append('g').attr('class', 'link-labels');
  }

  onMount(() => {
    initSvg();
    renderChart();
    const debouncedRender = debounce(() => {
      firstDraw = false;
      renderChart();
    }, 150);
    const ro = new ResizeObserver(debouncedRender);
    ro.observe(container);
    const unsubTheme = subscribeTheme(() => {
      resolvedTheme = getResolvedTheme();
    });
    return () => {
      ro.disconnect();
      unsubTheme();
    };
  });

  $effect(() => {
    maxTier;
    filteredData;
    chartHeight;
    filingMap;
    if (container && svgRoot) untrack(() => renderChart());
  });

  $effect(() => {
    resolvedTheme;
    if (container && svgRoot && gNodes) untrack(() => refreshLogosOnly());
  });

  $effect(() => {
    highlightCountry;
    if (container && svgRoot && gNodes && gLinks) untrack(() => updateCountryHighlight());
  });
</script>

<div
  class="sankey-wrap"
  class:filter-active={!!highlightCountry}
  style:min-height="{chartHeight}px"
  bind:this={container}
  role="img"
  aria-label="Supply chain Sankey diagram"
></div>

<ChartTooltip show={tooltip.show} x={tooltip.x} y={tooltip.y} html={tooltip.html} />

<style>
  .sankey-wrap {
    width: 100%;
    min-height: 920px;
    position: relative;
    padding: var(--space-4) 0 var(--space-3);
    margin: 0;
  }

  .sankey-wrap :global(svg) {
    display: block;
    font-family: 'IBM Plex Sans', system-ui, sans-serif;
    overflow: visible;
  }

  .sankey-wrap :global(.tier-label) {
    fill: var(--tier-label, #8892a4);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .sankey-wrap :global(.node-label) {
    fill: var(--node-label, #e8eaed);
    font-size: 13px;
    font-weight: 500;
    pointer-events: none;
  }

  .sankey-wrap :global(.node-value) {
    fill: var(--accent);
    font-size: 11px;
    font-weight: 600;
    pointer-events: none;
    font-variant-numeric: tabular-nums;
  }

  .sankey-wrap :global(.link-label text) {
    fill: var(--text);
    font-size: 10px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    paint-order: stroke fill;
    stroke: var(--bg);
    stroke-width: 4px;
    stroke-linejoin: round;
  }

  .sankey-wrap :global(path.sankey-link) {
    transition: fill-opacity 0.15s;
    pointer-events: all;
  }

  .sankey-wrap :global(.logo-initials-text) {
    font-size: 8px;
    font-weight: 700;
    pointer-events: none;
    font-family: 'IBM Plex Sans', system-ui, sans-serif;
  }

  .sankey-wrap :global(.node-badge) {
    pointer-events: none;
  }

  .sankey-wrap:not(.filter-active) :global(path.sankey-link:hover) {
    stroke-opacity: 0.55;
  }
</style>
