#!/usr/bin/env node
/**
 * Renders Open Graph / Twitter / square social PNGs from SVG sources.
 * Requires: rsvg-convert (brew install librsvg)
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const staticDir = path.join(root, 'static');
const socialDir = path.join(staticDir, 'social');

const RSVG = process.env.RSVG_CONVERT ?? 'rsvg-convert';

/** @type {{ svg: string, out: string, w: number, h: number }[]} */
const exports_ = [
  { svg: 'og-card.svg', out: 'og-image.png', w: 1200, h: 630 },
  { svg: 'og-card.svg', out: 'twitter-image.png', w: 1200, h: 630 },
  { svg: 'square-card.svg', out: 'social-square.png', w: 1200, h: 1200 },
];

function ensureRsvg() {
  const probe = spawnSync(RSVG, ['--version'], { encoding: 'utf8' });
  if (probe.status !== 0) {
    console.error('rsvg-convert not found. Install: brew install librsvg');
    process.exit(1);
  }
}

function renderOne({ svg, out, w, h }) {
  const input = path.join(socialDir, svg);
  const output = path.join(staticDir, out);
  if (!fs.existsSync(input)) {
    console.error(`Missing source: ${input}`);
    process.exit(1);
  }
  const result = spawnSync(
    RSVG,
    ['-w', String(w), '-h', String(h), '-o', output, input],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout || `Failed: ${out}`);
    process.exit(1);
  }
  const stat = fs.statSync(output);
  console.log(`Wrote ${out} (${w}×${h}, ${(stat.size / 1024).toFixed(1)} KB)`);
}

ensureRsvg();
for (const job of exports_) renderOne(job);
console.log('Social images ready in static/');
