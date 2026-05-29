<script>
  import { onMount } from 'svelte';
  import { untrack } from 'svelte';
  import { hierarchy, pack } from 'd3-hierarchy';
  import { select } from 'd3-selection';
  import { scaleSqrt } from 'd3-scale';
  import { transition } from 'd3-transition';
  import { easeCubicInOut } from 'd3-ease';
  import { clampSankeyTier } from './sankey-data.js';
  import { getPackGraph } from './pack-data.js';
  import { geoLabelForNode, countryForNode } from './vendor-geography.js';
  import { formatFlowUsd, abbrevVendor } from './flow-format.js';
  import {
    filingMapFromList,
    nodeLogoMeta,
    packContentLayout,
    packLogoSize,
    appendChartLogoImage,
  } from './sankey-logos.js';
  import { nodeFillColor, linkFillColor, brandForNode } from './vendor-colors.js';
  import ChartTooltip from './ChartTooltip.svelte';
  import { pointerViewport } from './chart-tooltip.js';
  import { getResolvedTheme, subscribeTheme } from './theme.js';

  /** @type {{ data: object, maxTier?: number, secFilings?: object[], highlightCountry?: string | null }} */
  let { data, maxTier = 5, secFilings = [], highlightCountry = null } = $props();

  let container;
  let svgRoot;
  let gCircles;
  let gFlow;
  let gLabels;
  let tooltip = $state({ show: false, x: 0, y: 0, html: '' });

  const DIM_OPACITY = 0.1;
  const TIER_DIM = 0.28;

  const packGraph = $derived(getPackGraph(data, clampSankeyTier(maxTier)));
  const packTree = $derived(packGraph?.tree ?? null);
  const graphLinks = $derived(packGraph?.links ?? []);
  const filingMap = $derived(filingMapFromList(secFilings));

  const flowWidth = scaleSqrt().domain([1, 120]).range([1.5, 5]).clamp(true);

  /** @type {Map<string, { x: number, y: number, r: number, data: object }>} */
  let layoutById = new Map();
  let hoveredId = null;
  let resolvedTheme = $state(getResolvedTheme());

  const anim = () => transition().duration(500).ease(easeCubicInOut);

  function nodeMatchesCountry(d) {
    if (!highlightCountry || d.data.isTierGroup || d.data.isRoot) return true;
    return countryForNode(d.data) === highlightCountry;
  }

  function nodeOpacity(d) {
    return nodeMatchesCountry(d) ? 1 : DIM_OPACITY;
  }

  function fillForNode(d) {
    if (d.data.isTierGroup) return 'none';
    if (d.data.isRoot) return nodeFillColor({ id: d.data.id, group: d.data.group ?? 'product' });
    return nodeFillColor({ id: d.data.name ?? d.data.id, group: d.data.group });
  }

  function strokeForNode(d) {
    if (d.data.isTierGroup) return 'var(--text-subtle)';
    const brand = brandForNode({ id: d.data.name ?? d.data.id });
    if (brand?.color) return brand.color;
    return 'var(--bg)';
  }

  function isFlowNode(d) {
    return d.data.id && !d.data.isTierGroup;
  }

  function layoutPack(width, height) {
    const tree = packTree;
    if (!tree) return null;

    const root = hierarchy(tree)
      .sum((d) => (d.children ? 0 : d.value ?? 0))
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    const size = Math.min(width, height);
    pack()
      .size([size, size])
      .padding((d) => (d.data.isTierGroup ? 8 : d.depth === 1 ? 5 : 2))(root);

    const offsetX = (width - size) / 2;
    const offsetY = (height - size) / 2;
    for (const node of root.descendants()) {
      node.x += offsetX;
      node.y += offsetY;
    }

    layoutById = new Map();
    for (const node of root.descendants()) {
      if (node.data.id) layoutById.set(node.data.id, node);
    }
    return root;
  }

  /** @param {string} name @param {number} maxWidth @param {number} startSize */
  function fitName(name, maxWidth, startSize) {
    let fontSize = startSize;
    let text = name;
    const charW = 0.52;
    while (text.length > 2 && text.length * fontSize * charW > maxWidth && fontSize > 7.5) {
      fontSize -= 0.5;
    }
    if (text.length * fontSize * charW > maxWidth) {
      const maxChars = Math.max(4, Math.floor(maxWidth / (fontSize * charW)));
      text = abbrevVendor(name, maxChars);
    }
    return { text, fontSize };
  }

  /** @param {import('d3-hierarchy').HierarchyCircularNode} d */
  function labelSpec(d) {
    if (d.data.isTierGroup) {
      if (d.r < 30) return null;
      const sub = (d.data.name ?? '').replace(/^Tier \d+ — /, '');
      const lines = [{ text: `Tier ${d.data.tier}`, fontSize: Math.min(12, d.r / 5), weight: 700 }];
      if (d.r >= 48 && sub) {
        lines.push({ text: sub, fontSize: Math.min(9.5, d.r / 7), weight: 500, muted: true });
      }
      return { lines, fill: 'var(--text)', stroke: 'none', y: d.y - d.r + 16 };
    }
    if (d.data.isRoot) {
      if (d.r < 52) return null;
      const { text, fontSize } = fitName(d.data.name, d.r * 1.2, Math.min(12, d.r / 5));
      return {
        lines: [{ text, fontSize, weight: 600 }],
        fill: 'var(--text)',
        stroke: 'var(--bg)',
        y: d.y + d.r * 0.42,
      };
    }
    if (d.r < 26) return null;
    const maxW = d.r * 1.5;
    const { text, fontSize } = fitName(d.data.name, maxW, Math.min(10, d.r / 3.5));
    return {
      lines: [{ text, fontSize, weight: 600 }],
      fill: '#fff',
      stroke: 'rgba(15, 17, 26, 0.75)',
      y: d.y + d.r * 0.38,
      clip: true,
    };
  }

  function showPackContent(d) {
    return !d.data.isTierGroup && d.r >= 10;
  }

  function contentOpacity(d) {
    if (hoveredId) {
      return relatedIds(hoveredId).has(d.data.id) ? 1 : DIM_OPACITY;
    }
    return nodeMatchesCountry(d) ? 1 : DIM_OPACITY;
  }

  function renderPackBadge(badge, d, filingLookup, size, logoCy) {
    badge.selectAll('*').remove();
    if (size <= 0) return;

    const meta = nodeLogoMeta(d.data, filingLookup);
    badge.attr('transform', `translate(${-size / 2},${logoCy - size / 2})`);

    const addInitials = () => {
      badge
        .append('rect')
        .attr('class', 'pack-logo-initials')
        .attr('width', size)
        .attr('height', size)
        .attr('rx', Math.min(4, size / 5))
        .attr('fill', meta.bg)
        .attr('stroke', 'var(--bg)')
        .attr('stroke-width', 0.75);
      badge
        .append('text')
        .attr('class', 'pack-logo-initials-text')
        .attr('x', size / 2)
        .attr('y', size / 2)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('fill', meta.color)
        .attr('font-size', Math.max(7, size * 0.38))
        .text(meta.initials);
    };

    if (meta.type === 'image' && meta.primary) {
      appendChartLogoImage(badge, meta, size, {
        imageClass: 'pack-logo-img',
        rx: Math.min(4, size / 5),
        onInitials: addInitials,
      });
    } else {
      addInitials();
    }
  }

  function renderPackContent(nodeSel, filingLookup) {
    nodeSel.each(function (d) {
      const g = select(this);
      let content = g.select('g.pack-content');
      if (!showPackContent(d)) {
        content.remove();
        return;
      }
      if (content.empty()) {
        content = g.append('g').attr('class', 'pack-content').attr('pointer-events', 'none');
        content.append('g').attr('class', 'pack-badge');
        content.append('text').attr('class', 'pack-value');
      }

      const logoSz = packLogoSize(d);
      const layout = packContentLayout(d, logoSz);
      const clipId = `pack-clip-${String(d.data.id).replace(/[^a-zA-Z0-9_-]/g, '_')}`;

      let clip = svgRoot.select(`#${clipId}`);
      if (clip.empty()) {
        clip = svgRoot.select('defs').append('clipPath').attr('id', clipId);
        clip.append('circle');
      }
      clip.select('circle').attr('cx', d.x).attr('cy', d.y).attr('r', Math.max(0, d.r - 1.5));

      content
        .attr('opacity', contentOpacity(d))
        .attr('clip-path', `url(#${clipId})`);

      renderPackBadge(content.select('g.pack-badge'), d, filingLookup, logoSz, layout.logoCy);

      content
        .select('text.pack-value')
        .attr('x', 0)
        .attr('y', layout.valueCy)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('font-size', `${layout.valueSize}px`)
        .attr('font-weight', 700)
        .attr('fill', '#fff')
        .attr('stroke', 'rgba(15, 17, 26, 0.8)')
        .attr('stroke-width', 2.5)
        .attr('paint-order', 'stroke fill')
        .attr('opacity', layout.showValue ? 1 : 0)
        .text(formatFlowUsd(d.data.value));
    });
  }

  function circleEdge(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist;
    const uy = dy / dist;
    return { x: from.x + ux * from.r, y: from.y + uy * from.r };
  }

  function flowMidpoint(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
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

  /** @param {string} nodeId */
  function relatedIds(nodeId) {
    const ids = new Set([nodeId]);
    for (const f of flowsForNode(nodeId)) {
      ids.add(f.source);
      ids.add(f.target);
    }
    return ids;
  }

  function clearFlowHighlight() {
    hoveredId = null;
    if (!gCircles || !gFlow || !gLabels) return;
    const t = transition().duration(180).ease(easeCubicInOut);
    gFlow.selectAll('*').transition(t).attr('opacity', 0).remove();
    gCircles.selectAll('g.pack-node').transition(t).attr('opacity', nodeOpacity);
    gCircles.selectAll('g.pack-content').transition(t).attr('opacity', contentOpacity);
    gLabels.selectAll('g.pack-label').transition(t).attr('opacity', labelOpacity);
  }

  function labelOpacity(d) {
    const spec = labelSpec(d);
    if (!spec) return 0;
    if (hoveredId) {
      if (d.data.isTierGroup) return TIER_DIM;
      return relatedIds(hoveredId).has(d.data.id) ? 1 : DIM_OPACITY;
    }
    return nodeMatchesCountry(d) ? 1 : DIM_OPACITY;
  }

  function flowStrokeColor(d) {
    return linkFillColor({ source: { id: d.link.source } });
  }

  /** @param {import('d3-hierarchy').HierarchyCircularNode} hovered */
  function applyFlowHighlight(hovered) {
    if (!gFlow || !gCircles || !gLabels) return;
    const nodeId = hovered.data.id;
    hoveredId = nodeId;
    const related = relatedIds(nodeId);
    const flows = flowsForNode(nodeId);

    gCircles.selectAll('g.pack-node').attr('opacity', (d) => {
      if (d.data.isTierGroup) return TIER_DIM;
      if (d.data.isRoot) return related.has(d.data.id) ? 1 : DIM_OPACITY;
      return related.has(d.data.id) ? 1 : DIM_OPACITY;
    });

    gLabels.selectAll('g.pack-label').attr('opacity', labelOpacity);
    gCircles.selectAll('g.pack-content').attr('opacity', contentOpacity);

    const flowItems = flows
      .map((link) => {
        const from = layoutById.get(link.source);
        const to = layoutById.get(link.target);
        if (!from || !to) return null;
        const start = circleEdge(from, to);
        const end = circleEdge(to, from);
        const mid = flowMidpoint(start, end);
        return { link, from, to, start, end, mid, dir: link.dir };
      })
      .filter(Boolean);

    const t = transition().duration(200).ease(easeCubicInOut);
    const sel = gFlow.selectAll('g.flow-edge').data(flowItems, (d) => `${d.dir}:${d.link.source}→${d.link.target}`);

    sel.exit().transition(t).attr('opacity', 0).remove();

    const enter = sel.enter().append('g').attr('class', 'flow-edge').attr('opacity', 0);

    enter.append('line').attr('class', 'flow-line');
    enter.append('text').attr('class', 'flow-amount');

    const merge = enter.merge(sel);

    merge.transition(t).attr('opacity', 1);

    merge.select('line')
      .attr('x1', (d) => d.start.x)
      .attr('y1', (d) => d.start.y)
      .attr('x2', (d) => d.end.x)
      .attr('y2', (d) => d.end.y)
      .attr('stroke', flowStrokeColor)
      .attr('stroke-width', (d) => flowWidth(d.link.value))
      .attr('marker-end', (d) => (d.dir === 'in' ? 'url(#pack-arrow-in)' : 'url(#pack-arrow-out)'));

    merge.select('text')
      .attr('x', (d) => d.mid.x)
      .attr('y', (d) => d.mid.y)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .text((d) => formatFlowUsd(d.link.value));
  }

  function renderLabels(nodes) {
    const labelNodes = nodes.filter((d) => labelSpec(d));
    const labels = gLabels.selectAll('g.pack-label').data(labelNodes, (d) => d.data.id ?? d.data.name);

    labels.exit().remove();

    const enter = labels.enter().append('g').attr('class', 'pack-label').attr('pointer-events', 'none');

    enter.append('text').attr('class', 'pack-label-text');

    const merge = enter.merge(labels);

    merge.attr('opacity', labelOpacity);

    merge.each(function (d) {
      const spec = labelSpec(d);
      if (!spec) return;
      const g = select(this);
      const lineH = 1.15;
      const texts = g.select('text.pack-label-text');
      const tspans = texts.selectAll('tspan').data(spec.lines, (_, i) => i);

      tspans.exit().remove();

      const tEnter = tspans.enter().append('tspan');

      tspans.merge(tEnter)
        .attr('x', d.x)
        .attr('dy', (_, i) => (i === 0 ? `${-(spec.lines.length - 1) * lineH / 2}em` : `${lineH}em`))
        .attr('font-size', (line) => `${line.fontSize}px`)
        .attr('font-weight', (line) => line.weight ?? 500)
        .attr('fill', (line) => {
          if (!line.muted) return spec.fill;
          return d.data.isTierGroup ? 'var(--text-muted)' : 'rgba(255, 255, 255, 0.9)';
        })
        .attr('opacity', (line) => (line.muted ? 0.9 : 1))
        .text((line) => line.text);

      texts
        .attr('x', d.x)
        .attr('y', spec.y ?? d.y)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('fill', spec.fill)
        .attr('stroke', spec.stroke ?? 'none')
        .attr('stroke-width', spec.stroke ? 3 : 0)
        .attr('paint-order', 'stroke fill');

      if (spec.clip && d.r > 0) {
        const clipId = `pack-clip-${d.data.id}`;
        let clip = svgRoot.select(`#${clipId}`);
        if (clip.empty()) {
          clip = svgRoot.select('defs').append('clipPath').attr('id', clipId);
          clip.append('circle');
        }
        clip.select('circle').attr('cx', d.x).attr('cy', d.y).attr('r', Math.max(0, d.r - 2));
        texts.attr('clip-path', `url(#${clipId})`);
      } else {
        texts.attr('clip-path', null);
      }
    });
  }

  function renderChart() {
    if (!container || !svgRoot || !packTree) return;

    const width = container.clientWidth;
    const height = Math.max(520, width * 0.85);
    const root = layoutPack(width, height);
    if (!root) return;

    svgRoot
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    const nodes = root.descendants();
    const t = anim();

    svgRoot.selectAll('clipPath[id^="pack-clip-"]').remove();

    const circles = gCircles.selectAll('g.pack-node').data(nodes, (d) => d.data.id ?? d.data.name);

    circles.exit().transition(t).attr('opacity', 0).remove();

    const enter = circles.enter().append('g').attr('class', 'pack-node').attr('opacity', 0);

    enter.append('circle').attr('class', 'pack-circle');
    enter.append('g').attr('class', 'pack-content');

    const merge = enter.merge(circles);

    merge
      .attr('transform', (d) => `translate(${d.x},${d.y})`)
      .transition(t)
      .attr('opacity', (d) =>
        hoveredId
          ? d.data.isTierGroup
            ? TIER_DIM
            : relatedIds(hoveredId).has(d.data.id)
              ? 1
              : DIM_OPACITY
          : nodeOpacity(d),
      );

    merge.select('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', (d) => d.r)
      .attr('fill', fillForNode)
      .attr('stroke', strokeForNode)
      .attr('stroke-width', (d) => (d.data.isTierGroup ? 1.5 : d.data.isRoot ? 2 : 1.5))
      .attr('stroke-dasharray', (d) => (d.data.isTierGroup ? '4 3' : null))
      .attr('fill-opacity', (d) => {
        if (d.data.isTierGroup) return 0;
        if (d.data.isRoot) return 0.18;
        return 0.9;
      })
      .style('cursor', (d) => (isFlowNode(d) || d.data.isRoot ? 'pointer' : 'default'))
      .on('mouseenter', circleMouseenter)
      .on('mousemove', circleMousemove)
      .on('mouseleave', circleMouseleave);

    renderPackContent(merge.filter((d) => showPackContent(d)), filingMap);

    renderLabels(nodes);

    if (hoveredId) {
      const h = layoutById.get(hoveredId);
      if (h) applyFlowHighlight(h);
    }
  }

  /** @param {import('d3-hierarchy').HierarchyCircularNode} d */
  function buildTooltipHtml(d) {
    const geo = geoLabelForNode(d.data);
    const geoLine = geo ? `<br/>${geo.flag} ${geo.name}` : '';
    const flows = flowsForNode(d.data.id);
    const nameById = new Map();
    for (const n of layoutById.values()) nameById.set(n.data.id, n.data.name);

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

    const total = d.data.value ?? 0;
    return `<strong>${d.data.name}</strong>${geoLine}${d.data.description ? `<br/><em>${d.data.description}</em>` : ''}<br/>${formatFlowUsd(total)} / chip${flowHtml}`;
  }

  function circleMouseenter(event, d) {
    if (d.data.isTierGroup) return;
    select(event.currentTarget).attr('fill-opacity', 1);
    if (isFlowNode(d) || d.data.isRoot) applyFlowHighlight(d);
    const { x, y } = pointerViewport(event);
    tooltip = { show: true, x, y, html: buildTooltipHtml(d) };
  }

  function circleMousemove(event) {
    const { x, y } = pointerViewport(event);
    tooltip = { ...tooltip, x, y };
  }

  function circleMouseleave(event, d) {
    if (d.data.isTierGroup) return;
    select(event.currentTarget).attr('fill-opacity', d.data.isRoot ? 0.18 : 0.9);
    clearFlowHighlight();
    tooltip = { ...tooltip, show: false };
  }

  function updateHighlight() {
    if (!gCircles) return;
    const t = transition().duration(220).ease(easeCubicInOut);
    if (hoveredId) return;
    gCircles.selectAll('g.pack-node').transition(t).attr('opacity', nodeOpacity);
    gCircles.selectAll('g.pack-content').transition(t).attr('opacity', contentOpacity);
    gLabels?.selectAll('g.pack-label').transition(t).attr('opacity', labelOpacity);
  }

  function initSvg() {
    if (!container) return;
    select(container).selectAll('*').remove();
    svgRoot = select(container).append('svg').attr('class', 'pack-svg');

    const defs = svgRoot.append('defs');

    defs.append('marker')
      .attr('id', 'pack-arrow-out')
      .attr('viewBox', '0 -4 8 8')
      .attr('refX', 7)
      .attr('refY', 0)
      .attr('markerWidth', 7)
      .attr('markerHeight', 7)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4')
      .attr('fill', 'var(--accent)');

    defs.append('marker')
      .attr('id', 'pack-arrow-in')
      .attr('viewBox', '0 -4 8 8')
      .attr('refX', 7)
      .attr('refY', 0)
      .attr('markerWidth', 7)
      .attr('markerHeight', 7)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4')
      .attr('fill', 'color-mix(in srgb, var(--brand-color, var(--accent)) 55%, var(--text-muted))');

    gCircles = svgRoot.append('g').attr('class', 'pack-circles');
    gFlow = svgRoot.append('g').attr('class', 'pack-flow');
    gLabels = svgRoot.append('g').attr('class', 'pack-labels');
  }

  onMount(() => {
    initSvg();
    renderChart();
    const ro = new ResizeObserver(() => {
      hoveredId = null;
      renderChart();
    });
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
    packTree;
    graphLinks;
    secFilings;
    maxTier;
    resolvedTheme;
    if (container && svgRoot) untrack(() => {
      hoveredId = null;
      renderChart();
    });
  });

  $effect(() => {
    highlightCountry;
    if (container && svgRoot && gCircles) untrack(() => updateHighlight());
  });
</script>

<div class="pack-wrap" class:filter-active={!!highlightCountry}>
  <div
    class="pack-canvas"
    bind:this={container}
    role="img"
    aria-label="Supply chain circle pack by tier"
  ></div>
  <p class="pack-flow-legend" aria-hidden="true">
    <span class="flow-in">↓ In</span> blue · <span class="flow-out">↑ Out</span> green — hover a circle
  </p>
</div>

<ChartTooltip show={tooltip.show} x={tooltip.x} y={tooltip.y} html={tooltip.html} />

<style>
  .pack-wrap {
    width: 100%;
    min-height: 520px;
    position: relative;
    padding: var(--space-2) 0;
  }

  .pack-canvas {
    width: 100%;
    min-height: 520px;
  }

  .pack-flow-legend {
    margin: var(--space-2) 0 0;
    text-align: center;
    font-size: 11px;
    color: var(--text-subtle);
  }

  .pack-flow-legend .flow-in {
    color: color-mix(in srgb, var(--brand-color, var(--accent)) 70%, var(--text-muted));
    font-weight: 600;
  }

  .pack-flow-legend .flow-out {
    color: var(--brand-color, var(--accent));
    font-weight: 600;
  }

  .pack-wrap :global(svg) {
    display: block;
    margin: 0 auto;
    font-family: 'IBM Plex Sans', system-ui, sans-serif;
  }

  .pack-wrap :global(.pack-label-text) {
    pointer-events: none;
    font-variant-numeric: tabular-nums;
  }

  .pack-wrap :global(.flow-line) {
    pointer-events: none;
    stroke-linecap: round;
    opacity: 0.92;
  }

  .pack-wrap :global(.flow-amount) {
    fill: var(--text);
    font-size: 10px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    paint-order: stroke fill;
    stroke: var(--bg);
    stroke-width: 4px;
    stroke-linejoin: round;
    pointer-events: none;
  }

  .pack-wrap :global(circle.pack-circle) {
    transition: fill-opacity 0.15s;
  }

  .pack-wrap :global(.pack-content) {
    pointer-events: none;
  }

  .pack-wrap :global(.pack-value) {
    font-variant-numeric: tabular-nums;
    pointer-events: none;
  }

  .pack-wrap :global(.pack-logo-initials-text) {
    font-weight: 700;
    pointer-events: none;
  }

  .pack-wrap :global(.pack-logo-img) {
    pointer-events: none;
  }
</style>
