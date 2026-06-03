#!/usr/bin/env node
/** @deprecated — use `npm run rag` */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
spawn('node', [join(dir, 'pipeline.mjs'), ...process.argv.slice(2)], { stdio: 'inherit' }).on('exit', process.exit);
