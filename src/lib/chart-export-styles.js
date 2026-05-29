/**
 * Pin computed SVG/HTML styles as inline attributes for vector PDF export (svg2pdf).
 */

import { flattenSvgTextLayout } from './chart-export-layout.js';
import { PDF_FONT_FAMILY, exportFontWeightAttr } from './pdf-fonts.js';

const PRESENTATION_PROPS = [
  'fill',
  'stroke',
  'stroke-width',
  'fill-opacity',
  'stroke-opacity',
  'opacity',
  'font-size',
  'font-family',
  'font-weight',
  'font-style',
  'text-anchor',
  'dominant-baseline',
  'paint-order',
  'stroke-linecap',
  'stroke-linejoin',
  'letter-spacing',
];

const VAR_ATTRS = ['fill', 'stroke', 'color', 'stop-color', 'flood-color', 'lighting-color'];

/** @param {string} value */
function isTransparent(value) {
  return !value || value === 'none' || value === 'transparent' || value === 'rgba(0, 0, 0, 0)';
}

/** @param {string} fill */
function isBackgroundFill(fill) {
  if (isTransparent(fill)) return true;
  if (fill.includes('var(--')) return true;
  if (/rgba?\(\s*0,\s*0,\s*0,\s*0\.0[0-2]/.test(fill)) return true;
  return ['#f4f6f9', '#ffffff', '#fff', 'white', 'rgb(255, 255, 255)', 'rgb(244, 246, 249)'].includes(
    fill.toLowerCase(),
  );
}

/**
 * @param {SVGElement} node
 * @param {CSSStyleDeclaration} cs
 */
function applySvgPresentation(node, cs) {
  const fill = cs.fill;
  if (!isTransparent(fill)) node.setAttribute('fill', fill);

  const stroke = cs.stroke;
  if (!isTransparent(stroke) && !(node instanceof SVGTextContentElement)) {
    node.setAttribute('stroke', stroke);
  }

  const strokeWidth = cs.getPropertyValue('stroke-width');
  if (strokeWidth && strokeWidth !== '0px' && !(node instanceof SVGTextContentElement)) {
    node.setAttribute('stroke-width', strokeWidth);
  }

  const fillOpacity = cs.getPropertyValue('fill-opacity');
  if (fillOpacity && fillOpacity !== '1') node.setAttribute('fill-opacity', fillOpacity);

  const strokeOpacity = cs.getPropertyValue('stroke-opacity');
  if (strokeOpacity && strokeOpacity !== '1') node.setAttribute('stroke-opacity', strokeOpacity);

  const opacity = cs.getPropertyValue('opacity');
  if (opacity && opacity !== '1') node.setAttribute('opacity', opacity);

  if (node instanceof SVGTextContentElement) {
    node.setAttribute('font-family', PDF_FONT_FAMILY);

    const fontSize = cs.fontSize;
    if (fontSize) {
      const px = String(fontSize).match(/^([\d.]+)px$/);
      node.setAttribute('font-size', px ? px[1] : String(parseFloat(fontSize) || 12));
    }

    node.setAttribute('font-weight', exportFontWeightAttr(cs.fontWeight));

    const fontStyle = cs.fontStyle;
    if (fontStyle && fontStyle !== 'normal') node.setAttribute('font-style', fontStyle);
    const textAnchor = cs.textAnchor;
    if (textAnchor && textAnchor !== 'start') node.setAttribute('text-anchor', textAnchor);
    const dominantBaseline = cs.dominantBaseline;
    if (dominantBaseline && dominantBaseline !== 'auto') {
      node.setAttribute('dominant-baseline', dominantBaseline);
    }
    const letterSpacing = cs.letterSpacing;
    if (letterSpacing && letterSpacing !== 'normal') {
      node.setAttribute('letter-spacing', letterSpacing);
    }
  }

  for (const prop of PRESENTATION_PROPS) {
    if (
      [
        'fill',
        'stroke',
        'stroke-width',
        'fill-opacity',
        'stroke-opacity',
        'opacity',
        'font-size',
        'font-family',
        'font-weight',
        'font-style',
        'text-anchor',
        'dominant-baseline',
        'letter-spacing',
        'paint-order',
        'stroke-linejoin',
      ].includes(prop)
    ) {
      continue;
    }
    const val = cs.getPropertyValue(prop);
    if (!val || val === 'normal' || val === 'auto' || val === 'none') continue;
    node.setAttribute(prop, val);
  }
}

/** @param {Element} root */
function svgElements(root) {
  if (root instanceof SVGSVGElement) return [root, ...root.querySelectorAll('*')];
  return [...root.querySelectorAll('svg, svg *')];
}

/** @param {SVGElement} root */
export function pinChartDomForExport(root) {
  if (root instanceof SVGSVGElement) {
    root.setAttribute('font-family', PDF_FONT_FAMILY);
  }

  for (const node of svgElements(root)) {
    if (!(node instanceof SVGElement)) continue;
    applySvgPresentation(node, getComputedStyle(node));
  }
}

/**
 * Replace unresolved var(...) presentation attributes with computed values.
 * @param {SVGElement} root
 */
export function resolveSvgAttributeVars(root) {
  for (const node of svgElements(root)) {
    if (!(node instanceof SVGElement)) continue;
    const cs = getComputedStyle(node);

    for (const attr of VAR_ATTRS) {
      const raw = node.getAttribute(attr);
      if (!raw || !raw.includes('var(')) continue;
      const resolved =
        attr === 'fill' ? cs.fill : attr === 'stroke' ? cs.stroke : cs.getPropertyValue(attr);
      if (resolved && !isTransparent(resolved)) node.setAttribute(attr, resolved);
    }
  }
}

/**
 * Export at full visibility — ignore country-highlight dimming in the clone.
 * @param {HTMLElement} chartRoot
 * @param {SVGElement} svg
 */
export function normalizeExportVisibility(chartRoot, svg) {
  chartRoot.classList.remove('filter-active');

  for (const node of svgElements(svg)) {
    if (!(node instanceof SVGElement)) continue;
    const cs = getComputedStyle(node);

    const opacity = Number.parseFloat(cs.opacity);
    if (Number.isFinite(opacity) && opacity > 0 && opacity < 0.5) {
      node.setAttribute('opacity', '1');
      node.style.opacity = '1';
    }

    for (const attr of ['opacity', 'fill-opacity', 'stroke-opacity']) {
      const raw = node.getAttribute(attr);
      if (raw == null) continue;
      const value = Number.parseFloat(raw);
      if (!Number.isFinite(value) || value <= 0) continue;
      if (value < 0.5) node.setAttribute(attr, '1');
    }
  }
}

/** Clip paths often hide pack/radial labels in svg2pdf — drop for export. */
export function stripClipPathsForExport(svg) {
  for (const node of svg.querySelectorAll('[clip-path]')) {
    node.removeAttribute('clip-path');
  }
}

/** Remove chart background fills from exported SVG (transparent PDF chart area). */
export function stripExportBackgrounds(svg) {
  const svgW = Number.parseFloat(svg.getAttribute('width') ?? '0');
  const svgH = Number.parseFloat(svg.getAttribute('height') ?? '0');
  if (!svgW || !svgH) return;

  svg.querySelectorAll('rect').forEach((rect) => {
    const w = Number.parseFloat(rect.getAttribute('width') ?? '0');
    const h = Number.parseFloat(rect.getAttribute('height') ?? '0');
    const fill = (rect.getAttribute('fill') ?? '').toLowerCase();
    const isFullSize = w >= svgW * 0.95 && h >= svgH * 0.95;
    if (isFullSize && isBackgroundFill(fill)) {
      rect.remove();
    }
  });
}

/** Halo strokes around labels look much heavier in vector PDF — drop them. */
export function tunePdfTextStrokes(svg) {
  for (const node of svgElements(svg)) {
    if (!(node instanceof SVGTextContentElement)) continue;
    const strokeWidth = Number.parseFloat(node.getAttribute('stroke-width') ?? '0');
    const stroke = node.getAttribute('stroke');
    if (!stroke || stroke === 'none' || strokeWidth <= 0) continue;
    node.removeAttribute('stroke');
    node.removeAttribute('stroke-width');
    node.removeAttribute('stroke-linejoin');
    node.removeAttribute('paint-order');
  }
}

/**
 * @param {HTMLElement} chartRoot
 * @param {SVGSVGElement} svg
 */
export function prepareSvgForExport(chartRoot, svg) {
  normalizeExportVisibility(chartRoot, svg);
  pinChartDomForExport(svg);
  resolveSvgAttributeVars(svg);
  stripClipPathsForExport(svg);
  tunePdfTextStrokes(svg);
  flattenSvgTextLayout(svg);
}
