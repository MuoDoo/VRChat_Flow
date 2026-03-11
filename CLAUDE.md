# VRCFlow

Real-time voice translation desktop app. Mic/Speaker capture → VAD slicing → Multi-provider ASR/translation → VRChat OSC Chatbox.

## Architecture

```
Electron Client (client/)
┌───────────────────────────┐
│ Renderer (React+Vite)      │
│  - Mic + Speaker capture   │
│  - Silero VAD slicing      │
│  - WAV encode              │
│  - Display ASR+translation │
│  - SteamVR overlay render  │
├───────────────────────────┤       ┌──────────────────────────┐
│ Main process (Node.js)     │  WS   │ DashScope Translation     │
│  - Provider routing (IPC)  │──────►│ (gummy-chat-v1)           │
│  - DashScope WebSocket API │       └──────────────────────────┘
│  - OpenRouter REST API     │ REST  ┌──────────────────────────┐
│  - OSC UDP → VRChat       │──────►│ OpenRouter                │
│  - Update checker          │       │ (Voxtral / Gemini)        │
└───────────────────────────┘       └──────────────────────────┘
```

## Core Data Flow

```
Mic/Speaker → AudioWorklet (16kHz mono)
    → Silero VAD detects speech segments
    → On segment end, encode to WAV (PCM int16, 16kHz)
    → IPC to main process → Provider routing (DashScope or OpenRouter)
    → Return {transcription, translation, usage?}
    → Client display + OSC send to VRChat + optional SteamVR overlay
```

## Provider System

The app supports pluggable ASR/translation providers via `client/src/lib/providers.ts`.

### DashScope (dashscope)
- **Protocol**: WebSocket duplex streaming
- **Model**: gummy-chat-v1 (hardcoded)
- **Implementation**: `client/electron/dashscope.ts`
- **Pricing**: ¥0.00015/second per channel, dual-billed (ASR + translation)

### OpenRouter (openrouter)
- **Protocol**: REST API with function calling (tool use)
- **Models**: User-selectable (Voxtral Small 24B, Gemini 3.1 Flash Lite)
- **Implementation**: `client/electron/openrouter.ts`
- **Pricing**: Per-token/per-second, model-specific

### Provider routing
Main process IPC handler (`main.ts`) routes `transcribe` calls based on the `provider` parameter.
Both providers return a unified `TranscribeResult` interface with optional `UsageInfo`.

## Directory Structure

```
vrcflow/
├── .github/
│   └── workflows/
│       └── release.yml               # Push v* tag → auto build + GitHub Release
├── client/                           # Electron + Vite + React + TS
│   ├── electron/
│   │   ├── main.ts                   # Electron main process entry + IPC handlers + provider routing
│   │   ├── dashscope.ts              # DashScope WebSocket API client
│   │   ├── openrouter.ts             # OpenRouter REST API client
│   │   ├── osc.ts                    # OSC UDP sender (pure dgram, zero deps)
│   │   └── preload.ts                # contextBridge IPC
│   ├── src/
│   │   ├── App.tsx                   # Main UI + state management + provider selection
│   │   ├── i18n/
│   │   │   ├── index.ts
│   │   │   ├── en.json
│   │   │   ├── zh-CN.json
│   │   │   └── ja.json
│   │   ├── components/
│   │   │   ├── MicControl.tsx        # Mic VAD status + start/stop
│   │   │   ├── SpeakerControl.tsx    # Speaker/system audio capture + start/stop
│   │   │   ├── TranslationView.tsx   # ASR+translation results display
│   │   │   ├── Settings.tsx          # Settings modal (provider, model, API key, OSC, languages)
│   │   │   ├── Dashboard.tsx         # Usage stats + cost tracking per provider
│   │   │   ├── History.tsx           # Translation history browser
│   │   │   ├── UpdateBanner.tsx      # Version update notification banner
│   │   │   └── LanguageSwitcher.tsx  # Language switcher
│   │   ├── hooks/
│   │   │   ├── useVAD.ts             # Mic: Silero VAD + WAV encoding + IPC transcribe
│   │   │   ├── useSpeakerVAD.ts      # Speaker: system audio VAD + IPC transcribe
│   │   │   └── useUpdateCheck.ts     # GitHub release update checker
│   │   └── lib/
│   │       ├── providers.ts          # Provider/model registry, interfaces, cost estimation
│   │       ├── overlayRenderer.ts    # SteamVR overlay message rendering
│   │       └── wav.ts                # PCM → WAV encoding
│   ├── electron-builder.yml          # Build config (Windows x64 NSIS)
│   └── vite.config.ts
├── docs/                             # User guides (EN, ZH, JA)
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

## OpenRouter REST API

The app sends audio as base64-encoded WAV via REST API with function calling for structured output.

```
URL: https://openrouter.ai/api/v1/chat/completions
Auth: Authorization: Bearer <user's API key>
Models: mistralai/voxtral-small-24b-2507, google/gemini-3.1-flash-lite-preview

Protocol:
1. Client sends POST with system prompt + audio content (base64 WAV)
2. Tool definition (submit_transcription) constrains output format
3. Server returns transcription + translation via tool call
4. Response includes inline usage/cost data
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
| vrcflow-provider | "dashscope" | Active provider ID |
| vrcflow-apiKey | "" | DashScope API Key |
| vrcflow-openrouterKey | "" | OpenRouter API Key |
| vrcflow-openrouterModel | "mistralai/voxtral-small-24b-2507" | Selected OpenRouter model |
| vrcflow-oscPort | 9000 | VRChat OSC port |
| vrcflow-sourceLang | "zh" | Source language |
| vrcflow-targetLang | "en" | Target language |
| vrcflow-displayCurrency | "CNY" | Cost display currency (CNY/USD/JPY) |
| vrcflow-processingTimeout | 5 | API timeout in seconds |
| vrcflow-speechPadMs | 600 | VAD silence padding in ms |
| vrcflow-overlayEnabled | false | SteamVR overlay enable flag |

## Tech Stack

- **Client**: Electron 40 + Vite 7 + React 19 + TypeScript strict
- **VAD**: @ricky0123/vad-web (Silero VAD, ONNX browser inference)
- **ASR/Translation**: Multi-provider
  - DashScope WebSocket API (gummy-chat-v1), via `ws` package
  - OpenRouter REST API (Voxtral Small 24B, Gemini 3.1 Flash Lite)
- **i18n**: react-i18next + i18next
- **Build**: electron-builder, target Windows x64 NSIS
- **CI/CD**: GitHub Actions — push `v*` tag to auto-build and create Release
- **OSC**: Pure dgram manual encoding, no osc library
- **UI Style**: Dark theme (#1a1a2e), compact layout
