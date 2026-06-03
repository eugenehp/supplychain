/**
 * Extract NI 43-101 / JORC resource estimates from technical report plain text.
 * @param {string} text
 * @param {{ companyId?: string, companyName?: string }} [meta]
 */
export function parseNi43ResourceEstimates(text, meta = {}) {
  if (!text || text.length < 2000) return null;

  /** @type {object[]} */
  const estimates = [];
  const patterns = [
    {
      label: 'TREO',
      re: /(?:total\s+)?(?:rare\s+earth\s+oxide|TREO|REO)[^.\n]{0,80}?([\d,.]+)\s*(?:million\s+)?(?:tonnes?|t|Mt)\b/gi,
    },
    {
      label: 'NdPr',
      re: /(?:NdPr|neodymium[\s-]praseodymium)[^.\n]{0,80}?([\d,.]+)\s*(?:million\s+)?(?:tonnes?|t|Mt|%)\b/gi,
    },
    {
      label: 'Mineral Resource',
      re: /(?:measured|indicated|inferred)\s+(?:and\s+)?(?:indicated|inferred)?\s*resource[^.\n]{0,120}?([\d,.]+)\s*(?:million\s+)?(?:tonnes?|t|Mt)\b/gi,
    },
    {
      label: 'Grade NdPr',
      re: /(?:NdPr|Nd\+Pr)[^.\n]{0,40}?([\d.]+)\s*%\b/gi,
    },
  ];

  const seen = new Set();
  for (const { label, re } of patterns) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null && estimates.length < 12) {
      const raw = m[1]?.replace(/,/g, '');
      const value = parseFloat(raw);
      if (!Number.isFinite(value)) continue;
      const key = `${label}:${value}:${m.index}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const snippet = text.slice(Math.max(0, m.index - 60), Math.min(text.length, m.index + 140)).replace(/\s+/g, ' ').trim();
      estimates.push({ label, value, unit: snippet.includes('%') ? '%' : 't', snippet });
    }
  }

  if (!estimates.length) return null;

  return {
    companyId: meta.companyId ?? null,
    companyName: meta.companyName ?? null,
    standard: /\bNI\s+43-101\b/i.test(text) ? 'NI 43-101' : /\bJORC\b/i.test(text) ? 'JORC' : 'Technical report',
    estimates: estimates.slice(0, 8),
    parsedAt: new Date().toISOString(),
  };
}

/**
 * @param {object[]} filingRows
 * @param {Map<string, string>} textCache
 */
export function buildAsxResourceIndex(filingRows, textCache) {
  /** @type {object[]} */
  const projects = [];
  for (const row of filingRows) {
    if (row.sourceRegime !== 'ASX') continue;
    const text = textCache.get(row.id);
    if (!text) continue;
    const parsed = parseNi43ResourceEstimates(text, { companyId: row.id, companyName: row.companyName });
    if (parsed) projects.push(parsed);
  }
  return {
    dataLayer: 'ASX-NI43-101-parsed',
    methodology:
      'Regex extraction of TREO/NdPr/grade language from ASX annual and technical report text. Verify against official NI 43-101 tables.',
    projects,
    summary: { projectCount: projects.length, estimateCount: projects.reduce((n, p) => n + p.estimates.length, 0) },
  };
}
