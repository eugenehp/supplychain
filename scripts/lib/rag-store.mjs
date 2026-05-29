import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { PATHS } from './paths.mjs';

let dbInstance = null;

export function getDb() {
  if (dbInstance) return dbInstance;
  mkdirSync(dirname(PATHS.ragDb), { recursive: true });
  dbInstance = new Database(PATHS.ragDb);
  dbInstance.pragma('journal_mode = WAL');
  initSchema(dbInstance);
  return dbInstance;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      ticker TEXT NOT NULL,
      form TEXT,
      filing_date TEXT,
      section_id TEXT,
      section_header TEXT,
      char_start INTEGER,
      char_end INTEGER,
      text TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
      text,
      ticker,
      section_id,
      section_header,
      content='documents',
      content_rowid='rowid',
      tokenize='porter unicode61'
    );

    CREATE TABLE IF NOT EXISTS vendors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      canonical_name TEXT NOT NULL,
      ticker TEXT,
      mention_count INTEGER DEFAULT 0,
      snippets TEXT,
      chunk_ids TEXT,
      UNIQUE(canonical_name, ticker)
    );

    CREATE TABLE IF NOT EXISTS query_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT,
      result_count INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS evidence (
      id TEXT PRIMARY KEY,
      ticker TEXT NOT NULL,
      vendor TEXT,
      excerpt TEXT NOT NULL,
      section_header TEXT,
      char_offset INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS evidence_fts USING fts5(
      excerpt,
      vendor,
      ticker,
      section_header,
      content='evidence',
      content_rowid='rowid',
      tokenize='porter unicode61'
    );

    CREATE TABLE IF NOT EXISTS evidence_embeddings (
      id TEXT PRIMARY KEY,
      vector BLOB NOT NULL,
      dim INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS document_embeddings (
      id TEXT PRIMARY KEY,
      vector BLOB NOT NULL,
      dim INTEGER NOT NULL
    );
  `);
}

export function clearRagIndex() {
  const db = getDb();
  db.exec(`DELETE FROM documents; INSERT INTO documents_fts(documents_fts) VALUES('delete-all');`);
  db.exec(`DELETE FROM vendors;`);
  db.exec(`DELETE FROM evidence; INSERT INTO evidence_fts(evidence_fts) VALUES('delete-all');`);
  db.exec(`DELETE FROM evidence_embeddings;`);
  db.exec(`DELETE FROM document_embeddings;`);
}

export function indexChunks(chunks, entities, ticker) {
  const db = getDb();
  const insertDoc = db.prepare(`
    INSERT OR REPLACE INTO documents (id, ticker, form, filing_date, section_id, section_header, char_start, char_end, text)
    VALUES (@id, @ticker, @form, @filingDate, @sectionId, @sectionHeader, @charStart, @charEnd, @text)
  `);

  const insertMany = db.transaction((items) => {
    for (const chunk of items) insertDoc.run(chunk);
  });

  insertMany(chunks.map((c) => ({
    id: c.id,
    ticker: c.ticker ?? ticker,
    form: c.form ?? null,
    filingDate: c.filingDate ?? null,
    sectionId: c.sectionId ?? null,
    sectionHeader: c.sectionHeader ?? null,
    charStart: c.charStart ?? 0,
    charEnd: c.charEnd ?? 0,
    text: c.text,
  })));

  // Rebuild FTS index
  db.exec(`INSERT INTO documents_fts(documents_fts) VALUES('rebuild');`);

  if (entities?.vendors?.length) {
    const insertVendor = db.prepare(`
      INSERT OR REPLACE INTO vendors (canonical_name, ticker, mention_count, snippets, chunk_ids)
      VALUES (@name, @ticker, @count, @snippets, @chunkIds)
    `);
    for (const v of entities.vendors) {
      insertVendor.run({
        name: v.name,
        ticker,
        count: v.count,
        snippets: JSON.stringify(v.snippets ?? []),
        chunkIds: JSON.stringify(v.sources ?? []),
      });
    }
  }

  return chunks.length;
}

export function indexEvidenceEntries(entries = []) {
  const db = getDb();
  db.exec(`DELETE FROM evidence; INSERT INTO evidence_fts(evidence_fts) VALUES('delete-all');`);

  const insert = db.prepare(`
    INSERT OR REPLACE INTO evidence (id, ticker, vendor, excerpt, section_header, char_offset)
    VALUES (@id, @ticker, @vendor, @excerpt, @sectionHeader, @charOffset)
  `);

  const insertMany = db.transaction((items) => {
    for (const entry of items) {
      insert.run({
        id: entry.id,
        ticker: entry.ticker ?? '',
        vendor: entry.vendor ?? null,
        excerpt: entry.excerpt ?? '',
        sectionHeader: entry.sectionHeader ?? null,
        charOffset: entry.charOffset ?? null,
      });
    }
  });

  insertMany(entries);
  db.exec(`INSERT INTO evidence_fts(evidence_fts) VALUES('rebuild');`);
  return entries.length;
}

export function indexEvidenceEmbeddings(entries = [], vectors = []) {
  const db = getDb();
  db.exec(`DELETE FROM evidence_embeddings;`);
  const insert = db.prepare(`
    INSERT OR REPLACE INTO evidence_embeddings (id, vector, dim)
    VALUES (@id, @vector, @dim)
  `);
  const insertMany = db.transaction((items) => {
    for (const { id, vector } of items) {
      insert.run({
        id,
        vector: Buffer.from(vector.buffer, vector.byteOffset, vector.byteLength),
        dim: vector.length,
      });
    }
  });
  insertMany(entries.map((entry, i) => ({ id: entry.id, vector: vectors[i] })));
  return vectors.length;
}

export function indexDocumentEmbeddings(entries = [], vectors = []) {
  const db = getDb();
  db.exec(`DELETE FROM document_embeddings;`);
  const insert = db.prepare(`
    INSERT OR REPLACE INTO document_embeddings (id, vector, dim)
    VALUES (@id, @vector, @dim)
  `);
  const insertMany = db.transaction((items) => {
    for (const { id, vector } of items) {
      insert.run({
        id,
        vector: Buffer.from(vector.buffer, vector.byteOffset, vector.byteLength),
        dim: vector.length,
      });
    }
  });
  insertMany(entries.map((entry, i) => ({ id: entry.id, vector: vectors[i] })));
  return vectors.length;
}

function vectorFromRow(row) {
  return new Float32Array(row.vector.buffer, row.vector.byteOffset, row.dim);
}

function cosineDot(a, b) {
  let dot = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) dot += a[i] * b[i];
  return dot;
}

export function searchEvidenceSemantic(queryVec, { limit = 50, ticker = null, vendor = null } = {}) {
  const db = getDb();
  let sql = `
    SELECT e.id, e.ticker, e.vendor, e.excerpt, e.section_header, e.char_offset, ee.vector, ee.dim
    FROM evidence e
    JOIN evidence_embeddings ee ON e.id = ee.id
    WHERE 1=1
  `;
  const params = [];
  if (ticker) {
    sql += ` AND e.ticker = ?`;
    params.push(ticker.toUpperCase());
  }
  if (vendor) {
    sql += ` AND e.vendor LIKE ?`;
    params.push(`%${vendor}%`);
  }

  const rows = db.prepare(sql).all(...params);
  const scored = rows
    .map((r) => ({
      id: r.id,
      ticker: r.ticker,
      vendor: r.vendor,
      excerpt: r.excerpt,
      sectionHeader: r.section_header,
      charOffset: r.char_offset,
      score: cosineDot(queryVec, vectorFromRow(r)),
    }))
    .filter((r) => r.score > 0.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}

export function searchEvidence(query, { limit = 50, ticker = null, vendor = null } = {}) {
  const db = getDb();
  const ftsQuery = query
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => `"${w.replace(/"/g, '')}"`)
    .join(' OR ');

  let sql = `
    SELECT e.id, e.ticker, e.vendor, e.excerpt, e.section_header, e.char_offset,
           bm25(evidence_fts) AS score
    FROM evidence_fts
    JOIN evidence e ON evidence_fts.rowid = e.rowid
    WHERE evidence_fts MATCH ?
  `;
  const params = [ftsQuery];

  if (ticker) {
    sql += ` AND e.ticker = ?`;
    params.push(ticker.toUpperCase());
  }
  if (vendor) {
    sql += ` AND e.vendor LIKE ?`;
    params.push(`%${vendor}%`);
  }

  sql += ` ORDER BY score LIMIT ?`;
  params.push(limit);

  try {
    return db.prepare(sql).all(...params).map((r) => ({
      id: r.id,
      ticker: r.ticker,
      vendor: r.vendor,
      excerpt: r.excerpt,
      sectionHeader: r.section_header,
      charOffset: r.char_offset,
      score: Math.abs(r.score),
    }));
  } catch {
    const like = `%${query.split(/\s+/)[0]}%`;
    let fallbackSql = `
      SELECT id, ticker, vendor, excerpt, section_header, char_offset, 0 AS score
      FROM evidence
      WHERE excerpt LIKE ?
    `;
    const args = [like];
    if (ticker) {
      fallbackSql += ` AND ticker = ?`;
      args.push(ticker.toUpperCase());
    }
    if (vendor) {
      fallbackSql += ` AND vendor LIKE ?`;
      args.push(`%${vendor}%`);
    }
    fallbackSql += ` LIMIT ?`;
    args.push(limit);
    return db.prepare(fallbackSql).all(...args);
  }
}

export function searchDocuments(query, { limit = 8, ticker = null } = {}) {
  const db = getDb();
  const ftsQuery = query
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => `"${w.replace(/"/g, '')}"`)
    .join(' OR ');

  let sql = `
    SELECT d.id, d.ticker, d.form, d.filing_date, d.section_id, d.section_header,
           snippet(documents_fts, 0, '<mark>', '</mark>', '…', 32) AS snippet,
           bm25(documents_fts) AS score
    FROM documents_fts
    JOIN documents d ON documents_fts.rowid = d.rowid
    WHERE documents_fts MATCH ?
  `;
  const params = [ftsQuery];

  if (ticker) {
    sql += ` AND d.ticker = ?`;
    params.push(ticker.toUpperCase());
  }

  sql += ` ORDER BY score LIMIT ?`;
  params.push(limit);

  try {
    const rows = db.prepare(sql).all(...params);
    db.prepare(`INSERT INTO query_log (query, result_count) VALUES (?, ?)`).run(query, rows.length);
    return rows.map((r) => ({
      id: r.id,
      ticker: r.ticker,
      form: r.form,
      filingDate: r.filing_date,
      sectionId: r.section_id,
      sectionHeader: r.section_header,
      snippet: r.snippet,
      score: r.score,
      text: db.prepare(`SELECT text FROM documents WHERE id = ?`).get(r.id)?.text,
    }));
  } catch {
    // Fallback: LIKE search if FTS query fails
    const like = `%${query.split(/\s+/)[0]}%`;
    const fallbackSql = ticker
      ? `SELECT id, ticker, form, filing_date, section_id, section_header, substr(text, 1, 300) AS snippet, 0 AS score, text FROM documents WHERE text LIKE ? AND ticker = ? LIMIT ?`
      : `SELECT id, ticker, form, filing_date, section_id, section_header, substr(text, 1, 300) AS snippet, 0 AS score, text FROM documents WHERE text LIKE ? LIMIT ?`;
    const args = ticker ? [like, ticker.toUpperCase(), limit] : [like, limit];
    return db.prepare(fallbackSql).all(...args);
  }
}

export function searchVendors(query, { limit = 20 } = {}) {
  const db = getDb();
  const like = `%${query}%`;
  return db.prepare(`
    SELECT canonical_name, ticker, mention_count, snippets, chunk_ids
    FROM vendors
    WHERE canonical_name LIKE ? OR snippets LIKE ?
    ORDER BY mention_count DESC
    LIMIT ?
  `).all(like, like, limit);
}

export function getIndexStats() {
  const db = getDb();
  return {
    documents: db.prepare(`SELECT COUNT(*) AS n FROM documents`).get().n,
    evidence: db.prepare(`SELECT COUNT(*) AS n FROM evidence`).get().n,
    evidenceEmbeddings: db.prepare(`SELECT COUNT(*) AS n FROM evidence_embeddings`).get().n,
    documentEmbeddings: db.prepare(`SELECT COUNT(*) AS n FROM document_embeddings`).get().n,
    vendors: db.prepare(`SELECT COUNT(*) AS n FROM vendors`).get().n,
    tickers: db.prepare(`SELECT DISTINCT ticker FROM documents`).all().map((r) => r.ticker),
    queries: db.prepare(`SELECT COUNT(*) AS n FROM query_log`).get().n,
  };
}

export function getAllVendors() {
  const db = getDb();
  return db.prepare(`
    SELECT canonical_name, ticker, mention_count, snippets, chunk_ids
    FROM vendors ORDER BY mention_count DESC
  `).all().map((r) => ({
    name: r.canonical_name,
    ticker: r.ticker,
    mentionCount: r.mention_count,
    snippets: JSON.parse(r.snippets ?? '[]'),
    chunkIds: JSON.parse(r.chunk_ids ?? '[]'),
  }));
}

export function getDocumentById(id) {
  const db = getDb();
  return db.prepare(`SELECT * FROM documents WHERE id = ?`).get(id);
}

export function closeDb() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
