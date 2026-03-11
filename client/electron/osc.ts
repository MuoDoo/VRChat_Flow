import dgram from "node:dgram";

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

  socket.send(packet, 0, packet.length, port, "127.0.0.1", (err) => {
    if (err) console.error("OSC send error:", err);
  });
}
