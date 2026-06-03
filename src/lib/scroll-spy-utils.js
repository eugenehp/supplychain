/**
 * Scroll-spy helpers — avoid ResizeObserver ↔ layout ↔ IntersectionObserver feedback loops.
 */

/**
 * @param {HTMLElement} el
 * @param {string} cssVar
 * @param {{ minDelta?: number }} [opts]
 */
export function observeStableHeight(el, cssVar, { minDelta = 2 } = {}) {
  let lastHeight = 0;

  const sync = () => {
    const h = el.offsetHeight;
    if (Math.abs(h - lastHeight) < minDelta) return;
    lastHeight = h;
    document.documentElement.style.setProperty(cssVar, `${h}px`);
  };

  sync();
  const ro = new ResizeObserver(sync);
  ro.observe(el);
  return () => ro.disconnect();
}

/**
 * @param {object} opts
 * @param {() => boolean} opts.isLocked
 * @param {(id: string) => void} opts.onActive
 * @param {() => string} opts.getActive
 * @param {Array<{ id: string }>} opts.sections
 * @param {IntersectionObserverInit} [opts.observerInit]
 */
export function mountDebouncedScrollSpy({
  isLocked,
  onActive,
  getActive,
  sections,
  observerInit = { rootMargin: '-14% 0px -55% 0px', threshold: 0.12 },
}) {
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let debounceId;

  const observer = new IntersectionObserver((entries) => {
    if (isLocked()) return;

    const visible = entries
      .filter((e) => e.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

    const nextId = visible[0]?.target?.id;
    if (!nextId || nextId === getActive()) return;

    clearTimeout(debounceId);
    debounceId = setTimeout(() => {
      if (isLocked()) return;
      if (nextId !== getActive()) onActive(nextId);
    }, 80);
  }, observerInit);

  for (const section of sections) {
    const el = document.getElementById(section.id);
    if (el) observer.observe(el);
  }

  return () => {
    clearTimeout(debounceId);
    observer.disconnect();
  };
}
