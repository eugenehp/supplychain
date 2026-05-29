const DEFAULT_OFFSET = { x: 14, y: 12 };
const VIEWPORT_PAD = 8;

/** Viewport cursor position for fixed-position tooltips. */
export function pointerViewport(event) {
  return { x: event.clientX, y: event.clientY };
}

/** Keep tooltip near cursor but inside the viewport. */
export function clampTooltipPosition(
  cursorX,
  cursorY,
  width,
  height,
  { offsetX = DEFAULT_OFFSET.x, offsetY = DEFAULT_OFFSET.y, pad = VIEWPORT_PAD } = {},
) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = cursorX + offsetX;
  let top = cursorY + offsetY;

  if (left + width > vw - pad) {
    left = cursorX - width - offsetX;
  }
  if (top + height > vh - pad) {
    top = cursorY - height - offsetY;
  }
  if (left < pad) left = pad;
  if (top < pad) top = pad;

  return { left, top };
}
