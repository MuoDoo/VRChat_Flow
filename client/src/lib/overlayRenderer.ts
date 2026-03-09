/**
 * Render translated text to an RGBA pixel buffer for SteamVR overlay.
 * Supports rendering multiple stacked messages (up to 3).
 */

const OVERLAY_WIDTH = 512;
const FONT_SIZE = 24;
const PADDING = 12;
const LINE_GAP = 6;
const MESSAGE_GAP = 10;
const BG_COLOR = "rgba(20, 20, 40, 0.85)";
const TEXT_COLOR = "#ffffff";
const TRANSLATION_COLOR = "#5dade2";

let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;

export interface OverlayMessage {
  transcription: string;
  translation: string;
}

function messageBlockHeight(): number {
  return FONT_SIZE + LINE_GAP + FONT_SIZE;
}

function computeCanvasHeight(count: number): number {
  const block = messageBlockHeight();
  return PADDING * 2 + count * block + Math.max(0, count - 1) * MESSAGE_GAP;
}

function ensureCanvas(width: number, height: number) {
  if (!canvas || canvas.width !== width || canvas.height !== height) {
    canvas = new OffscreenCanvas(width, height);
    ctx = canvas.getContext("2d")!;
  }
}

/**
 * Render one or more transcription+translation pairs and return RGBA pixel buffer.
 */
export function renderOverlayMessages(
  messages: OverlayMessage[]
): { buffer: ArrayBuffer; width: number; height: number } {
  const count = messages.length;
  if (count === 0) {
    const empty = new OffscreenCanvas(1, 1);
    const ec = empty.getContext("2d")!;
    const id = ec.getImageData(0, 0, 1, 1);
    return { buffer: id.data.buffer, width: 1, height: 1 };
  }

  const w = OVERLAY_WIDTH;
  const h = computeCanvasHeight(count);
  ensureCanvas(w, h);
  const c = ctx!;

  c.clearRect(0, 0, w, h);

  // Rounded rect background
  c.fillStyle = BG_COLOR;
  c.beginPath();
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

  const font = `${FONT_SIZE}px "Segoe UI", "Microsoft YaHei", "Noto Sans CJK SC", "Hiragino Sans", system-ui, sans-serif`;
  c.font = font;
  c.textBaseline = "top";
  const maxTextWidth = w - PADDING * 2;
  const block = messageBlockHeight();

  for (let i = 0; i < count; i++) {
    const msg = messages[i];
    const yBase = PADDING + i * (block + MESSAGE_GAP);

    // Separator line between messages
    if (i > 0) {
      c.strokeStyle = "rgba(255, 255, 255, 0.15)";
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(PADDING, yBase - MESSAGE_GAP / 2);
      c.lineTo(w - PADDING, yBase - MESSAGE_GAP / 2);
      c.stroke();
    }

    // Transcription (original text)
    c.fillStyle = TEXT_COLOR;
    c.fillText(truncateText(c, msg.transcription, maxTextWidth), PADDING, yBase);

    // Translation
    c.fillStyle = TRANSLATION_COLOR;
    c.fillText(
      truncateText(c, msg.translation, maxTextWidth),
      PADDING,
      yBase + FONT_SIZE + LINE_GAP
    );
  }

  const imageData = c.getImageData(0, 0, w, h);
  return { buffer: imageData.data.buffer, width: w, height: h };
}

function truncateText(
  ctx: OffscreenCanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (
    truncated.length > 0 &&
    ctx.measureText(truncated + "...").width > maxWidth
  ) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + "...";
}
