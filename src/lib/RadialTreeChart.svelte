<script>
  import { onMount } from 'svelte';
  import { untrack } from 'svelte';
  import { hierarchy, tree } from 'd3-hierarchy';
  import { linkRadial } from 'd3-shape';
  import { select } from 'd3-selection';
  import { scaleSqrt } from 'd3-scale';
  import { transition } from 'd3-transition';
  import { easeCubicInOut } from 'd3-ease';
  import { clampSankeyTier } from './sankey-data.js';
  import { getTreeGraph } from './tree-data.js';
  import { geoLabelForNode, countryForNode } from './vendor-geography.js';
  import { formatFlowUsd } from './flow-format.js';
  import { nodeFillColor } from './vendor-colors.js';
  import ChartTooltip from './ChartTooltip.svelte';
  import { pointerViewport } from './chart-tooltip.js';

  /** @type {{ data: object, maxTier?: number, highlightCountry?: string | null }} */
  let { data, maxTier = 5, highlightCountry = null } = $props();

  let container;
  let svgRoot;
  let gMain;
  let resizeObserver;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let sizeRetryTimer = null;
  let tooltip = $state({ show: false, x: 0, y: 0, html: '' });

  const DIM_OPACITY = 0.12;

  const treeGraph = $derived(getTreeGraph(data, clampSankeyTier(maxTier)));
  const supplyTree = $derived(treeGraph?.tree ?? null);
  const graphLinks = $derived(treeGraph?.links ?? []);

  const nodeRadius = scaleSqrt().domain([1, 120]).range([3.5, 9]).clamp(true);

  /** @type {import('d3-hierarchy').HierarchyPointNode<object> | null} */
  let layoutRoot = null;
  let hoveredId = null;

  const radialLink = linkRadial()
    .angle((d) => d.x)
    .radius((d) => d.y);

  /** Minimum inset between outermost tree ring and SVG edge before viewBox auto-fit. */
  const TREE_INSET = 72;
  /** Extra padding around measured label bounds in the viewBox. */
  const VIEWBOX_PAD = 28;

  const anim = () => transition().duration(500).ease(easeCubicInOut);

  function nodeMatchesCountry(d) {
    if (!highlightCountry) return true;
    return countryForNode(d.data) === highlightCountry;
  }

  function nodeOpacity(d) {
    return nodeMatchesCountry(d) ? 1 : DIM_OPACITY;
  }

  function linkOpacity(d) {
    if (!highlightCountry) return 0.45;
    const src = d.source.data;
    const tgt = d.target.data;
    return countryForNode(src) === highlightCountry || countryForNode(tgt) === highlightCountry
      ? 0.55
      : DIM_OPACITY;
  }

  function fillForNode(d) {
    if (d.depth === 0) return nodeFillColor({ id: d.data.id, group: d.data.group ?? 'product' });
    return nodeFillColor({ id: d.data.id, group: d.data.group });
  }

  function layoutRadial(width, height, radius) {
    if (!supplyTree) return null;

    const root = hierarchy(supplyTree)
      .sum((d) => d.value ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    tree()
      .size([2 * Math.PI, radius])
      .separation((a, b) => (a.parent === b.parent ? 1.35 : 1.85) / Math.max(a.depth, 1))(root);

    layoutRoot = root;
    return { root, cx: width / 2, cy: height / 2 };
  }

  function polarXY(d, cx, cy) {
    return {
      x: cx + Math.cos(d.x - Math.PI / 2) * d.y,
      y: cy + Math.sin(d.x - Math.PI / 2) * d.y,
    };
  }

  function labelRotate(d) {
    const deg = (d.x * 180) / Math.PI - 90;
    return d.x >= Math.PI ? deg + 180 : deg;
  }

  function labelAnchor(d) {
    return d.x >= Math.PI ? 'end' : 'start';
  }

  /** @param {{ nameSize: number, valueSize: number, lineHeight: number }} spec */
  function labelLineY(spec) {
    const nameY = (-spec.lineHeight / 2) * spec.nameSize;
    const valueY = nameY + spec.lineHeight * spec.valueSize;
    return { nameY, valueY };
  }

  /** @param {import('d3-hierarchy').HierarchyPointNode<object>} d */
  function labelSpec(d) {
    const dotR = d.depth === 0 ? 10 : nodeRadius(d.data.value);
    const offset = dotR + 7;
    const nameSize =
      d.depth === 0 ? 11.5 : d.depth === 1 ? 10.5 : d.depth === 2 ? 9.5 : d.depth === 3 ? 8.5 : 8;
    const valueSize = Math.max(7, nameSize - 1);
    return {
      name: d.data.name ?? '',
      value: formatFlowUsd(d.data.value),
      nameSize,
      valueSize,
      offset,
      lineHeight: 1.05,
    };
  }

  /** Expand viewBox so full labels are never clipped (bbox is in gMain local space). */
  function fitViewBoxToContent(width, height, cx, cy) {
    const mainNode = gMain?.node();
    if (!mainNode || !svgRoot) return;

    let bb;
    try {
      bb = mainNode.getBBox();
    } catch {
      return;
    }
    if (!(bb.width > 0 && bb.height > 0)) return;
    if (![bb.x, bb.y, bb.width, bb.height].every(Number.isFinite)) return;

    const pad = VIEWBOX_PAD;
    const x0 = Math.min(0, cx + bb.x - pad);
    const y0 = Math.min(0, cy + bb.y - pad);
    const x1 = Math.max(width, cx + bb.x + bb.width + pad);
    const y1 = Math.max(height, cy + bb.y + bb.height + pad);
    const vbW = x1 - x0;
    const vbH = y1 - y0;
    if (!(vbW > 0 && vbH > 0)) return;

    svgRoot.attr('viewBox', `${x0} ${y0} ${vbW} ${vbH}`);
  }

  function labelOpacity(d) {
    if (hoveredId) {
      return highlightSet(hoveredId).has(d.data.id) ? 1 : DIM_OPACITY;
    }
    return nodeOpacity(d);
  }

  /** @param {string} nodeId */
  function flowsForNode(nodeId) {
    const flows = [];
    for (const link of graphLinks) {
      if (link.source === nodeId) flows.push({ ...link, dir: 'out' });
      if (link.target === nodeId) flows.push({ ...link, dir: 'in' });
    }
    return flows;
  }

  function highlightSet(nodeId) {
    if (!layoutRoot) return new Set([nodeId]);
    const ids = new Set([nodeId]);
    let n = layoutRoot.descendants().find((d) => d.data.id === nodeId);
    if (!n) return ids;
    n.ancestors().forEach((a) => ids.add(a.data.id));
    n.descendants().forEach((d) => ids.add(d.data.id));
    return ids;
  }

  function applyHoverHighlight(nodeId) {
    if (!gMain) return;
    hoveredId = nodeId;
    const active = highlightSet(nodeId);

    gMain.selectAll('path.tree-link').attr('stroke-opacity', (d) => {
      const onPath =
        active.has(d.source.data.id) && active.has(d.target.data.id);
      return onPath ? 0.65 : DIM_OPACITY;
    });

    gMain.selectAll('g.tree-node').attr('opacity', (d) => {
      return active.has(d.data.id) ? 1 : DIM_OPACITY;
    });

    gMain.selectAll('g.tree-node > g.tree-label').attr('opacity', (d) =>
      active.has(d.data.id) ? 1 : DIM_OPACITY,
    );
  }

  function clearHoverHighlight() {
    hoveredId = null;
    if (!gMain) return;
    const t = transition().duration(180).ease(easeCubicInOut);
    gMain.selectAll('path.tree-link').transition(t).attr('stroke-opacity', linkOpacity);
    gMain.selectAll('g.tree-node').transition(t).attr('opacity', nodeOpacity);
    gMain.selectAll('g.tree-node > g.tree-label').transition(t).attr('opacity', labelOpacity);
  }

  function buildTooltipHtml(d) {
    const geo = geoLabelForNode(d.data);
    const geoLine = geo ? `<br/>${geo.flag} ${geo.name}` : '';
    const flows = flowsForNode(d.data.id);
    const nameById = new Map();
    if (layoutRoot) {
      for (const n of layoutRoot.descendants()) nameById.set(n.data.id, n.data.name);
    }

    const incoming = flows.filter((f) => f.dir === 'in').sort((a, b) => b.value - a.value);
    const outgoing = flows.filter((f) => f.dir === 'out').sort((a, b) => b.value - a.value);

    let flowHtml = '';
    if (incoming.length) {
      flowHtml += '<br/><span class="flow-hint">↓ In</span>';
      for (const f of incoming.slice(0, 8)) {
        flowHtml += `<br/>${nameById.get(f.source) ?? f.source}: <strong>${formatFlowUsd(f.value)}</strong>`;
      }
      if (incoming.length > 8) flowHtml += `<br/><em>+${incoming.length - 8} more</em>`;
    }
    if (outgoing.length) {
      flowHtml += '<br/><span class="flow-hint">↑ Out</span>';
      for (const f of outgoing.slice(0, 8)) {
        flowHtml += `<br/>→ ${nameById.get(f.target) ?? f.target}: <strong>${formatFlowUsd(f.value)}</strong>`;
      }
      if (outgoing.length > 8) flowHtml += `<br/><em>+${outgoing.length - 8} more</em>`;
    }

    const tierLine = d.data.tier != null ? `<br/>Tier ${d.data.tier}` : '';
    return `<strong>${d.data.name}</strong>${tierLine}${geoLine}${d.data.description ? `<br/><em>${d.data.description}</em>` : ''}<br/>${formatFlowUsd(d.data.value)} / chip${flowHtml}`;
  }

  function renderChart() {
    if (!container || !svgRoot || !gMain || !supplyTree) return;

    const width = container.clientWidth;
    if (width < 32) return;

    const height = Math.max(560, width * 0.92);
    const radius = Math.max(40, Math.min(width, height) / 2 - TREE_INSET);
    const laid = layoutRadial(width, height, radius);
    if (!laid) return;

    const { root, cx, cy } = laid;
    const nodes = root.descendants();
    const links = root.links();
    const t = anim();

    svgRoot
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    gMain.attr('transform', `translate(${cx},${cy})`);

    const linkSel = gMain.selectAll('path.tree-link').data(links, (d) => `${d.source.data.id}→${d.target.data.id}`);

    linkSel.exit().transition(t).attr('opacity', 0).remove();

    const linkEnter = linkSel.enter().append('path').attr('class', 'tree-link').attr('fill', 'none').attr('opacity', 0);

    linkEnter
      .merge(linkSel)
      .attr('d', radialLink)
      .attr('stroke', 'var(--text-subtle)')
      .attr('stroke-width', (d) => Math.max(0.8, nodeRadius(d.target.data.value) * 0.2))
      .attr('stroke-opacity', hoveredId ? undefined : linkOpacity)
      .transition(t)
      .attr('opacity', 1);

    const nodeSel = gMain.selectAll('g.tree-node').data(nodes, (d) => d.data.id);

    nodeSel.exit().transition(t).attr('opacity', 0).remove();

    const nodeEnter = nodeSel.enter().append('g').attr('class', 'tree-node').attr('opacity', 0);

    nodeEnter.append('circle').attr('class', 'tree-dot');
    nodeEnter.append('g').attr('class', 'tree-label');

    const nodeMerge = nodeEnter.merge(nodeSel);

    nodeMerge
      .transition(t)
      .attr('opacity', (d) =>
        hoveredId ? (highlightSet(hoveredId).has(d.data.id) ? 1 : DIM_OPACITY) : nodeOpacity(d),
      );

    nodeMerge
      .attr('transform', (d) => {
        const { x, y } = polarXY(d, 0, 0);
        return `translate(${x},${y})`;
      })
      .style('cursor', 'pointer')
      .on('mouseenter', nodeMouseenter)
      .on('mousemove', nodeMousemove)
      .on('mouseleave', nodeMouseleave);

    nodeMerge.select('circle')
      .attr('r', (d) => (d.depth === 0 ? 10 : nodeRadius(d.data.value)))
      .attr('fill', fillForNode)
      .attr('stroke', 'var(--bg)')
      .attr('stroke-width', 1.5)
      .attr('fill-opacity', (d) => (d.depth === 0 ? 0.95 : 0.88));

    nodeMerge.each(function (d) {
      const spec = labelSpec(d);
      const flip = d.x >= Math.PI;
      const { nameY, valueY } = labelLineY(spec);
      const labelG = select(this).select('g.tree-label');

      labelG
        .attr('transform', `rotate(${labelRotate(d)}) translate(${flip ? -spec.offset : spec.offset},0)`)
        .attr('opacity', labelOpacity(d));

      const lines = [
        {
          key: 'name',
          text: spec.name,
          size: spec.nameSize,
          weight: 600,
          fill: 'var(--text)',
          y: nameY,
          className: 'tree-label-name',
        },
        {
          key: 'value',
          text: spec.value,
          size: spec.valueSize,
          weight: 600,
          fill: 'var(--accent)',
          y: valueY,
          className: 'tree-label-value',
        },
      ];

      const texts = labelG.selectAll('text').data(lines, (line) => line.key);
      texts.exit().remove();

      const textEnter = texts
        .enter()
        .append('text')
        .attr('class', (line) => line.className);

      texts
        .merge(textEnter)
        .attr('x', 0)
        .attr('y', (line) => line.y)
        .attr('text-anchor', labelAnchor(d))
        .attr('dominant-baseline', 'central')
        .attr('font-size', (line) => `${line.size}px`)
        .attr('font-weight', (line) => line.weight)
        .attr('fill', (line) => line.fill)
        .text((line) => line.text);
    });

    if (hoveredId) applyHoverHighlight(hoveredId);
    fitViewBoxToContent(width, height, cx, cy);
  }

  function scheduleRender() {
    if (sizeRetryTimer) clearTimeout(sizeRetryTimer);
    sizeRetryTimer = setTimeout(() => {
      sizeRetryTimer = null;
      renderChart();
    }, 0);
  }

  function nodeMouseenter(event, d) {
    select(event.currentTarget).select('circle').attr('fill-opacity', 1);
    applyHoverHighlight(d.data.id);
    const { x, y } = pointerViewport(event);
    tooltip = { show: true, x, y, html: buildTooltipHtml(d) };
  }

  function nodeMousemove(event) {
    const { x, y } = pointerViewport(event);
    tooltip = { ...tooltip, x, y };
  }

  function nodeMouseleave(event, d) {
    select(event.currentTarget).select('circle').attr('fill-opacity', d.depth === 0 ? 0.95 : 0.88);
    clearHoverHighlight();
    tooltip = { ...tooltip, show: false };
  }

  function updateHighlight() {
    if (!gMain || hoveredId) return;
    const t = transition().duration(220).ease(easeCubicInOut);
    gMain.selectAll('g.tree-node').transition(t).attr('opacity', nodeOpacity);
    gMain.selectAll('path.tree-link').transition(t).attr('stroke-opacity', linkOpacity);
    gMain.selectAll('g.tree-node > g.tree-label').transition(t).attr('opacity', labelOpacity);
  }

  function initSvg() {
    if (!container) return;
    select(container).selectAll('*').remove();
    svgRoot = select(container).append('svg').attr('class', 'radial-tree-svg');
    gMain = svgRoot.append('g').attr('class', 'radial-tree-main');
  }

  onMount(() => {
    initSvg();
    scheduleRender();
    resizeObserver = new ResizeObserver(() => {
      hoveredId = null;
      scheduleRender();
    });
    resizeObserver.observe(container);
    return () => {
      resizeObserver?.disconnect();
      if (sizeRetryTimer) clearTimeout(sizeRetryTimer);
    };
  });

  $effect(() => {
    supplyTree;
    graphLinks;
    maxTier;
    if (container && svgRoot && gMain) untrack(() => scheduleRender());
  });

  $effect(() => {
    highlightCountry;
    if (container && svgRoot && gMain) untrack(() => updateHighlight());
  });
</script>

<div class="radial-tree-wrap" class:filter-active={!!highlightCountry}>
  <div
    class="radial-tree-canvas"
    bind:this={container}
    role="img"
    aria-label="Supply chain radial tree from product center outward"
  ></div>
  <p class="radial-tree-hint">Product at center; branches follow primary supplier → customer links. Hover for full in/out $ flows.</p>
</div>

<ChartTooltip show={tooltip.show} x={tooltip.x} y={tooltip.y} html={tooltip.html} />

<style>
  .radial-tree-wrap {
    width: 100%;
    min-height: 560px;
    padding: var(--space-2) 0;
    overflow: visible;
  }

  .radial-tree-canvas {
    width: 100%;
    min-height: 560px;
    overflow: visible;
  }

  .radial-tree-wrap :global(svg) {
    display: block;
    margin: 0 auto;
    overflow: visible;
    font-family: 'IBM Plex Sans', system-ui, sans-serif;
  }

  .radial-tree-wrap :global(path.tree-link) {
    pointer-events: none;
  }

  .radial-tree-wrap :global(g.tree-label text) {
    paint-order: stroke fill;
    stroke: var(--bg);
    stroke-width: 3px;
    stroke-linejoin: round;
    pointer-events: none;
    font-variant-numeric: tabular-nums;
  }

  .radial-tree-wrap :global(g.tree-label text.tree-label-value) {
    stroke-width: 2.5px;
  }

  .radial-tree-wrap :global(circle.tree-dot) {
    transition: fill-opacity 0.15s;
  }

  .radial-tree-hint {
    margin: var(--space-2) 0 0;
    text-align: center;
    font-size: 11px;
    color: var(--text-subtle);
  }
</style>
