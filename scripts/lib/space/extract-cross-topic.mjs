/**
 * Cross-topic vendor join.
 *
 * The auto-extracted vendors.json on the space side is noisy (filing-processor's
 * regex patterns were tuned for accelerator names). For a reliable join we scan
 * both corpora directly for a curated list of canonical supplier names and count
 * mentions in each. Any name with non-trivial hits in BOTH corpora ships.
 *
 * Output: static/<topic>/cross-topic/shared-vendors.json
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PATHS, topicStaticDir } from '../paths.mjs';

/**
 * Curated cross-domain suppliers — companies that legitimately appear in both
 * AI accelerator filings and space-company filings. Each entry has a canonical
 * label and a regex tuned to catch common variants while rejecting overlaps
 * with unrelated terms.
 */
const CANONICAL_SUPPLIERS = [
  { label: 'TSMC (Taiwan Semiconductor)', category: 'Foundry', pattern: /\b(?:TSMC|Taiwan Semiconductor(?: Manufacturing)?)\b/g },
  { label: 'Samsung Electronics', category: 'Foundry/Memory', pattern: /\bSamsung(?:\s+(?:Electronics|Foundry|Semiconductor))?\b/g },
  { label: 'GlobalFoundries', category: 'Foundry', pattern: /\bGlobal\s*Foundries\b|\bGlobalFoundries\b/g },
  { label: 'SK Hynix', category: 'Memory', pattern: /\bSK\s*Hynix\b/g },
  { label: 'Micron Technology', category: 'Memory', pattern: /\bMicron(?:\s+Technology)?\b/g },
  { label: 'ASML', category: 'Lithography', pattern: /\bASML\b/g },
  { label: 'Applied Materials', category: 'Fab equipment', pattern: /\bApplied\s+Materials\b/g },
  { label: 'Lam Research', category: 'Fab equipment', pattern: /\bLam\s+Research\b/g },
  { label: 'KLA Corporation', category: 'Fab equipment', pattern: /\bKLA(?:\s+Corporation)?\b/g },
  { label: 'Synopsys', category: 'EDA', pattern: /\bSynopsys\b/g },
  { label: 'Cadence Design', category: 'EDA', pattern: /\bCadence(?:\s+Design)?\b/g },
  { label: 'Amkor Technology', category: 'OSAT', pattern: /\bAmkor(?:\s+Technology)?\b/g },
  { label: 'BAE Systems', category: 'Defense electronics', pattern: /\bBAE\s+Systems\b/g },
  { label: 'Honeywell', category: 'Defense electronics', pattern: /\bHoneywell\b/g },
  { label: 'Northrop Grumman', category: 'Defense prime', pattern: /\bNorthrop\s+Grumman\b/g },
  { label: 'Lockheed Martin', category: 'Defense prime', pattern: /\bLockheed\s+Martin\b/g },
  { label: 'Boeing', category: 'Defense prime', pattern: /\bBoeing\b/g },
  { label: 'Raytheon / RTX', category: 'Defense prime', pattern: /\b(?:Raytheon|RTX\s+Corporation)\b/g },
  { label: 'L3Harris', category: 'Defense electronics', pattern: /\bL3\s*Harris\b/g },
  { label: 'Microchip Technology', category: 'Microelectronics', pattern: /\bMicrochip(?:\s+Technology)?\b/g },
  { label: 'Wolfspeed', category: 'SiC / power', pattern: /\bWolfspeed\b/g },
  { label: 'Texas Instruments', category: 'Analog/MCU', pattern: /\bTexas\s+Instruments\b/g },
  { label: 'Analog Devices', category: 'Analog', pattern: /\bAnalog\s+Devices\b/g },
  { label: 'Marvell', category: 'Networking ASIC', pattern: /\bMarvell(?:\s+Technology)?\b/g },
  { label: 'STMicroelectronics', category: 'Mixed-signal', pattern: /\bST\s*Microelectronics\b|\bSTMicro\b/g },
  { label: 'Renesas Electronics', category: 'MCU / power', pattern: /\bRenesas(?:\s+Electronics)?\b/g },
  { label: 'Infineon', category: 'Power/automotive', pattern: /\bInfineon\b/g },
  { label: 'NXP Semiconductors', category: 'Automotive/MCU', pattern: /\bNXP(?:\s+Semiconductors)?\b/g },
  { label: 'ON Semiconductor (onsemi)', category: 'Power', pattern: /\bON\s*Semiconductor\b|\bonsemi\b/g },
  { label: 'TE Connectivity', category: 'Connectors', pattern: /\bTE\s+Connectivity\b/g },
  { label: 'Amphenol', category: 'Connectors', pattern: /\bAmphenol\b/g },
  { label: 'TransDigm', category: 'Aerospace components', pattern: /\bTransDigm\b/g },
  { label: 'HEICO', category: 'Aerospace components', pattern: /\bHEICO\b/g },
  { label: 'Linde', category: 'Industrial gases', pattern: /\bLinde\b/g },
  { label: 'Heraeus', category: 'Metals / materials', pattern: /\bHeraeus\b/g },
];

function loadShardTexts(shardsDir) {
  if (!existsSync(shardsDir)) return [];
  const files = readdirSync(shardsDir).filter((f) => f.endsWith('.json'));
  const out = [];
  for (const file of files) {
    try {
      const payload = JSON.parse(readFileSync(join(shardsDir, file), 'utf8'));
      const shardKey = payload.shard ?? payload.ticker ?? file.replace(/\.json$/, '');
      for (const entry of payload.entries ?? []) {
        out.push({
          shard: shardKey,
          ticker: entry.ticker ?? null,
          text: entry.text ?? '',
        });
      }
    } catch {
      /* skip malformed shard */
    }
  }
  return out;
}

function tally(entries, pattern) {
  const re = new RegExp(pattern.source, pattern.flags);
  let mentions = 0;
  /** @type {Map<string, { count: number, sampleText: string }>} */
  const byShard = new Map();
  for (const entry of entries) {
    if (!entry.text) continue;
    re.lastIndex = 0;
    const matches = entry.text.match(re);
    if (!matches?.length) continue;
    mentions += matches.length;
    const key = entry.shard;
    const prev = byShard.get(key) ?? { count: 0, sampleText: '' };
    prev.count += matches.length;
    if (!prev.sampleText) {
      // Find the first occurrence and capture context.
      const m = re.exec(entry.text);
      if (m) {
        const start = Math.max(0, m.index - 120);
        const end = Math.min(entry.text.length, m.index + 200);
        let snippet = entry.text.slice(start, end).replace(/\s+/g, ' ').trim();
        if (start > 0) snippet = '…' + snippet;
        if (end < entry.text.length) snippet = snippet + '…';
        prev.sampleText = snippet;
      }
    }
    byShard.set(key, prev);
  }
  return { mentions, byShard };
}

export function extractCrossTopicSharedVendors({ topicId }) {
  const accelShardsDir = join(PATHS.staticRag, 'shards');
  const spaceShardsDir = join(topicStaticDir(topicId), 'rag', 'shards');

  const accelEntries = loadShardTexts(accelShardsDir);
  const spaceEntries = loadShardTexts(spaceShardsDir);

  if (!accelEntries.length || !spaceEntries.length) {
    return { error: 'Missing accel or space RAG shards' };
  }

  const shared = [];
  for (const supplier of CANONICAL_SUPPLIERS) {
    const accel = tally(accelEntries, supplier.pattern);
    const space = tally(spaceEntries, supplier.pattern);
    if (accel.mentions === 0 || space.mentions === 0) continue;

    const accelFilers = [...accel.byShard.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .map(([k, v]) => ({ shard: k, count: v.count }));
    const spaceFilers = [...space.byShard.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .map(([k, v]) => ({ shard: k, count: v.count }));
    const sampleSpace = [...space.byShard.values()].find((v) => v.sampleText)?.sampleText ?? null;
    const sampleAccel = [...accel.byShard.values()].find((v) => v.sampleText)?.sampleText ?? null;

    shared.push({
      label: supplier.label,
      category: supplier.category,
      pattern: supplier.pattern.source,
      accelerator: {
        mentions: accel.mentions,
        filerCount: accel.byShard.size,
        topFilers: accelFilers.slice(0, 5),
        sample: sampleAccel,
      },
      space: {
        mentions: space.mentions,
        filerCount: space.byShard.size,
        topFilers: spaceFilers.slice(0, 5),
        sample: sampleSpace,
      },
      totalMentions: accel.mentions + space.mentions,
      jointStrength: Math.min(accel.mentions, space.mentions),
    });
  }

  shared.sort((a, b) => b.jointStrength - a.jointStrength);

  return {
    generatedAt: new Date().toISOString(),
    topicId,
    accelChunkCount: accelEntries.length,
    spaceChunkCount: spaceEntries.length,
    sharedCount: shared.length,
    shared,
  };
}

export function writeCrossTopic({ topicId }) {
  const result = extractCrossTopicSharedVendors({ topicId });
  if (result.error) {
    console.log(`  ✗ ${result.error}`);
    return result;
  }
  const outDir = join(topicStaticDir(topicId), 'cross-topic');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'shared-vendors.json'), JSON.stringify(result, null, 2));
  return result;
}
