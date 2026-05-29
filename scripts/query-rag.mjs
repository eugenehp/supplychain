#!/usr/bin/env node
/** CLI: query the RAG index */
import { queryRag, findVendorsForProduct } from './lib/rag-query.mjs';
import { getIndexStats, closeDb } from './lib/rag-store.mjs';

const [,, cmd, ...rest] = process.argv;
const query = rest.join(' ') || 'TSMC Hynix supplier foundry HBM';

try {
  if (cmd === 'stats') {
    console.log(JSON.stringify(getIndexStats(), null, 2));
  } else if (cmd === 'vendors') {
    console.log(JSON.stringify(findVendorsForProduct(query), null, 2));
  } else {
    console.log(JSON.stringify(queryRag(query || cmd), null, 2));
  }
} finally {
  closeDb();
}
