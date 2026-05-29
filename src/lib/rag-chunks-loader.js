/**
 * Load RAG chunk entries — parallel shard fetch when manifest lists shardUrls.
 * @param {object} manifest
 */
export async function fetchRagChunkEntries(manifest) {
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

  const chunksUrl = manifest?.chunksUrl ?? '/rag/chunks.json';
  const res = await fetch(chunksUrl);
  if (!res.ok) throw new Error('RAG static index missing — run `npm run pipeline`');
  const chunksData = await res.json();
  return chunksData.entries ?? [];
}
