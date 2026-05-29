#!/usr/bin/env node
/**
 * RAG query HTTP API for the Svelte UI.
 * GET /api/query?q=suppliers+TSMC
 * GET /api/vendors
 * GET /api/stats
 * GET /api/document/:id
 */
import { createServer } from 'node:http';
import { queryRag, findVendorsForProduct, queryEvidence, queryEvidenceHybrid, embedQueryText } from './lib/rag-query.mjs';
import { getIndexStats, getDocumentById, closeDb } from './lib/rag-store.mjs';

const PORT = Number(process.env.RAG_PORT ?? 3001);

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  try {
    if (url.pathname === '/api/stats') {
      res.end(JSON.stringify(getIndexStats()));
    } else if (url.pathname === '/api/vendors') {
      const q = url.searchParams.get('q') ?? 'H200 GPU semiconductor suppliers';
      res.end(JSON.stringify(findVendorsForProduct(q)));
    } else if (url.pathname === '/api/query') {
      const q = url.searchParams.get('q');
      if (!q) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Missing q parameter' }));
        return;
      }
      const ticker = url.searchParams.get('ticker');
      res.end(JSON.stringify(queryRag(q, { limit: 10, ticker })));
    } else if (url.pathname === '/api/evidence') {
      const q = url.searchParams.get('q');
      if (!q) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Missing q parameter' }));
        return;
      }
      const ticker = url.searchParams.get('ticker');
      const vendor = url.searchParams.get('vendor');
      const mode = url.searchParams.get('mode') ?? 'bm25';
      if (mode === 'hybrid') {
        res.end(JSON.stringify(await queryEvidenceHybrid(q, { ticker, vendor })));
      } else {
        res.end(JSON.stringify(queryEvidence(q, { ticker, vendor })));
      }
    } else if (url.pathname === '/api/embed') {
      const q = url.searchParams.get('q');
      if (!q) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Missing q parameter' }));
        return;
      }
      res.end(JSON.stringify(await embedQueryText(q)));
    } else if (url.pathname.startsWith('/api/document/')) {
      const id = url.pathname.slice('/api/document/'.length);
      const doc = getDocumentById(id);
      if (!doc) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found' }));
        return;
      }
      res.end(JSON.stringify(doc));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  } catch (err) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, () => {
  console.log(`RAG API listening on http://localhost:${PORT}`);
});

process.on('SIGINT', () => {
  closeDb();
  process.exit(0);
});
