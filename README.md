# VRCFlow

实时语音翻译桌面应用，专为 VRChat 设计。

麦克风采集语音 → 本地 VAD 智能切片 → 云端 ASR 识别 + 翻译 → 结果通过 OSC 发送到 VRChat Chatbox。

## 功能特性

- **实时语音翻译** — 说话即翻译，延迟低，体验流畅
- **本地 VAD 检测** — 基于 Silero VAD (ONNX)，在浏览器端完成语音活动检测，仅上传有效语音片段
- **VRChat OSC 集成** — 翻译结果自动推送到 VRChat Chatbox，无需手动输入
- **多语言 UI** — 界面支持 English / 中文 / 日本語
- **用户管理** — 注册审核制，JWT 鉴权，管理员仪表盘
- **用量限流** — 单用户每日音频时长限额，防止滥用
- **自动更新检查** — 启动时检测新版本并提醒

## 快速开始

### 前置要求

- Node.js 20+
- Python 3.11+
- [阿里云百炼 DashScope API Key](https://dashscope.console.aliyun.com/)

### 一键安装

```bash
make install
```

### 配置后端

```bash
cp server/.env.example server/.env
```

编辑 `server/.env`，填入必要配置：

```env
DASHSCOPE_API_KEY=your_dashscope_api_key
JWT_SECRET=your_jwt_secret
```

### 启动开发环境

```bash
# 同时启动后端(后台)和客户端
make dev

# 或分别启动
make server    # 前台启动后端
make client    # 启动 Electron 客户端
```

### 构建发布包

```bash
cd client && npm run build
```

产出 Windows x64 NSIS 安装包，位于 `client/release/`。

## 项目结构

```
vrcflow/
├── client/                  # Electron + Vite + React + TypeScript
│   ├── electron/            # 主进程 (OSC 发送、IPC bridge)
│   ├── src/                 # 渲染进程 (React UI、VAD、Auth)
│   └── electron-builder.yml # 构建配置
├── server/                  # Python FastAPI 后端
│   ├── main.py              # 应用入口 + 内嵌管理仪表盘
│   ├── routers/             # API 路由 (auth, transcribe, admin)
│   └── .env.example         # 环境变量模板
└── Makefile                 # 开发便捷命令
```

## Makefile 命令

| 命令 | 说明 |
|------|------|
| `make install` | 安装所有依赖 (server venv + client npm) |
| `make dev` | 启动后端(后台) + 客户端 |
| `make server` | 前台运行后端 |
| `make server-start` | 后台运行后端 |
| `make server-stop` | 停止后端 |
| `make server-status` | 查看后端状态 |
| `make server-log` | 查看后端日志 |
| `make client` | 启动 Electron 客户端 |
| `make clean` | 清理所有构建产物和依赖 |

## 后端环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `DASHSCOPE_API_KEY` | 是 | - | 百炼 API Key |
| `JWT_SECRET` | 是 | - | JWT 签名密钥 |
| `DATABASE_PATH` | | `./vrcflow.db` | SQLite 文件路径 |
| `MAX_USER_DAILY_SECONDS` | | `7200` | 单用户每日音频秒数上限 |
| `MAX_AUDIO_DURATION` | | `30` | 单次上传最大音频秒数 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | | `15` | access token 有效期 |
| `REFRESH_TOKEN_EXPIRE_DAYS` | | `7` | refresh token 有效期 |
| `PORT` | | `8080` | 服务端口 |
| `ADMIN_INIT_PASSWORD` | | 随机生成 | 首次启动时管理员密码 |

## 技术栈

**客户端**: Electron 40 · Vite 7 · React 19 · TypeScript · @ricky0123/vad-web (Silero VAD)

**后端**: Python 3.11+ · FastAPI · uvicorn · DashScope SDK · aiosqlite · PyJWT · passlib[bcrypt]

**CI/CD**: GitHub Actions — 推送 `v*` tag 自动构建 Windows 安装包并创建 Release

## License

MIT
