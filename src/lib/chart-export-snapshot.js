/**
 * Build a vector-ready SVG snapshot from a hidden on-page staging node.
 * Never mutates the visible app DOM or theme.
 */

import { buildExportSandboxThemeCss } from './export-light-theme.js';
import { readBrandColor } from './brand-theme.js';
import { CHART_EXPORT_CSS } from './chart-export-chart-css.js';
import { chartCoordinateSize } from './chart-export-layout.js';
import { prepareSvgForExport, stripExportBackgrounds } from './chart-export-styles.js';

/** @param {Blob} blob */
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(/** @type {string} */ (reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * @param {SVGElement} root
 */
async function inlineRasterImages(root) {
  for (const img of root.querySelectorAll('image')) {
    const href =
      img.getAttribute('href') ?? img.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
    if (!href || href.startsWith('data:')) continue;
    try {
      const res = await fetch(href);
      if (!res.ok) continue;
      img.setAttribute('href', await blobToDataUrl(await res.blob()));
    } catch {
      /* keep original href */
    }
  }
}

/** @returns {Promise<void>} */
function waitForPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/**
 * @param {SVGElement} root
 */
async function settleChartAssets(root) {
  const tasks = [];
  for (const img of root.querySelectorAll('image')) {
    const href =
      img.getAttribute('href') ?? img.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
    if (!href || href.startsWith('data:')) continue;
    tasks.push(
      new Promise((resolve) => {
        const probe = new Image();
        probe.crossOrigin = 'anonymous';
        probe.onload = () => resolve();
        probe.onerror = () => resolve();
        probe.src = href;
      }),
    );
  }
  if (tasks.length) await Promise.all(tasks);
}

/**
 * Chart wrapper that owns scoped Svelte CSS (sankey-wrap, pack-wrap, etc.).
 * @param {HTMLElement} exportRoot
 * @returns {HTMLElement}
 */
function findChartMountRoot(exportRoot) {
  const svg = exportRoot.querySelector('svg');
  if (!svg) return exportRoot;

  let node = svg.parentElement;
  while (node && node !== exportRoot) {
    const cls = node.classList;
    if (
      cls.contains('sankey-wrap') ||
      cls.contains('map-wrap') ||
      cls.contains('pack-wrap') ||
      cls.contains('radial-tree-wrap')
    ) {
      return /** @type {HTMLElement} */ (node);
    }
    node = node.parentElement;
  }
  return exportRoot;
}

/** @param {HTMLElement} root */
function stripNonExportChrome(root) {
  for (const sel of [
    '.map-zoom-controls',
    '.map-zoom-hint',
    '.map-loading',
    '.map-error',
    '.pack-flow-legend',
    '.radial-tree-hint',
  ]) {
    root.querySelectorAll(sel).forEach((el) => el.remove());
  }
}

/**
 * @param {SVGSVGElement} svg
 */
function svgExportSize(svg) {
  return chartCoordinateSize(svg);
}

/**
 * @param {SVGSVGElement} svg
 */
function buildVectorSvgString(svg) {
  const clone = /** @type {SVGSVGElement} */ (svg.cloneNode(true));
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

  const { width, height } = svgExportSize(svg);
  const vb = svg.viewBox?.baseVal;
  if (vb?.width > 0 && vb?.height > 0) {
    clone.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.width} ${vb.height}`);
  } else {
    clone.setAttribute('viewBox', `0 0 ${width} ${height}`);
  }
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  clone.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  stripExportBackgrounds(clone);

  return {
    svg: new XMLSerializer().serializeToString(clone),
    width,
    height,
  };
}

/**
 * @param {HTMLElement} exportRoot Chart export target from the live UI (read-only source).
 * @returns {Promise<{ svg: string, width: number, height: number }>}
 */
export async function captureChartExportSnapshot(exportRoot) {
  const liveSvg = exportRoot.querySelector('svg');
  if (!liveSvg) throw new Error('No chart SVG found for this view.');

  const styleRoot = findChartMountRoot(exportRoot);
  const liveSvgEl = /** @type {SVGSVGElement} */ (liveSvg);
  const { width: svgW } = chartCoordinateSize(liveSvgEl);
  const canvasEl = liveSvg.parentElement;
  const mountW = Math.max(
    1,
    Math.round(canvasEl?.clientWidth || styleRoot.getBoundingClientRect().width || svgW),
  );

  const staging = document.createElement('div');
  staging.className = 'pdf-export-sandbox';
  staging.setAttribute('aria-hidden', 'true');
  staging.style.cssText = `position:fixed;left:-10000px;top:0;width:${mountW}px;overflow:visible;visibility:hidden;pointer-events:none;z-index:-1`;

  const styleEl = document.createElement('style');
  styleEl.textContent = `${buildExportSandboxThemeCss(readBrandColor())}\n${CHART_EXPORT_CSS}`;
  staging.appendChild(styleEl);

  const chartClone = styleRoot.cloneNode(true);
  if (!(chartClone instanceof HTMLElement)) throw new Error('Export clone invalid');
  stripNonExportChrome(chartClone);
  staging.appendChild(chartClone);
  document.body.appendChild(staging);

  try {
    const sandboxSvg = chartClone.querySelector('svg');
    if (!sandboxSvg) throw new Error('Export clone missing SVG');

    await document.fonts?.ready;
    await waitForPaint();
    await settleChartAssets(sandboxSvg);
    prepareSvgForExport(chartClone, /** @type {SVGSVGElement} */ (sandboxSvg));
    await inlineRasterImages(sandboxSvg);
    await waitForPaint();

    return buildVectorSvgString(/** @type {SVGSVGElement} */ (sandboxSvg));
  } finally {
    staging.remove();
  }
}
