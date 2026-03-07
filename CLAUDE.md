# VRCFlow

Real-time voice translation desktop app. Mic capture → VAD slicing → HTTP upload → ASR/translation → VRChat OSC Chatbox.

## Architecture

```
Electron Client (client/)            Python Backend (server/)
┌───────────────────────────┐       ┌──────────────────────────┐
│ Renderer (React+Vite)      │       │ FastAPI + uvicorn        │
│  - Mic capture              │       │  - User register/login   │
│  - Silero VAD slicing      │ HTTP  │  - Admin approval        │
│  - WAV encode + POST       │──────►│  - Daily audio rate limit│
│  - Display ASR+translation │◄──────│  - DashScope SDK calls   │
│  - Login/register UI       │  JSON │  - SQLite persistence    │
├───────────────────────────┤       │  - Embedded admin dashboard│
│ Main process (Node.js)     │       └──────────┬───────────────┘
│  - OSC UDP → VRChat       │                  │ SDK
│  - electron-store settings │                  ▼
│  - IPC bridge             │       ┌──────────────────────────┐
│  - Update checker          │       │ DashScope Translation     │
└───────────────────────────┘       │ (gummy-chat-v1)           │
                                    └──────────────────────────┘
```

## Core Data Flow

```
Mic → AudioWorklet (16kHz mono)
    → Silero VAD detects speech segments
    → On segment end, encode to WAV (PCM int16, 16kHz)
    → POST /transcribe (Authorization: Bearer <access_token>)
    → Server: verify JWT → check rate limit (audio seconds) → DashScope SDK ASR+translation
    → Return JSON {transcription, translation}
    → Client display + OSC send to VRChat
```

## User System Flow

```
Register → Pending approval (is_active=false) → Admin activates → Login with JWT → Use service
```

## Directory Structure

```
vrcflow/
├── .github/
│   └── workflows/
│       └── release.yml               # Push v* tag → auto build + GitHub Release
├── client/                           # Electron + Vite + React + TS
│   ├── electron/
│   │   ├── main.ts                   # Electron main process entry
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
│   │   │   ├── AuthView.tsx          # Login/register
│   │   │   ├── MicControl.tsx        # VAD status + start/stop
│   │   │   ├── TranslationView.tsx   # ASR+translation results display
│   │   │   ├── Settings.tsx          # Settings modal
│   │   │   ├── UpdateBanner.tsx      # Version update notification banner
│   │   │   └── LanguageSwitcher.tsx  # Language switcher
│   │   ├── hooks/
│   │   │   ├── useAuth.ts            # JWT management
│   │   │   └── useVAD.ts             # Silero VAD + WAV encoding + HTTP upload
│   │   └── lib/
│   │       └── wav.ts                # PCM → WAV encoding
│   ├── electron-builder.yml          # Build config (Windows x64 NSIS)
│   └── vite.config.ts
├── server/
│   ├── main.py                       # FastAPI app + embedded admin dashboard HTML
│   ├── config.py                     # pydantic-settings
│   ├── database.py                   # aiosqlite
│   ├── auth.py                       # JWT + bcrypt
│   ├── ratelimit.py                  # Daily audio seconds rate limiter
│   ├── dashscope_asr.py              # DashScope TranslationRecognizerChat
│   ├── routers/
│   │   ├── auth_router.py            # POST /auth/register, /auth/login, /auth/refresh, /auth/logout
│   │   ├── transcribe_router.py      # POST /transcribe (core endpoint)
│   │   └── admin_router.py           # Admin API (user mgmt, stats, settings, usage history)
│   ├── .env.example
│   └── requirements.txt
├── Makefile                          # Dev convenience commands
└── CLAUDE.md
```

## Dev Commands (Makefile)

```bash
make install          # Install all dependencies
make dev              # Start backend (background) + client
make server           # Run backend in foreground
make server-start     # Run backend in background
make server-stop      # Stop backend
make server-status    # Check backend status
make server-log       # View backend logs
make client           # Start Electron client
make clean            # Clean all build artifacts and dependencies
```

## Database Schema (SQLite)

```sql
CREATE TABLE users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    username        TEXT    UNIQUE NOT NULL,
    password_hash   TEXT    NOT NULL,
    is_active       INTEGER NOT NULL DEFAULT 0,   -- 0=pending, 1=activated
    is_admin        INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    daily_seconds   REAL    NOT NULL DEFAULT 0.0,  -- audio seconds used today
    last_reset_date TEXT    NOT NULL DEFAULT ''
);

CREATE TABLE refresh_tokens (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    token_hash  TEXT    UNIQUE NOT NULL,
    expires_at  TEXT    NOT NULL,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/register | None | Register (pending activation) |
| POST | /auth/login | None | Login, returns access + refresh token |
| POST | /auth/refresh | refresh_token | Exchange for new access_token |
| POST | /auth/logout | refresh_token | Revoke refresh_token |
| **POST** | **/transcribe** | **access_token** | **Upload WAV, returns ASR+translation** |
| GET | /admin/users | admin JWT | User list |
| PATCH | /admin/users/{id} | admin JWT | Activate/deactivate user |
| GET | /admin | None (in-page login) | Admin dashboard HTML page |
| GET | /health | None | Health check |

### POST /transcribe Request/Response

```
Request:
  Content-Type: multipart/form-data
  Authorization: Bearer <access_token>
  file: audio.wav (16kHz mono PCM int16)
  source_lang: "zh"          (optional, default "zh")
  target_lang: "en"          (optional, default "en")

Success (200):
{
  "transcription": "你好世界",
  "translation": "Hello World",
  "audio_duration": 2.3,
  "remaining_seconds": 4877.7
}

Rate limited (429):
{"type":"error","code":"RATE_LIMIT_DAILY","params":{"limit":7200,"used":7200}}
```

## JWT Design

| Item | Spec |
|------|------|
| Algorithm | HS256 |
| access_token TTL | 15 minutes |
| refresh_token TTL | 7 days |
| access_token payload | `{"sub": user_id, "username": "...", "is_admin": false, "exp": ...}` |
| refresh_token storage | DB stores SHA256 hash, supports revocation |
| Password hashing | bcrypt (passlib) |

## i18n

| Item | Approach |
|------|----------|
| Framework | react-i18next + i18next |
| Default/fallback language | en |
| Supported languages | en, zh-CN, ja |
| Translation file format | JSON, flat keys |
| Language detection | electron-store persisted > navigator.language > en |
| Backend error localization | Backend returns error code + params only, client renders |

## Backend Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| DASHSCOPE_API_KEY | Yes | - | DashScope API Key |
| JWT_SECRET | Yes | - | JWT signing secret |
| DATABASE_PATH | | ./vrcflow.db | SQLite database path |
| MAX_USER_DAILY_SECONDS | | 7200 | Per-user daily audio quota (seconds) |
| ACCESS_TOKEN_EXPIRE_MINUTES | | 15 | Access token TTL |
| REFRESH_TOKEN_EXPIRE_DAYS | | 7 | Refresh token TTL |
| MAX_AUDIO_DURATION | | 30 | Max audio duration per upload (seconds) |
| PORT | | 8080 | uvicorn listen port |
| ADMIN_INIT_PASSWORD | | random | Admin password on first run |

## Tech Stack

- **Client**: Electron 40 + Vite 7 + React 19 + TypeScript strict
- **VAD**: @ricky0123/vad-web (Silero VAD, ONNX browser inference)
- **i18n**: react-i18next + i18next
- **Backend**: Python 3.11+, FastAPI, uvicorn, dashscope SDK, pydantic-settings, aiosqlite, PyJWT, passlib[bcrypt]
- **Build**: electron-builder, target Windows x64 NSIS
- **CI/CD**: GitHub Actions — push `v*` tag to auto-build and create Release
- **OSC**: Pure dgram manual encoding, no osc library
- **UI Style**: Dark theme (#1a1a2e), compact layout
