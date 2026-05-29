/**
 * Minimal RPC bridge for module web workers.
 * @param {new () => Worker} WorkerCtor Vite worker constructor (`?worker` import).
 */
export function createWorkerBridge(WorkerCtor) {
  /** @type {Worker | null} */
  let worker = null;
  let seq = 0;
  /** @type {Map<number, { resolve: (v: unknown) => void, reject: (e: Error) => void }>} */
  const pending = new Map();

  function ensureWorker() {
    if (worker) return worker;
    worker = new WorkerCtor();
    worker.onmessage = (event) => {
      const { id, ok, result, error } = event.data ?? {};
      const job = pending.get(id);
      if (!job) return;
      pending.delete(id);
      if (ok) job.resolve(result);
      else job.reject(new Error(error || 'Worker task failed'));
    };
    worker.onerror = (event) => {
      for (const job of pending.values()) job.reject(new Error(event.message || 'Worker error'));
      pending.clear();
      worker?.terminate();
      worker = null;
    };
    return worker;
  }

  /**
   * @param {string} type
   * @param {unknown} [payload]
   * @param {Transferable[]} [transfer]
   */
  function call(type, payload, transfer) {
    return new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, { resolve, reject });
      ensureWorker().postMessage({ id, type, payload }, transfer ?? []);
    });
  }

  function terminate() {
    for (const job of pending.values()) job.reject(new Error('Worker terminated'));
    pending.clear();
    worker?.terminate();
    worker = null;
  }

  return { call, terminate };
}
