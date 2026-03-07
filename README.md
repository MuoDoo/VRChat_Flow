# VRCFlow

Real-time voice translation desktop app built for VRChat.

Mic capture → on-device VAD slicing → cloud ASR + translation → results sent to VRChat Chatbox via OSC.

[简体中文](./README.zh-CN.md)

## Features

- **Real-time Voice Translation** — speak and get instant translations with low latency
- **On-device VAD** — Silero VAD (ONNX) runs locally in the browser, only uploading valid speech segments
- **VRChat OSC Integration** — translation results are automatically pushed to VRChat Chatbox
- **Multi-language UI** — English / 中文 / 日本語
- **User Management** — registration with admin approval, JWT authentication, admin dashboard
- **Rate Limiting** — per-user daily audio quota to prevent abuse
- **Update Checker** — notifies users when a new version is available

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+
- [Alibaba DashScope API Key](https://dashscope.console.aliyun.com/)

### Install

```bash
make install
```

### Configure

```bash
cp server/.env.example server/.env
```

Edit `server/.env` with your credentials:

```env
DASHSCOPE_API_KEY=your_dashscope_api_key
JWT_SECRET=your_jwt_secret
```

### Development

```bash
# Start both backend (background) and client
make dev

# Or start separately
make server    # Run backend in foreground
make client    # Run Electron client
```

### Build

```bash
cd client && npm run build
```

Produces a Windows x64 NSIS installer in `client/release/`.

## Project Structure

```
vrcflow/
├── client/                  # Electron + Vite + React + TypeScript
│   ├── electron/            # Main process (OSC sender, IPC bridge)
│   ├── src/                 # Renderer process (React UI, VAD, Auth)
│   └── electron-builder.yml # Build config
├── server/                  # Python FastAPI backend
│   ├── main.py              # App entry + embedded admin dashboard
│   ├── routers/             # API routes (auth, transcribe, admin)
│   └── .env.example         # Environment variable template
└── Makefile                 # Dev convenience commands
```

## Makefile Commands

| Command | Description |
|---------|-------------|
| `make install` | Install all dependencies (server venv + client npm) |
| `make dev` | Start backend (background) + client |
| `make server` | Run backend in foreground |
| `make server-start` | Run backend in background |
| `make server-stop` | Stop backend |
| `make server-status` | Check backend status |
| `make server-log` | View backend logs |
| `make client` | Start Electron client |
| `make clean` | Clean all build artifacts and dependencies |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DASHSCOPE_API_KEY` | Yes | - | DashScope API Key |
| `JWT_SECRET` | Yes | - | JWT signing secret |
| `DATABASE_PATH` | | `./vrcflow.db` | SQLite database path |
| `MAX_USER_DAILY_SECONDS` | | `7200` | Per-user daily audio quota (seconds) |
| `MAX_AUDIO_DURATION` | | `30` | Max audio duration per upload (seconds) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | | `15` | Access token TTL |
| `REFRESH_TOKEN_EXPIRE_DAYS` | | `7` | Refresh token TTL |
| `PORT` | | `8080` | Server port |
| `ADMIN_INIT_PASSWORD` | | random | Admin password on first run |

## Tech Stack

**Client**: Electron 40 · Vite 7 · React 19 · TypeScript · @ricky0123/vad-web (Silero VAD)

**Server**: Python 3.11+ · FastAPI · uvicorn · DashScope SDK · aiosqlite · PyJWT · passlib[bcrypt]

**CI/CD**: GitHub Actions — push a `v*` tag to auto-build Windows installer and create a Release

## License

MIT
