import dgram from "node:dgram";
import { EventEmitter } from "node:events";

// OSC binary encoding for VRChat chatbox
//
// Ported from RTVT (Tauri/Rust) project. Key details:
// - OSC string: content + \0 terminator, total length padded to 4-byte boundary
// - OSC message: address pattern + type tag string + arguments
// - VRChat /chatbox/input expects: string message, bool immediate (True), bool notify (False)
// - Bool true uses type tag 'T' with no extra data bytes
// - Bool false uses type tag 'F' with no extra data bytes
// - VRChat chatbox limit: ~144 UTF-8 bytes total. Two-line format: "translated\noriginal"
//   ~70 display columns per line, CJK chars = 2 columns each
// - VRChat enforces ~1500ms minimum between chatbox updates

function encodeOscString(str: string): Buffer {
  const strBuf = Buffer.from(str, "utf-8");
  // string + null terminator, padded to 4-byte boundary
  const padded = Math.ceil((strBuf.length + 1) / 4) * 4;
  const buf = Buffer.alloc(padded);
  strBuf.copy(buf);
  return buf;
}

function encodeOscMessage(
  address: string,
  typeTags: string,
  args: Buffer[]
): Buffer {
  const addrBuf = encodeOscString(address);
  const tagBuf = encodeOscString("," + typeTags);
  const totalLen =
    addrBuf.length + tagBuf.length + args.reduce((s, b) => s + b.length, 0);
  const result = Buffer.alloc(totalLen);
  let offset = 0;
  addrBuf.copy(result, offset);
  offset += addrBuf.length;
  tagBuf.copy(result, offset);
  offset += tagBuf.length;
  for (const arg of args) {
    arg.copy(result, offset);
    offset += arg.length;
  }
  return result;
}

// Truncate a UTF-8 string to at most maxBytes bytes without splitting multi-byte chars
function truncateUtf8(str: string, maxBytes: number): string {
  const buf = Buffer.from(str, "utf-8");
  if (buf.length <= maxBytes) return str;
  // Walk backwards to find a valid UTF-8 boundary
  let end = maxBytes;
  while (end > 0 && (buf[end] & 0xc0) === 0x80) {
    end--;
  }
  return buf.subarray(0, end).toString("utf-8");
}

let socket: dgram.Socket | null = null;

export function sendChatbox(
  message: string,
  port: number,
  immediate = true,
  notify = false
): void {
  // VRChat chatbox max ~144 UTF-8 bytes
  const truncated = truncateUtf8(message, 144);

  // Type tags: s=string, T=true, F=false (booleans carry no data bytes)
  let tags = "s";
  tags += immediate ? "T" : "F";
  tags += notify ? "T" : "F";

  const strArg = encodeOscString(truncated);
  // Bool T/F have no argument data — only type tag
  const packet = encodeOscMessage("/chatbox/input", tags, [strArg]);

  if (!socket) {
    socket = dgram.createSocket("udp4");
    socket.unref();
  }

  if (muteSelf) {
    // VRChat is muted — skip sending chatbox message
    return;
  }

  socket.send(packet, 0, packet.length, port, "127.0.0.1", (err) => {
    if (err) console.error("OSC send error:", err);
  });
}

// --- OSC message decoder (for receiving VRChat parameters) ---

/** Read a null-terminated, 4-byte-padded OSC string from buffer at offset. Returns [string, nextOffset]. */
function decodeOscString(buf: Buffer, offset: number): [string, number] {
  const start = offset;
  while (offset < buf.length && buf[offset] !== 0) offset++;
  const str = buf.subarray(start, offset).toString("utf-8");
  // Advance past null terminator + padding to 4-byte boundary
  offset = Math.ceil((offset + 1) / 4) * 4;
  return [str, offset];
}

/** Parse an incoming OSC message. Returns { address, args } or null on failure. */
function parseOscMessage(buf: Buffer): { address: string; args: (boolean | number | string)[] } | null {
  if (buf.length < 4) return null;

  let offset = 0;
  const [address, afterAddr] = decodeOscString(buf, offset);
  offset = afterAddr;

  if (offset >= buf.length || buf[offset] !== 0x2c /* ',' */) return null;
  const [typeTagFull, afterTags] = decodeOscString(buf, offset);
  offset = afterTags;

  const typeTags = typeTagFull.slice(1); // strip leading ','
  const args: (boolean | number | string)[] = [];

  for (const tag of typeTags) {
    switch (tag) {
      case "T":
        args.push(true);
        break;
      case "F":
        args.push(false);
        break;
      case "i":
        if (offset + 4 > buf.length) return null;
        args.push(buf.readInt32BE(offset));
        offset += 4;
        break;
      case "f":
        if (offset + 4 > buf.length) return null;
        args.push(buf.readFloatBE(offset));
        offset += 4;
        break;
      case "s": {
        const [s, next] = decodeOscString(buf, offset);
        args.push(s);
        offset = next;
        break;
      }
      default:
        // Unknown type tag — stop parsing
        return { address, args };
    }
  }

  return { address, args };
}

// --- VRChat mute state listener ---
// VRChat sends OSC parameters on its output port (default 9001).
// /avatar/parameters/MuteSelf → bool (T/F) or int (0/1)

let muteSelf = false;
let listenSocket: dgram.Socket | null = null;

export const oscEvents = new EventEmitter();

export function isMuted(): boolean {
  return muteSelf;
}

export function startMuteListener(port: number): void {
  if (listenSocket) return;

  listenSocket = dgram.createSocket({ type: "udp4", reuseAddr: true });
  listenSocket.unref();

  listenSocket.on("message", (msg) => {
    const parsed = parseOscMessage(msg);
    if (!parsed) return;

    if (parsed.address === "/avatar/parameters/MuteSelf") {
      const val = parsed.args[0];
      const newMute = val === true || val === 1;
      if (newMute !== muteSelf) {
        muteSelf = newMute;
        oscEvents.emit("muteChanged", muteSelf);
        console.log(`VRChat MuteSelf: ${muteSelf}`);
      }
    }
  });

  listenSocket.on("error", (err) => {
    console.error("OSC listen error:", err);
  });

  listenSocket.bind(port, "127.0.0.1", () => {
    console.log(`OSC mute listener started on port ${port}`);
  });
}

export function stopMuteListener(): void {
  if (listenSocket) {
    listenSocket.close();
    listenSocket = null;
  }
  muteSelf = false;
}
