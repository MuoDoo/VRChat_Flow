# VRCFlow

[English](./README.md) | [日本語](./README_ja.md) | 中文

实时语音翻译桌面应用，专为 VRChat 设计。

麦克风采集语音 → 本地 VAD 智能切片 → 云端 ASR 识别 + 翻译 → 结果通过 OSC 发送到 VRChat Chatbox。

## 使用指南

**只想使用 VRCFlow？** 请参阅 [使用指南](docs/USER_GUIDE_zh-CN.md)（[English](docs/USER_GUIDE.md) | [日本語](docs/USER_GUIDE_ja.md)），包含下载安装和使用说明。

以下内容面向开发者。

---

## 功能特性

- **实时语音翻译** — 说话即翻译，延迟低，体验流畅
- **本地 VAD 检测** — 基于 Silero VAD (ONNX)，在浏览器端完成语音活动检测，仅上传有效语音片段
- **VRChat OSC 集成** — 翻译结果自动推送到 VRChat Chatbox，无需手动输入
- **多语言 UI** — 界面支持 English / 中文 / 日本語
- **用户管理** — 用户注册，JWT 鉴权，管理员仪表盘
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

## Windows 开发环境搭建

### 环境要求

- Windows 10/11（x64）
- Node.js 20+（[下载](https://nodejs.org/)）
- Python 3.11+（[下载](https://www.python.org/downloads/)，安装时勾选 "Add to PATH"）
- Git（[下载](https://git-scm.com/download/win)）

### 详细步骤

1. **打开 PowerShell**（或命令提示符）

2. **克隆并进入项目目录**
   ```powershell
   git clone https://github.com/MuoDoo/VRChat_Flow.git
   cd VRChat_Flow
   ```

3. **配置后端**
   ```powershell
   cd server
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   copy .env.example .env
   ```
   用记事本编辑 `server\.env`，填入 `DASHSCOPE_API_KEY` 和 `JWT_SECRET`。

4. **启动后端**
   ```powershell
   cd server
   .venv\Scripts\activate
   python main.py
   ```

5. **配置并启动客户端**（打开新终端窗口）
   ```powershell
   cd client
   npm install
   npm run dev
   ```

### 常见问题（Windows）

| 问题 | 解决方案 |
|------|----------|
| 找不到 `python` 命令 | 重新安装 Python 并勾选 "Add to PATH"，或使用 `py` 命令代替 |
| 端口 8080 被占用 | 在 `.env` 中设置 `PORT=8081`，并在客户端设置中更新服务器地址 |
| 麦克风无法使用 | 检查 Windows 设置 → 隐私 → 麦克风，允许应用访问 |
| OSC 不生效 | 确认 VRChat 中已启用 OSC，默认端口为 9000 |

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
├── docs/                    # 用户使用指南 (EN, ZH, JA)
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
