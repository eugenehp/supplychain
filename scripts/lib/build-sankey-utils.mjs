import { TIERS } from './topics/index.mjs';

export function normalizeIntermediateFlows(links, nodeMeta = {}) {
  const inflow = {};
  const outflow = {};

  for (const link of links) {
    outflow[link.source] = (outflow[link.source] ?? 0) + link.value;
    inflow[link.target] = (inflow[link.target] ?? 0) + link.value;
  }

  const scaled = links.map((l) => ({ ...l }));
  const nodeScale = {};

  for (const name of Object.keys(nodeMeta)) {
    const meta = nodeMeta[name];
    if (meta.tier === TIERS.tier1 || meta.tier === TIERS.product) continue;

    const totalIn = inflow[name] ?? 0;
    const totalOut = outflow[name] ?? 0;
    if (totalIn > 0 && totalOut > 0 && Math.abs(totalIn - totalOut) > 0.01) {
      nodeScale[name] = totalOut / totalIn;
    }
  }

  for (const link of scaled) {
    const targetMeta = nodeMeta[link.target];
    if (targetMeta && targetMeta.tier >= TIERS.tier2 && targetMeta.tier <= TIERS.tier5) {
      if (nodeScale[link.target]) {
        link.value = Math.round(link.value * nodeScale[link.target] * 100) / 100;
      }
    }
  }

  return scaled;
}

export function applySecScaling(links, secData) {
  const equipmentRevenue = {};
  for (const entry of secData) {
    if (entry.error) continue;
    const rev = entry.facts?.Revenues?.value ?? entry.facts?.RevenueFromContractWithCustomerExcludingAssessedTax?.value ?? entry.facts?.Revenue?.value;
    if (rev) equipmentRevenue[entry.ticker] = rev;
  }

  const amatRev = equipmentRevenue.AMAT ?? 0;
  const lrcxRev = equipmentRevenue.LRCX ?? 0;
  const asmlEntry = secData.find((d) => d.ticker === 'ASML');
  const asmlRev = asmlEntry?.facts?.Revenues?.value ?? asmlEntry?.facts?.RevenueFromContractWithCustomerExcludingAssessedTax?.value ?? 0;

  if (!amatRev || !lrcxRev || !asmlRev) return links;

  const totalEqRev = amatRev + lrcxRev + asmlRev;
  const eqLinks = links.filter((l) => ['ASML', 'Applied Materials', 'Lam Research'].includes(l.source));
  const currentTotal = eqLinks.reduce((s, l) => s + l.value, 0);
  if (currentTotal <= 0) return links;

  const scale = (source, share) => {
    const current = eqLinks.filter((l) => l.source === source).reduce((s, l) => s + l.value, 0);
    return current > 0 ? (currentTotal * share) / current : 1;
  };

  const amatS = scale('Applied Materials', amatRev / totalEqRev);
  const lrcxS = scale('Lam Research', lrcxRev / totalEqRev);
  const asmlS = scale('ASML', asmlRev / totalEqRev);

  return links.map((l) => {
    if (l.source === 'Applied Materials') return { ...l, value: Math.round(l.value * amatS * 100) / 100 };
    if (l.source === 'Lam Research') return { ...l, value: Math.round(l.value * lrcxS * 100) / 100 };
    if (l.source === 'ASML') return { ...l, value: Math.round(l.value * asmlS * 100) / 100 };
    return l;
  });
}
