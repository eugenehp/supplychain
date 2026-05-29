/**
 * Validation rules for raw and processed pipeline artifacts.
 */

export function validateRawCompany(raw) {
  const checks = [];
  const pass = (id, ok, detail) => checks.push({ id, ok, detail });

  pass('ticker', !!raw.ticker, raw.ticker ?? 'missing');
  pass('cik', !!raw.cik && raw.cik.length === 10, raw.cik ?? 'missing');
  pass('filing', !!raw.filing, raw.filing ? `${raw.filing.form} ${raw.filing.filingDate}` : 'no annual filing');
  pass('html', raw.htmlLength > 5000, `${raw.htmlLength ?? 0} bytes`);
  pass('companyfacts', !!raw.hasCompanyFacts, raw.hasCompanyFacts ? 'present' : 'missing');
  pass('submissions', !!raw.hasSubmissions, raw.hasSubmissions ? 'present' : 'missing');
  pass('revenue', !!raw.hasRevenue, raw.hasRevenue ? `$${(raw.revenue / 1e9).toFixed(1)}B` : 'no revenue fact');

  const failed = checks.filter((c) => !c.ok);
  return {
    valid: failed.length === 0,
    checks,
    errors: failed.map((c) => `${c.id}: ${c.detail}`),
  };
}

export function validateProcessedCompany(processed) {
  const checks = [];
  const pass = (id, ok, detail) => checks.push({ id, ok, detail });

  pass('text', (processed.textLength ?? 0) > 10000, `${processed.textLength ?? 0} chars`);
  pass('sections', (processed.sectionCount ?? 0) >= 1, `${processed.sectionCount ?? 0} sections`);
  pass('chunks', (processed.chunkCount ?? 0) >= 5, `${processed.chunkCount ?? 0} chunks`);
  pass('entities', processed.entities != null, processed.entities ? `${processed.entities.vendors?.length ?? 0} vendors` : 'missing');

  const failed = checks.filter((c) => !c.ok);
  return {
    valid: failed.length === 0,
    checks,
    errors: failed.map((c) => `${c.id}: ${c.detail}`),
  };
}

export function validateGraph(graph, productNode = 'Nvidia H200') {
  const checks = [];
  const nodeIds = new Set(graph.nodes.map((n) => n.id));
  let orphanLinks = 0;

  for (const link of graph.links) {
    if (!nodeIds.has(link.source) || !nodeIds.has(link.target)) orphanLinks++;
  }

  checks.push({ id: 'nodes', ok: graph.nodes.length >= 30, detail: `${graph.nodes.length} nodes` });
  checks.push({ id: 'links', ok: graph.links.length >= 50, detail: `${graph.links.length} links` });
  checks.push({ id: 'orphans', ok: orphanLinks === 0, detail: orphanLinks === 0 ? 'none' : `${orphanLinks} broken links` });
  checks.push({
    id: 'product',
    ok: nodeIds.has(productNode),
    detail: nodeIds.has(productNode) ? `${productNode} present` : 'missing product node',
  });

  const failed = checks.filter((c) => !c.ok);
  return { valid: failed.length === 0, checks, errors: failed.map((c) => `${c.id}: ${c.detail}`) };
}

export function validateSankey(dataset) {
  const checks = [];
  checks.push({ id: 'nodes', ok: dataset.nodes?.length >= 30, detail: `${dataset.nodes?.length ?? 0} nodes` });
  checks.push({ id: 'links', ok: dataset.links?.length >= 50, detail: `${dataset.links?.length ?? 0} links` });
  checks.push({ id: 'bom', ok: (dataset.summary?.totalBomPerChip ?? 0) > 100, detail: `$${dataset.summary?.totalBomPerChip ?? 0}/chip` });

  const failed = checks.filter((c) => !c.ok);
  return { valid: failed.length === 0, checks, errors: failed.map((c) => `${c.id}: ${c.detail}`) };
}

export function buildPipelineReport(stages) {
  const allValid = stages.every((s) => s.valid);
  return {
    generatedAt: new Date().toISOString(),
    valid: allValid,
    stages,
    summary: allValid ? 'All pipeline stages passed validation' : `${stages.filter((s) => !s.valid).length} stage(s) failed`,
  };
}
