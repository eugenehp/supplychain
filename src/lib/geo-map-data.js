import { countryForNode, geoLabelForNode, COUNTRY_NAMES } from './vendor-geography.js';
import { filterSankeyByMaxTier, clampSankeyTier } from './sankey-data.js';

/** [longitude, latitude] — HQ / primary jurisdiction centroids for flow arrows. */
export const COUNTRY_CENTROIDS = {
  US: [-98.5, 39.8],
  TW: [120.9, 23.7],
  KR: [127.8, 36.5],
  JP: [138.0, 36.2],
  NL: [5.3, 52.1],
  DE: [10.4, 51.2],
  CH: [8.2, 46.8],
  GB: [-2.5, 54.5],
  BE: [4.5, 50.5],
  FR: [2.2, 46.2],
};

/** world-atlas TopoJSON country id (ISO 3166-1 numeric) → alpha-2 */
export const NUMERIC_TO_ALPHA = {
  '840': 'US',
  '158': 'TW',
  '410': 'KR',
  '392': 'JP',
  '528': 'NL',
  '276': 'DE',
  '756': 'CH',
  '826': 'GB',
  '056': 'BE',
  '250': 'FR',
};

/** @param {string} alpha */
export function alphaToNumericId(alpha) {
  for (const [num, code] of Object.entries(NUMERIC_TO_ALPHA)) {
    if (code === alpha) return num;
  }
  return null;
}

/**
 * Build map model from the same filtered Sankey graph.
 * @param {object} supplyData
 * @param {number} maxTier
 */
export function prepareMapData(supplyData, maxTier) {
  const filtered = filterSankeyByMaxTier(supplyData, clampSankeyTier(maxTier));
  const nodeById = new Map((filtered.nodes ?? []).map((n) => [n.id, n]));

  /** @type {Array<{ from: string, to: string, value: number, sourceId: string, targetId: string, sourceName: string, targetName: string }>} */
  const rawFlows = [];

  for (const link of filtered.links ?? []) {
    const src = nodeById.get(link.source) ?? { id: link.source, name: link.source };
    const tgt = nodeById.get(link.target) ?? { id: link.target, name: link.target };
    const from = countryForNode(src);
    const to = countryForNode(tgt);
    if (!from || !to || from === to) continue;

    rawFlows.push({
      from,
      to,
      value: link.value ?? 0,
      sourceId: link.source,
      targetId: link.target,
      sourceName: src.name ?? link.source,
      targetName: tgt.name ?? link.target,
    });
  }

  /** @type {Map<string, { from: string, to: string, value: number, links: typeof rawFlows }>} */
  const flowMap = new Map();
  for (const f of rawFlows) {
    const key = `${f.from}|${f.to}`;
    if (!flowMap.has(key)) {
      flowMap.set(key, { from: f.from, to: f.to, value: 0, links: [] });
    }
    const agg = flowMap.get(key);
    agg.value += f.value;
    agg.links.push(f);
  }

  /** @type {Map<string, { code: string, vendors: string[], inValue: number, outValue: number }>} */
  const countries = new Map();
  for (const node of filtered.nodes ?? []) {
    const code = countryForNode(node);
    if (!code) continue;
    if (!countries.has(code)) {
      countries.set(code, { code, vendors: [], inValue: 0, outValue: 0 });
    }
    countries.get(code).vendors.push(node.name ?? node.id);
  }

  for (const f of rawFlows) {
    const fromC = countries.get(f.from);
    const toC = countries.get(f.to);
    if (fromC) fromC.outValue += f.value;
    if (toC) toC.inValue += f.value;
  }

  const countryList = [...countries.values()].map((c) => {
    const geo = geoLabelForNode({ country: c.code, id: c.code });
    const vendorDetails = c.vendors.map((name) => {
      let inVal = 0;
      let outVal = 0;
      for (const f of rawFlows) {
        if (f.targetName === name || f.targetId === name) inVal += f.value;
        if (f.sourceName === name || f.sourceId === name) outVal += f.value;
      }
      return { name, inVal, outVal, total: inVal + outVal };
    }).sort((a, b) => b.total - a.total);

    return {
      ...c,
      name: geo?.name ?? COUNTRY_NAMES[c.code] ?? c.code,
      flag: geo?.flag ?? '',
      centroid: COUNTRY_CENTROIDS[c.code] ?? null,
      totalValue: c.inValue + c.outValue,
      vendorDetails,
    };
  }).filter((c) => c.centroid);

  const flows = [...flowMap.values()].sort((a, b) => b.value - a.value);
  const vendorFlows = [...rawFlows].sort((a, b) => b.value - a.value);

  return { flows, countries: countryList, rawFlows, vendorFlows, nodeCount: filtered.nodes?.length ?? 0 };
}

/** Quadratic Bézier path between projected points; lane spreads overlapping country-pair routes. */
export function curvedLinkPath(x0, y0, x1, y1, bend = 0.22, lane = 0) {
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy) || 1;
  const bendSign = lane % 2 === 0 ? 1 : -1;
  const bendAmt = bend + Math.floor(lane / 2) * 0.07;
  const cx = mx - (dy / dist) * dist * bendAmt * bendSign;
  const cy = my + (dx / dist) * dist * bendAmt * bendSign;
  return { path: `M${x0},${y0} Q${cx},${cy} ${x1},${y1}`, cx, cy };
}

/** Assign lane indices so multiple vendor flows between the same countries fan out. */
export function assignFlowLanes(flows) {
  const counts = new Map();
  return flows.map((f) => {
    const key = `${f.from}|${f.to}`;
    const lane = counts.get(key) ?? 0;
    counts.set(key, lane + 1);
    return { ...f, lane };
  });
}

export function flowMatchesCountry(flow, highlightCountry) {
  if (!highlightCountry) return true;
  return flow.from === highlightCountry || flow.to === highlightCountry;
}

export function countryMatchesHighlight(code, highlightCountry) {
  if (!highlightCountry) return true;
  return code === highlightCountry;
}
