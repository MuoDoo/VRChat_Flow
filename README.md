# VRCFlow

[简体中文](./README.zh-CN.md) | [日本語](./README_ja.md) | English

Real-time voice translation desktop app built for VRChat.

Mic capture → on-device VAD slicing → DashScope ASR + translation → results sent to VRChat Chatbox via OSC.

## User Guide

**Just want to use VRCFlow?** See the [User Guide](docs/USER_GUIDE.md) ([中文](docs/USER_GUIDE_zh-CN.md) | [日本語](docs/USER_GUIDE_ja.md)) for download, install, and usage instructions.

The rest of this README is for developers.

---

## Features

- **Real-time Voice Translation** — speak and get instant translations with low latency
- **On-device VAD** — Silero VAD (ONNX) runs locally in the browser, only sending valid speech segments
- **Direct DashScope API** — no backend server needed, users provide their own API key
- **VRChat OSC Integration** — translation results are automatically pushed to VRChat Chatbox
- **Multi-language UI** — English / 中文 / 日本語
- **Dashboard & History** — track daily usage, costs, and browse all past translations
- **Update Checker** — notifies users when a new version is available

## Quick Start

### Prerequisites

- Node.js 20+

### Install

```bash
make install
```

### Development

```bash
make dev
```

### Build

```bash
cd client && npm run build
```

Produces a Windows x64 NSIS installer in `client/release/`.

## Windows Development Setup

### Requirements

- Windows 10/11 (x64)
- Node.js 20+ ([download](https://nodejs.org/))
- Git ([download](https://git-scm.com/download/win))

### Step-by-step

1. **Open PowerShell** (or Command Prompt)

2. **Clone and enter the project**
   ```powershell
   git clone https://github.com/MuoDoo/VRCFlow.git
   cd VRCFlow
   ```

3. **Install dependencies and start**
   ```powershell
   cd client
   npm install
   npm run dev
   ```

### Troubleshooting (Windows)

| Issue | Solution |
|-------|----------|
| Microphone not working | Check Windows Settings → Privacy → Microphone, allow app access |
| OSC not working | Confirm VRChat OSC is enabled, default port is 9000 |

## Project Structure

```
vrcflow/
├── client/                  # Electron + Vite + React + TypeScript
│   ├── electron/            # Main process (DashScope API, OSC sender, IPC bridge)
│   ├── src/                 # Renderer process (React UI, VAD)
│   └── electron-builder.yml # Build config
├── docs/                    # User guides (EN, ZH, JA)
└── Makefile                 # Dev convenience commands
```

## Makefile Commands

| Command | Description |
|---------|-------------|
| `make install` | Install dependencies |
| `make dev` | Start Electron client (Vite dev) |
| `make clean` | Clean all build artifacts and dependencies |

## Tech Stack

**Client**: Electron 40 · Vite 7 · React 19 · TypeScript · @ricky0123/vad-web (Silero VAD)

**ASR/Translation**: DashScope WebSocket API (gummy-chat-v1) via `ws`

**CI/CD**: GitHub Actions — push a `v*` tag to auto-build Windows installer and create a Release

## License

MIT
