# VRCFlow

实时语音翻译桌面应用。麦克风采集 → VAD 切片 → HTTP 上传 → ASR/翻译 → VRChat OSC Chatbox。

## 架构

```
Electron 客户端 (client/)            Python 后端 (server/)
┌───────────────────────────┐       ┌──────────────────────────┐
│ 渲染进程 (React+Vite)      │       │ FastAPI + uvicorn        │
│  - 麦克风采集               │       │  - 用户注册/登录 (JWT)    │
│  - Silero VAD 语音切片     │ HTTP  │  - 管理员审核激活         │
│  - WAV 编码 + POST 上传   │──────►│  - 每日音频秒数限流       │
│  - 展示识别+翻译结果       │◄──────│  - DashScope SDK 调用     │
│  - 登录/注册界面           │  JSON │  - SQLite 持久化          │
├───────────────────────────┤       └──────────┬───────────────┘
│ 主进程 (Node.js)           │                  │ SDK
│  - OSC UDP → VRChat       │                  ▼
│  - electron-store 设置     │       ┌──────────────────────────┐
│  - IPC bridge             │       │ DashScope Translation     │
└───────────────────────────┘       │ (gummy-chat-v1)           │
                                    └──────────────────────────┘
```

## 核心数据流

```
麦克风 → AudioWorklet (16kHz mono)
      → Silero VAD 检测语音段
      → 语音段结束时编码为 WAV (PCM int16, 16kHz)
      → POST /transcribe (Authorization: Bearer <access_token>)
      → 服务端：校验 JWT → 检查限流(音频秒数) → DashScope SDK 识别+翻译
      → 返回 JSON {transcription, translation}
      → 客户端展示 + OSC 发送到 VRChat
```

## 用户系统流程

```
注册 → 账户待审核(is_active=false) → 管理员激活 → 登录获取 JWT → 使用服务
```

## 目录约定

```
vrcflow/
├── client/                       # Electron + Vite + React + TS
│   ├── electron/
│   │   ├── main.ts
│   │   ├── osc.ts                # OSC UDP 发送（纯 dgram，零依赖）
│   │   └── preload.ts            # contextBridge IPC
│   ├── src/
│   │   ├── App.tsx
│   │   ├── i18n/
│   │   │   ├── index.ts
│   │   │   ├── en.json
│   │   │   ├── zh-CN.json
│   │   │   └── ja.json
│   │   ├── components/
│   │   │   ├── AuthView.tsx       # 登录/注册
│   │   │   ├── MicControl.tsx     # VAD 状态 + 开始/停止
│   │   │   ├── TranslationView.tsx
│   │   │   ├── Settings.tsx
│   │   │   └── LanguageSwitcher.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts         # JWT 管理
│   │   │   └── useVAD.ts          # Silero VAD + WAV 编码 + HTTP 上传
│   │   └── lib/
│   │       └── wav.ts             # PCM → WAV 编码
│   ├── electron-builder.yml
│   └── vite.config.ts
└── server/
    ├── main.py                   # FastAPI app + uvicorn + lifespan
    ├── config.py                 # pydantic-settings
    ├── database.py               # aiosqlite
    ├── auth.py                   # JWT + bcrypt
    ├── ratelimit.py              # 每日音频秒数限流
    ├── dashscope_asr.py          # DashScope TranslationRecognizerChat
    ├── routers/
    │   ├── auth_router.py        # POST /auth/register, /auth/login, /auth/refresh, /auth/logout
    │   ├── transcribe_router.py  # POST /transcribe（核心端点）
    │   └── admin_router.py       # GET /admin/users, PATCH /admin/users/{id}
    ├── .env.example
    └── requirements.txt
```

## 数据库 Schema (SQLite)

```sql
CREATE TABLE users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    username        TEXT    UNIQUE NOT NULL,
    password_hash   TEXT    NOT NULL,
    is_active       INTEGER NOT NULL DEFAULT 0,   -- 0=待审核, 1=已激活
    is_admin        INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    daily_seconds   REAL    NOT NULL DEFAULT 0.0,  -- 当日已用音频秒数
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

## API 端点

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | /auth/register | 无 | 注册（待激活） |
| POST | /auth/login | 无 | 登录，返回 access + refresh token |
| POST | /auth/refresh | refresh_token | 换取新 access_token |
| POST | /auth/logout | refresh_token | 撤销 refresh_token |
| **POST** | **/transcribe** | **access_token** | **上传 WAV，返回识别+翻译结果** |
| GET | /admin/users | admin JWT | 用户列表 |
| PATCH | /admin/users/{id} | admin JWT | 激活/停用用户 |
| GET | /health | 无 | 健康检查 |

### POST /transcribe 请求/响应

```
请求：
  Content-Type: multipart/form-data
  Authorization: Bearer <access_token>
  file: audio.wav (16kHz mono PCM int16)
  source_lang: "zh"          (可选，默认 "zh")
  target_lang: "en"          (可选，默认 "en")

成功响应 (200)：
{
  "transcription": "你好世界",
  "translation": "Hello World",
  "audio_duration": 2.3,
  "remaining_seconds": 4877.7
}

限流响应 (429)：
{"type":"error","code":"RATE_LIMIT_DAILY","params":{"limit":7200,"used":7200}}
```

## JWT 设计

| 项目 | 规格 |
|------|------|
| 算法 | HS256 |
| access_token 有效期 | 15 分钟 |
| refresh_token 有效期 | 7 天 |
| access_token payload | `{"sub": user_id, "username": "...", "is_admin": false, "exp": ...}` |
| refresh_token 存储 | DB 存 SHA256 hash，支持撤销 |
| 密码哈希 | bcrypt (passlib) |

## 国际化 (i18n)

| 项目 | 方案 |
|------|------|
| 框架 | react-i18next + i18next |
| 默认/fallback 语言 | en |
| 初始支持语言 | en, zh-CN, ja |
| 翻译文件格式 | JSON, 扁平 key |
| 语言检测 | electron-store 持久化 > navigator.language > en |
| 后端错误本地化 | 后端只返回 error code + params，客户端渲染 |

## 后端环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| DASHSCOPE_API_KEY | ✅ | - | 百炼 API Key |
| JWT_SECRET | ✅ | - | JWT 签名密钥 |
| DATABASE_PATH | | ./vrcflow.db | SQLite 文件路径 |
| MAX_USER_DAILY_SECONDS | | 7200 | 单用户每日音频秒数上限 |
| ACCESS_TOKEN_EXPIRE_MINUTES | | 15 | access token 有效期 |
| REFRESH_TOKEN_EXPIRE_DAYS | | 7 | refresh token 有效期 |
| MAX_AUDIO_DURATION | | 30 | 单次上传最大音频秒数 |
| PORT | | 8080 | uvicorn 监听端口 |

## 技术栈约束

- **客户端**: Electron + Vite + React 18 + TypeScript strict
- **VAD**: @ricky0123/vad-web (Silero VAD, ONNX 浏览器推理)
- **i18n**: react-i18next + i18next
- **后端**: Python 3.11+, FastAPI, uvicorn, dashscope SDK, pydantic-settings, aiosqlite, PyJWT, passlib[bcrypt]
- **构建**: electron-builder, 目标 Windows x64 NSIS
- **OSC**: 纯 dgram 手动编码，不引入 osc 库
- **UI 风格**: 深色系，紧凑布局
