/** Lazy-load MiniLM in browser to embed search queries offline */

const MODEL = 'Xenova/all-MiniLM-L6-v2';

/** @type {Promise<(text: string, opts?: object) => Promise<{ data: Float32Array }>> | null} */
let pipelinePromise = null;
let loadError = null;

export async function embedQuery(text) {
  if (loadError) throw loadError;
  try {
    if (!pipelinePromise) {
      pipelinePromise = (async () => {
        const { pipeline, env } = await import('@xenova/transformers');
        env.allowLocalModels = false;
        env.useBrowserCache = true;
        return pipeline('feature-extraction', MODEL);
      })();
    }
    const pipe = await pipelinePromise;
    const out = await pipe(text.slice(0, 512), { pooling: 'mean', normalize: true });
    return new Float32Array(out.data);
  } catch (err) {
    loadError = err;
    throw err;
  }
}

export function resetEmbedQueryCache() {
  pipelinePromise = null;
  loadError = null;
}
