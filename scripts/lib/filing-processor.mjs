import { createHash } from 'node:crypto';
import { canonicalize } from './semi-vendors.mjs';

const SECTION_PATTERNS = [
  { id: 'risk_factors', re: /item\s*1a[\.\s]*risk\s*factors/i },
  { id: 'business', re: /item\s*1[\.\s]*business/i },
  { id: 'suppliers', re: /(?:single\s+source|sole\s+source|supplier|vendor|subcontractor)/i },
  { id: 'properties', re: /item\s*2[\.\s]*properties/i },
  { id: 'mda', re: /item\s*7[\.\s]*management/i },
];

const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 200;

export function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractSections(text) {
  const sections = [];
  const itemMatches = [...text.matchAll(/(?:ITEM|Item)\s+\d+[A-Z]?[\.\s\-–—]+[A-Z][^\n]{0,80}/g)];

  for (let i = 0; i < itemMatches.length; i++) {
    const start = itemMatches[i].index;
    const end = itemMatches[i + 1]?.index ?? text.length;
    const header = itemMatches[i][0].trim();
    const body = text.slice(start, end).trim();
    const id = header.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40);
    sections.push({ id, header, text: body, length: body.length });
  }

  if (sections.length === 0) {
    for (const pat of SECTION_PATTERNS) {
      const idx = text.search(pat.re);
      if (idx >= 0) {
        sections.push({
          id: pat.id,
          header: pat.id,
          text: text.slice(idx, idx + 15000),
          length: Math.min(15000, text.length - idx),
        });
      }
    }
  }

  if (sections.length === 0) {
    sections.push({ id: 'full_document', header: 'Full Document', text, length: text.length });
  }

  return sections;
}

export function chunkText(text, meta = {}) {
  const chunks = [];
  let offset = 0;
  let index = 0;

  while (offset < text.length) {
    const end = Math.min(offset + CHUNK_SIZE, text.length);
    let sliceEnd = end;
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('. ', end);
      if (lastPeriod > offset + CHUNK_SIZE * 0.6) sliceEnd = lastPeriod + 1;
    }

    const chunkText = text.slice(offset, sliceEnd).trim();
    if (chunkText.length > 80) {
      const id = createHash('sha256').update(`${meta.ticker}-${index}-${chunkText.slice(0, 64)}`).digest('hex').slice(0, 16);
      chunks.push({
        id,
        index,
        text: chunkText,
        charStart: offset,
        charEnd: sliceEnd,
        ...meta,
      });
      index++;
    }
    offset = sliceEnd - CHUNK_OVERLAP;
    if (offset <= 0 || sliceEnd >= text.length) break;
  }

  return chunks;
}

const VENDOR_PATTERNS = [
  /(?:supplier|vendor|source|purchase|obtain|depend(?:s|ed)?\s+(?:on|upon))[^.]{0,120}?([A-Z][A-Za-z0-9\s&,\.\-']+(?:Inc\.?|Corp\.?|Ltd\.?|Co\.?|B\.V\.|N\.V\.|AG|SE|Corporation|Company|Limited|Holdings|Group))/gi,
  /(?:including|such as|like)\s+([A-Z][A-Za-z0-9\s&,]+(?:Inc\.?|Corp\.?|Ltd\.?))/gi,
  /(Taiwan Semiconductor[^.,]{0,40})/gi,
  /(SK Hynix[^.,]{0,30})/gi,
  /(Samsung Electronics[^.,]{0,30})/gi,
  /(Micron Technology[^.,]{0,30})/gi,
  /(ASML[^.,]{0,30})/gi,
  /(Applied Materials[^.,]{0,30})/gi,
  /(Lam Research[^.,]{0,30})/gi,
  /(Synopsys[^.,]{0,30})/gi,
  /(Cadence[^.,]{0,30})/gi,
];

const RELATION_PATTERNS = [
  { type: 'supplies_to', re: /([A-Z][A-Za-z0-9\s&]+(?:Inc\.?|Corp\.?|Ltd\.?)?)\s+(?:supplies|provides|manufactures|fabricates)[^.]{0,60}(?:to|for)\s+([A-Z][A-Za-z0-9\s&]+)/gi },
  { type: 'sources_from', re: /(?:source|purchase|obtain)[^.]{0,40}from\s+([A-Z][A-Za-z0-9\s&]+(?:Inc\.?|Corp\.?|Ltd\.?)?)/gi },
  { type: 'depends_on', re: /depend[^.]{0,40}(?:on|upon)\s+([A-Z][A-Za-z0-9\s&]+(?:Inc\.?|Corp\.?|Ltd\.?)?)/gi },
];

export function extractEntities(text, sourceMeta = {}) {
  const vendorHits = new Map();
  const relations = [];
  const concentrations = [];

  for (const pattern of VENDOR_PATTERNS) {
    let m;
    while ((m = pattern.exec(text)) !== null) {
      const raw = m[1].trim().replace(/\s+/g, ' ').slice(0, 80);
      if (raw.length < 3 || /^(We|Our|The|A|An|If|Any|All|One|Two|Many|Certain)\b/.test(raw)) continue;
      const canonical = canonicalize(raw);
      const prev = vendorHits.get(canonical) ?? { name: canonical, count: 0, snippets: [], sources: [] };
      prev.count++;
      if (prev.snippets.length < 3) {
        const start = Math.max(0, m.index - 60);
        prev.snippets.push(text.slice(start, m.index + m[0].length + 60).trim());
      }
      prev.sources.push(sourceMeta.chunkId ?? sourceMeta.sectionId ?? 'document');
      vendorHits.set(canonical, prev);
    }
  }

  for (const { type, re } of RELATION_PATTERNS) {
    let m;
    while ((m = re.exec(text)) !== null) {
      const from = canonicalize(m[1]?.trim() ?? m[0]);
      const to = m[2] ? canonicalize(m[2].trim()) : null;
      if (from && from.length > 2) {
        relations.push({ type, from, to, snippet: m[0].slice(0, 200), ...sourceMeta });
      }
    }
  }

  const concRe = /(\d{1,3})\s*%\s*of[^.]{0,80}(?:from|to|supplied by|attributable to)\s+([^.]{5,80})/gi;
  let cm;
  while ((cm = concRe.exec(text)) !== null) {
    concentrations.push({ pct: parseInt(cm[1], 10), entity: canonicalize(cm[2].trim()), snippet: cm[0].slice(0, 150) });
  }

  return {
    vendors: [...vendorHits.values()].sort((a, b) => b.count - a.count),
    relations,
    concentrations,
  };
}

export function processFiling({ html, metadata, facts }) {
  const text = htmlToText(html);
  const sections = extractSections(text);
  const allChunks = [];

  for (const section of sections) {
    const sectionChunks = chunkText(section.text, {
      ticker: metadata.ticker,
      form: metadata.filing?.form,
      filingDate: metadata.filing?.filingDate,
      sectionId: section.id,
      sectionHeader: section.header,
    });
    allChunks.push(...sectionChunks);
  }

  const mergedEntities = { vendors: new Map(), relations: [], concentrations: [] };

  for (const chunk of allChunks) {
    const ent = extractEntities(chunk.text, { chunkId: chunk.id, ticker: metadata.ticker });
    for (const v of ent.vendors) {
      const prev = mergedEntities.vendors.get(v.name) ?? { ...v, count: 0, snippets: [], sources: [] };
      prev.count += v.count;
      prev.snippets.push(...v.snippets);
      prev.sources.push(...v.sources);
      mergedEntities.vendors.set(v.name, prev);
    }
    mergedEntities.relations.push(...ent.relations);
    mergedEntities.concentrations.push(...ent.concentrations);
  }

  const fullDocEntities = extractEntities(text, { sectionId: 'full', ticker: metadata.ticker });
  for (const v of fullDocEntities.vendors) {
    const prev = mergedEntities.vendors.get(v.name) ?? { ...v, count: 0, snippets: [], sources: [] };
    prev.count += v.count;
    mergedEntities.vendors.set(v.name, prev);
  }

  return {
    text,
    sections,
    chunks: allChunks,
    entities: {
      vendors: [...mergedEntities.vendors.values()]
        .map((v) => ({ ...v, snippets: [...new Set(v.snippets)].slice(0, 5), sources: [...new Set(v.sources)] }))
        .sort((a, b) => b.count - a.count),
      relations: mergedEntities.relations.slice(0, 100),
      concentrations: mergedEntities.concentrations.slice(0, 50),
    },
    facts: facts ?? {},
    metadata,
  };
}
