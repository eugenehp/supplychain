/** Literal substring / phrase matching with word boundaries for short acronyms */

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function termInText(haystack, term) {
  if (!term) return false;
  const t = term.toLowerCase();
  if (t.length <= 4 && /^[a-z0-9]+$/i.test(term)) {
    const re = new RegExp(`(?<![a-z0-9])${escapeRegex(t)}(?![a-z0-9])`, 'i');
    return re.test(haystack);
  }
  return haystack.toLowerCase().includes(t);
}

export function parseExactQuery(query) {
  const trimmed = query.trim();
  const quoted = trimmed.match(/^"(.+)"$/);
  if (quoted) {
    return { type: 'phrase', terms: [quoted[1]], phrase: quoted[1] };
  }
  const terms = trimmed.split(/\s+/).filter(Boolean);
  return { type: 'all', terms, phrase: trimmed };
}

export function matchesExact(text, query) {
  if (!text || !query?.trim()) return false;
  const { type, terms, phrase } = parseExactQuery(query);
  if (type === 'phrase') return termInText(text, phrase);
  return terms.every((t) => termInText(text, t));
}

export function scoreExactMatch(text, query) {
  const { type, terms, phrase } = parseExactQuery(query);
  if (type === 'phrase') {
    const re = new RegExp(`(?<![a-z0-9])${escapeRegex(phrase.toLowerCase())}(?![a-z0-9])`, 'i');
    const match = re.exec(text);
    return match ? 1000 - Math.min(match.index, 999) : 0;
  }
  if (!terms.every((t) => termInText(text, t))) return 0;

  let score = 100;
  const lower = text.toLowerCase();
  const fullPhrase = phrase.toLowerCase();
  if (fullPhrase.length > 1 && lower.includes(fullPhrase)) score += 500;

  for (const term of terms) {
    const re = new RegExp(`(?<![a-z0-9])${escapeRegex(term.toLowerCase())}(?![a-z0-9])`, 'i');
    const match = re.exec(text);
    if (match) score += 20 - Math.min(match.index / 50, 19);
  }
  return score;
}

export function rankByExactMatch(query, entries, { getText, limit = 400 } = {}) {
  const textFor = getText ?? ((e) => e.text ?? e.excerpt ?? '');

  const ranked = entries
    .map((entry) => {
      const text = textFor(entry);
      const score = scoreExactMatch(text, query);
      return { entry, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (!ranked.length) return [];
  const maxScore = ranked[0].score;
  return ranked.map((r) => ({ ...r, maxScore }));
}

export function exactHighlightTerms(query) {
  const { type, terms, phrase } = parseExactQuery(query);
  if (type === 'phrase') return [phrase];
  return terms;
}
