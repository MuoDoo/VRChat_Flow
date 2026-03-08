/**
 * Render translated text to an RGBA pixel buffer for SteamVR overlay.
 * Uses OffscreenCanvas (browser API, available in renderer process).
 */

const OVERLAY_WIDTH = 512;
const OVERLAY_HEIGHT = 128;
const FONT_SIZE = 24;
const PADDING = 12;
const BG_COLOR = "rgba(20, 20, 40, 0.85)";
const TEXT_COLOR = "#ffffff";
const TRANSLATION_COLOR = "#5dade2";

let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;

function ensureCanvas() {
  if (canvas) return;
  canvas = new OffscreenCanvas(OVERLAY_WIDTH, OVERLAY_HEIGHT);
  ctx = canvas.getContext("2d")!;
}

/**
 * Render transcription + translation text and return RGBA pixel buffer.
 */
export function renderOverlayText(
  transcription: string,
  translation: string
): { buffer: ArrayBuffer; width: number; height: number } {
  ensureCanvas();
  const c = ctx!;
  const w = OVERLAY_WIDTH;
  const h = OVERLAY_HEIGHT;

  // Clear with semi-transparent dark background
  c.clearRect(0, 0, w, h);
  c.fillStyle = BG_COLOR;
  c.beginPath();
  // Rounded rectangle
  const r = 8;
  c.moveTo(r, 0);
  c.lineTo(w - r, 0);
  c.quadraticCurveTo(w, 0, w, r);
  c.lineTo(w, h - r);
  c.quadraticCurveTo(w, h, w - r, h);
  c.lineTo(r, h);
  c.quadraticCurveTo(0, h, 0, h - r);
  c.lineTo(0, r);
  c.quadraticCurveTo(0, 0, r, 0);
  c.fill();

  // Font setup — use system fonts with CJK fallback
  const font = `${FONT_SIZE}px "Segoe UI", "Microsoft YaHei", "Noto Sans CJK SC", "Hiragino Sans", system-ui, sans-serif`;
  c.font = font;
  c.textBaseline = "top";

  const maxTextWidth = w - PADDING * 2;

  // Draw transcription (original text)
  c.fillStyle = TEXT_COLOR;
  const truncatedTranscription = truncateText(c, transcription, maxTextWidth);
  c.fillText(truncatedTranscription, PADDING, PADDING);

  // Draw translation
  c.fillStyle = TRANSLATION_COLOR;
  const truncatedTranslation = truncateText(c, translation, maxTextWidth);
  c.fillText(truncatedTranslation, PADDING, PADDING + FONT_SIZE + 8);

  // Extract RGBA pixel data
  const imageData = c.getImageData(0, 0, w, h);
  return {
    buffer: imageData.data.buffer,
    width: w,
    height: h,
  };
}

function truncateText(
  ctx: OffscreenCanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(truncated + "...").width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + "...";
}
