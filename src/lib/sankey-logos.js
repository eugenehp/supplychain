import { select } from 'd3-selection';
import { logoMetaForNode, logoSlugForNode } from './logo-resolver.js';
import { isDarkTheme } from './theme.js';

export { NODE_TO_TICKER } from './vendor-colors.js';
export { logoSlugForNode as tickerForNode };

export function filingMapFromList(filings = []) {
  const map = new Map();
  for (const f of filings) {
    if (f?.ticker) map.set(f.ticker.toUpperCase(), f);
  }
  return map;
}

/** @deprecated filing map unused — logos resolve from manifest */
export function nodeLogoMeta(node, _filingMap = new Map()) {
  return logoMetaForNode(node);
}

export function logoSize(node, { min = 14, max = 24 } = {}) {
  const h = Math.max(1, (node?.y1 ?? 0) - (node?.y0 ?? 0));
  if (h < 20) return Math.min(min, Math.round(h * 0.75));
  return Math.round(Math.min(max, Math.max(min, h * 0.72)));
}

/** Logo size for circle-pack nodes (radius-based). */
export function packLogoSize(node, { min = 10, max = 34 } = {}) {
  const r = node?.r ?? 0;
  if (node?.data?.isTierGroup) return 0;
  if (r < 12) return 0;
  return Math.round(Math.min(max, Math.max(min, r * 0.5)));
}

/** Vertical layout for logo + $ label centered in a pack circle. */
export function packContentLayout(node, logoSize) {
  const r = node?.r ?? 0;
  const showValue = r >= 10;
  const valueSize = Math.min(11, Math.max(7, r / 2.6));
  const gap = logoSize > 0 ? 3 : 0;
  const stack = logoSize + (showValue ? gap + valueSize : 0);
  const logoCy = logoSize > 0 ? -stack / 2 + logoSize / 2 : 0;
  const valueCy = logoSize > 0 ? stack / 2 - valueSize / 2 : 0;
  return { logoSize, valueSize, logoCy, valueCy, showValue, showLogo: logoSize > 0 };
}

/**
 * Append a logo image to a chart badge; white frame in dark mode only.
 * @param {import('d3-selection').Selection} badge
 * @param {{ primary: string, fallback?: string }} meta
 * @param {number} size
 * @param {{ imageClass?: string, rx?: number, onInitials: () => void }} opts
 */
export function appendChartLogoImage(badge, meta, size, { imageClass = 'logo-img', rx = 4, onInitials }) {
  const dark = isDarkTheme();
  const pad = dark ? 2 : 0;
  const inner = size - pad * 2;

  if (dark) {
    badge
      .append('rect')
      .attr('class', 'logo-frame')
      .attr('width', size)
      .attr('height', size)
      .attr('rx', rx)
      .attr('fill', '#ffffff');
  }

  badge
    .append('image')
    .attr('class', imageClass)
    .attr('href', meta.primary)
    .attr('x', pad)
    .attr('y', pad)
    .attr('width', inner)
    .attr('height', inner)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .on('error', function () {
      const img = select(this);
      const current = img.attr('href');
      if (meta.fallback && current !== meta.fallback) {
        img.attr('href', meta.fallback);
      } else {
        badge.selectAll('*').remove();
        onInitials();
      }
    });
}

export function logoLayout(node, width, size = 20) {
  const left = (node?.x0 ?? 0) < width / 2;
  const cy = ((node?.y0 ?? 0) + (node?.y1 ?? 0)) / 2;
  const gap = 8;
  const x = left ? node.x1 + gap : node.x0 - gap - size;
  const y = cy - size / 2;
  const textX = left ? x + size + 8 : x - 8;
  const textAnchor = left ? 'start' : 'end';
  return { left, x, y, cy, textX, textAnchor, size };
}
