/**
 * Raster fallback for PDF export when vector embedding fails.
 */

/**
 * @param {{ svg: string, width: number, height: number, background: string, scale: number }} payload
 */
export async function rasterizeSvgOnMainThread(payload) {
  const { svg, width, height, background, scale } = payload;
  const pixelW = Math.max(1, Math.round(width * scale));
  const pixelH = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = pixelW;
  canvas.height = pixelH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  if (background && background !== 'transparent') {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, pixelW, pixelH);
  }

  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Could not decode export SVG'));
      img.src = url;
    });
    ctx.drawImage(img, 0, 0, pixelW, pixelH);
  } finally {
    URL.revokeObjectURL(url);
  }

  const pngBlob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encode failed'))), 'image/png');
  });

  return {
    buffer: await pngBlob.arrayBuffer(),
    logicalWidth: width,
    logicalHeight: height,
    scale,
  };
}
