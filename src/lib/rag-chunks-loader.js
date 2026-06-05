/**
 * Load RAG chunk entries — parallel shard fetch when manifest lists shardUrls.
 * @param {object} manifest
 * @param {{ ragRoot?: string }} [opts]
 */
export async function fetchRagChunkEntries(manifest, opts = {}) {
  const shardUrls = manifest?.shardUrls;
  if (shardUrls && typeof shardUrls === 'object' && Object.keys(shardUrls).length) {
    const payloads = await Promise.all(
      Object.values(shardUrls).map(async (url) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`RAG shard missing: ${url}`);
        return res.json();
      }),
    );
    return payloads.flatMap((payload) => payload.entries ?? []);
  }

  const fallback = `${opts.ragRoot ?? '/rag'}/chunks.json`;
  const chunksUrl = manifest?.chunksUrl ?? fallback;
  const res = await fetch(chunksUrl);
  if (!res.ok) throw new Error('RAG static index missing — run the topic pipeline');
  const chunksData = await res.json();
  return chunksData.entries ?? [];
}
