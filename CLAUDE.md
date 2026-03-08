# VRCFlow

Real-time voice translation desktop app. Mic capture → VAD slicing → DashScope ASR/translation → VRChat OSC Chatbox.

## Architecture

```
Electron Client (client/)
┌───────────────────────────┐
│ Renderer (React+Vite)      │
│  - Mic capture              │
│  - Silero VAD slicing      │
│  - WAV encode              │
│  - Display ASR+translation │
├───────────────────────────┤       ┌──────────────────────────┐
│ Main process (Node.js)     │  WS   │ DashScope Translation     │
│  - DashScope WebSocket API │──────►│ (gummy-chat-v1)           │
│  - OSC UDP → VRChat       │       └──────────────────────────┘
│  - IPC bridge             │
│  - Update checker          │
└───────────────────────────┘
```

## Core Data Flow

```
Mic → AudioWorklet (16kHz mono)
    → Silero VAD detects speech segments
    → On segment end, encode to WAV (PCM int16, 16kHz)
    → IPC to main process → DashScope WebSocket API (gummy-chat-v1)
    → Return {transcription, translation}
    → Client display + OSC send to VRChat
```

## Directory Structure

```
vrcflow/
├── .github/
│   └── workflows/
│       └── release.yml               # Push v* tag → auto build + GitHub Release
├── client/                           # Electron + Vite + React + TS
│   ├── electron/
│   │   ├── main.ts                   # Electron main process entry + IPC handlers
│   │   ├── dashscope.ts              # DashScope WebSocket API client
│   │   ├── osc.ts                    # OSC UDP sender (pure dgram, zero deps)
│   │   └── preload.ts                # contextBridge IPC
│   ├── src/
│   │   ├── App.tsx                   # Main UI + state management
│   │   ├── i18n/
│   │   │   ├── index.ts
│   │   │   ├── en.json
│   │   │   ├── zh-CN.json
│   │   │   └── ja.json
│   │   ├── components/
│   │   │   ├── MicControl.tsx        # VAD status + start/stop
│   │   │   ├── TranslationView.tsx   # ASR+translation results display
│   │   │   ├── Settings.tsx          # Settings modal (API key, OSC, languages)
│   │   │   ├── UpdateBanner.tsx      # Version update notification banner
│   │   │   └── LanguageSwitcher.tsx  # Language switcher
│   │   ├── hooks/
│   │   │   └── useVAD.ts             # Silero VAD + WAV encoding + IPC transcribe
│   │   └── lib/
│   │       └── wav.ts                # PCM → WAV encoding
│   ├── electron-builder.yml          # Build config (Windows x64 NSIS)
│   └── vite.config.ts
├── Makefile                          # Dev convenience commands
└── CLAUDE.md
```

## Dev Commands (Makefile)

```bash
make install          # Install dependencies
make dev              # Start Electron client (Vite dev)
make client           # Same as dev
make clean            # Clean all build artifacts and dependencies
```

## DashScope WebSocket API

The app connects directly to DashScope's WebSocket API from the Electron main process.

```
URL: wss://dashscope.aliyuncs.com/api-ws/v1/inference
Auth: Authorization: bearer <user's API key>
Model: gummy-chat-v1

Protocol:
1. Client sends run-task JSON (model, format, sample_rate, languages)
2. Server responds task-started
3. Client sends audio in 12800-byte binary frames
4. Client sends finish-task JSON
5. Server sends result-generated events with transcription + translation
6. Server sends task-finished
```

## i18n

| Item | Approach |
|------|----------|
| Framework | react-i18next + i18next |
| Default/fallback language | en |
| Supported languages | en, zh-CN, ja |
| Translation file format | JSON, flat keys |
| Language detection | electron-store persisted > navigator.language > en |

## User Settings (localStorage)

| Key | Default | Description |
|-----|---------|-------------|
| vrcflow-apiKey | "" | User's DashScope API Key |
| vrcflow-oscPort | 9000 | VRChat OSC port |
| vrcflow-sourceLang | "zh" | Source language |
| vrcflow-targetLang | "en" | Target language |

## Tech Stack

- **Client**: Electron 40 + Vite 7 + React 19 + TypeScript strict
- **VAD**: @ricky0123/vad-web (Silero VAD, ONNX browser inference)
- **ASR/Translation**: DashScope WebSocket API (gummy-chat-v1), via `ws` package
- **i18n**: react-i18next + i18next
- **Build**: electron-builder, target Windows x64 NSIS
- **CI/CD**: GitHub Actions — push `v*` tag to auto-build and create Release
- **OSC**: Pure dgram manual encoding, no osc library
- **UI Style**: Dark theme (#1a1a2e), compact layout
