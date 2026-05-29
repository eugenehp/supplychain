/** Standard SEC item titles for display navigation */

export const FORM_10K_ITEMS = {
  '1': 'Business',
  '1A': 'Risk Factors',
  '1B': 'Unresolved Staff Comments',
  '1C': 'Cybersecurity',
  '2': 'Properties',
  '3': 'Legal Proceedings',
  '4': 'Mine Safety Disclosures',
  '5': "Market for Registrant's Common Equity",
  '6': 'Reserved',
  '7': "Management's Discussion and Analysis",
  '7A': 'Quantitative and Qualitative Disclosures About Market Risk',
  '8': 'Financial Statements and Supplementary Data',
  '9': 'Changes in and Disagreements with Accountants',
  '9A': 'Controls and Procedures',
  '9B': 'Other Information',
  '9C': 'Disclosure Regarding Foreign Jurisdictions',
  '10': 'Directors, Executive Officers and Corporate Governance',
  '11': 'Executive Compensation',
  '12': 'Security Ownership of Certain Beneficial Owners',
  '13': 'Certain Relationships and Related Transactions',
  '14': 'Principal Accountant Fees and Services',
  '15': 'Exhibits and Financial Statement Schedules',
  '16': 'Form 10-K Summary',
};

export const FORM_20F_ITEMS = {
  '1': 'Identity of Directors, Senior Management and Advisers',
  '2': 'Offer Statistics and Expected Timetable',
  '3': 'Key Information',
  '4': 'Information on the Company',
  '4A': 'Unresolved Staff Comments',
  '5': 'Operating and Financial Review and Prospects',
  '6': 'Directors, Senior Management and Employees',
  '7': 'Major Shareholders and Related Party Transactions',
  '8': 'Financial Information',
  '9': 'The Offer and Listing',
  '10': 'Additional Information',
  '11': 'Quantitative and Qualitative Disclosures About Market Risk',
  '12': 'Description of Securities Other than Equity Securities',
  '15': 'Controls and Procedures',
  '16K': 'Cybersecurity',
  '17': 'Financial Statements',
  '18': 'Financial Statements',
  '19': 'Exhibits',
};

const TWENTY_F_HEADINGS = [
  { item: '3', title: 'Key Information', re: /\b(?:ITEM\s+3\.?\s+)?Key Information\b/gi },
  { item: '4', title: 'Information on the Company', re: /\b(?:ITEM\s+4\.?\s+)?Information on the Company\b/gi },
  { item: '5', title: 'Operating and Financial Review and Prospects', re: /\bOperating and Financial Review(?: and Prospects)?\b/gi },
  { item: '6', title: 'Directors, Senior Management and Employees', re: /\bDirectors, Senior Management and Employees\b/gi },
  { item: '8', title: 'Financial Information', re: /\bFinancial Information\b/gi },
  { item: '1A', title: 'Risk Factors', re: /\bRisk Factors\b/gi },
  { item: '15', title: 'Controls and Procedures', re: /\bControls and Procedures\b/gi },
  { item: '16K', title: 'Cybersecurity', re: /\bCybersecurity\b/gi },
  { item: '11', title: 'Quantitative and Qualitative Disclosures About Market Risk', re: /\bQuantitative and Qualitative Disclosures About Market Risk\b/gi },
];

function itemTitle(itemNum, form) {
  const map = /20-?F/i.test(form ?? '') ? FORM_20F_ITEMS : FORM_10K_ITEMS;
  return map[itemNum] ?? null;
}

function isTocSpan(text) {
  const head = text.slice(0, 500);
  if (/table of contents/i.test(head)) return true;
  const itemRefs = (text.match(/\b(?:Item|ITEM)\s+\d+[A-Z]?\./g) ?? []).length;
  if (text.length < 900 && itemRefs >= 3) return true;
  if (text.length < 200) return true;
  const alpha = (text.match(/[a-zA-Z]/g)?.length ?? 0) / Math.max(text.length, 1);
  if (text.length < 400 && alpha < 0.5) return true;
  return false;
}

function isAuditorBoilerplate(text) {
  return /Our responsibility is to express opinions on the Company/i.test(text.slice(0, 600));
}

function findItemMatches(text) {
  const re = /\b(?:Item|ITEM)\s+(\d+[A-Z]?)\.\s+/g;
  const matches = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    matches.push({ index: m.index, itemNum: m[1].toUpperCase(), source: 'item' });
  }
  return matches;
}

function find20FHeadingMatches(text) {
  const matches = [];
  for (const h of TWENTY_F_HEADINGS) {
    h.re.lastIndex = 0;
    let m;
    while ((m = h.re.exec(text)) !== null) {
      matches.push({ index: m.index, itemNum: h.item, title: h.title, source: 'heading' });
    }
  }
  return matches;
}

function findPartMatches(text) {
  const re = /\b(?:PART|Part)\s+([IVXLC]+)\b/g;
  const matches = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    matches.push({ index: m.index, itemNum: m[1], title: `Part ${m[1]}`, source: 'part' });
  }
  return matches;
}

function buildSectionsFromAnchors(text, anchors, form) {
  const sorted = [...anchors].sort((a, b) => a.index - b.index);
  const candidates = [];

  for (let i = 0; i < sorted.length; i++) {
    const anchor = sorted[i];
    const start = anchor.index;
    const end = sorted[i + 1]?.index ?? text.length;
    const slice = text.slice(start, end);
    if (isTocSpan(slice) || isAuditorBoilerplate(slice)) continue;

    candidates.push({
      itemNum: anchor.itemNum,
      title: anchor.title ?? itemTitle(anchor.itemNum, form),
      charStart: start,
      charEnd: end,
      length: end - start,
      slice,
      source: anchor.source,
    });
  }

  const bestByItem = new Map();
  for (const c of candidates) {
    const key = c.itemNum;
    const prev = bestByItem.get(key);
    if (!prev || c.length > prev.length) bestByItem.set(key, c);
  }

  return [...bestByItem.values()]
    .filter((c) => c.length >= 350 || ['1', '1A', '3', '4', '5', '7', '8'].includes(c.itemNum))
    .sort((a, b) => a.charStart - b.charStart)
    .map((c) => {
      const title = c.title ?? itemTitle(c.itemNum, form) ?? `Item ${c.itemNum}`;
      const header = c.source === 'part' ? c.title : `Item ${c.itemNum}. ${title}`;
      return {
        id: c.source === 'part' ? `part_${c.itemNum.toLowerCase()}` : `item_${c.itemNum.toLowerCase()}`,
        item: c.itemNum,
        title,
        header,
        charStart: c.charStart,
        charEnd: c.charEnd,
        length: c.length,
        type: c.source === 'part' ? 'part' : 'item',
      };
    });
}

/**
 * Extract display-ready SEC sections with char offsets into cleaned filing text.
 */
export function extractDisplaySections(text, form = '10-K') {
  const is20F = /20-?F/i.test(form ?? '');
  let anchors = findItemMatches(text);

  if (is20F) {
    anchors = [...anchors, ...find20FHeadingMatches(text), ...findPartMatches(text)];
    // dedupe nearby anchors (within 40 chars)
    anchors.sort((a, b) => a.index - b.index);
    const deduped = [];
    for (const a of anchors) {
      const prev = deduped[deduped.length - 1];
      if (prev && Math.abs(prev.index - a.index) < 40 && prev.itemNum === a.itemNum) continue;
      deduped.push(a);
    }
    anchors = deduped;
  }

  if (anchors.length === 0) {
    return [{ id: 'full_document', item: null, title: 'Full Document', header: 'Full Document', charStart: 0, charEnd: text.length, length: text.length, type: 'full' }];
  }

  const sections = buildSectionsFromAnchors(text, anchors, form);
  return sections.length
    ? sections
    : [{ id: 'full_document', item: null, title: 'Full Document', header: 'Full Document', charStart: 0, charEnd: text.length, length: text.length, type: 'full' }];
}

/** Split section body into formatted blocks for HTML rendering */
export function formatSectionBlocks(text, header) {
  let body = text.trim();
  const headerRe = new RegExp(`^${header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'i');
  body = body.replace(headerRe, '');
  body = body.replace(/^(?:Item|ITEM)\s+\d+[A-Z]?\.?\s+[A-Za-z][^.]{0,120}\.?\s*/i, '');

  const blocks = [];
  const subheaderRe = /([A-Z][A-Z0-9\s\-–—&,\(\)\/\.\':]{10,90})(?=\s+[A-Z][a-z])/g;
  let last = 0;
  const subMatches = [...body.matchAll(subheaderRe)].filter((m) => {
    const t = m[1].trim();
    if (t.length < 12 || t.length > 90) return false;
    if (/^(AND|THE|FOR|NOT|ALL|ANY|OUR|ITS)$/.test(t)) return false;
    const words = t.split(/\s+/);
    if (words.length < 2) return false;
    const upperRatio = (t.match(/[A-Z]/g)?.length ?? 0) / t.length;
    return upperRatio > 0.75;
  });

  if (subMatches.length >= 2) {
    for (const m of subMatches) {
      if (m.index > last) {
        const chunk = body.slice(last, m.index).trim();
        if (chunk) pushParagraphs(blocks, chunk);
      }
      blocks.push({ type: 'subheader', text: m[1].trim() });
      last = m.index + m[0].length;
    }
    if (last < body.length) pushParagraphs(blocks, body.slice(last).trim());
    return blocks.length ? blocks : [{ type: 'paragraph', text: body }];
  }

  pushParagraphs(blocks, body);
  return blocks.length ? blocks : [{ type: 'paragraph', text: body }];
}

function pushParagraphs(blocks, chunk) {
  const normalized = chunk.replace(/\s+/g, ' ').trim();
  if (!normalized) return;

  const sentences = normalized.split(/(?<=[.!?])\s+(?=[A-Z0-9"(\[])/);
  let para = '';
  for (const s of sentences) {
    if (!para) {
      para = s;
    } else if (para.length + s.length > 900) {
      blocks.push({ type: 'paragraph', text: para.trim() });
      para = s;
    } else {
      para += ' ' + s;
    }
  }
  if (para.trim()) blocks.push({ type: 'paragraph', text: para.trim() });
}
