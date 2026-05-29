/** Lightweight performance marks for dev profiling (no-op in production). */

const enabled = typeof import.meta !== 'undefined' && import.meta.env?.DEV;

/**
 * @param {string} name
 * @param {() => T | Promise<T>} fn
 * @returns {Promise<T>}
 * @template T
 */
export async function measureAsync(name, fn) {
  if (!enabled || typeof performance === 'undefined') return fn();
  performance.mark(`${name}:start`);
  try {
    return await fn();
  } finally {
    performance.mark(`${name}:end`);
    performance.measure(name, `${name}:start`, `${name}:end`);
    const entry = performance.getEntriesByName(name).at(-1);
    if (entry) console.debug(`[perf] ${name}: ${entry.duration.toFixed(1)}ms`);
  }
}

/**
 * @param {string} name
 * @param {() => T} fn
 * @returns {T}
 * @template T
 */
export function measureSync(name, fn) {
  if (!enabled || typeof performance === 'undefined') return fn();
  performance.mark(`${name}:start`);
  try {
    return fn();
  } finally {
    performance.mark(`${name}:end`);
    performance.measure(name, `${name}:start`, `${name}:end`);
    const entry = performance.getEntriesByName(name).at(-1);
    if (entry) console.debug(`[perf] ${name}: ${entry.duration.toFixed(1)}ms`);
  }
}

/** @param {() => void} fn @param {{ timeout?: number }} [opts] */
export function runWhenIdle(fn, opts = {}) {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(fn, { timeout: opts.timeout ?? 4000 });
    return;
  }
  setTimeout(fn, 1);
}
