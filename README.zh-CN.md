# VRCFlow

[English](./README.md) | [日本語](./README_ja.md) | 中文

实时语音翻译桌面应用，专为 VRChat 设计。

麦克风 / 系统音频采集 → 本地 VAD 智能切片 → 多 Provider ASR 识别 + 翻译 → 结果通过 OSC 发送到 VRChat Chatbox。

## 使用指南

**只想使用 VRCFlow？** 请参阅 [使用指南](docs/USER_GUIDE_zh-CN.md)（[English](docs/USER_GUIDE.md) | [日本語](docs/USER_GUIDE_ja.md)），包含下载安装和使用说明。

以下内容面向开发者。

---

## 功能特性

- **实时语音翻译** — 说话即翻译，延迟低，体验流畅
- **多 Provider 支持** — 可选阿里云 DashScope 或 OpenRouter，支持多种模型
- **麦克风 + 系统音频捕获** — 翻译自己的语音（麦克风）或他人的语音（系统音频）
- **本地 VAD 检测** — 基于 Silero VAD (ONNX)，在浏览器端完成语音活动检测，仅发送有效语音片段
- **无需后端服务器** — 用户使用自己的 API Key，无中间服务器
- **VRChat OSC 集成** — 翻译结果自动推送到 VRChat Chatbox，无需手动输入
- **SteamVR 悬浮窗** — 可选开启悬浮窗模式，在 VR 中直接显示翻译结果
- **多语言 UI** — 界面支持 English / 中文 / 日本語
- **仪表盘和历史记录** — 按 Provider 追踪每日用量、费用，浏览所有历史翻译
- **自动更新检查** — 启动时检测新版本并提醒

## 快速开始

### 前置要求

- Node.js 20+

### 一键安装

```bash
make install
```

### 启动开发环境

```bash
make dev
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
- Git（[下载](https://git-scm.com/download/win)）

### 详细步骤

1. **打开 PowerShell**（或命令提示符）

2. **克隆并进入项目目录**
   ```powershell
   git clone https://github.com/MuoDoo/VRCFlow.git
   cd VRCFlow
   ```

3. **安装依赖并启动**
   ```powershell
   cd client
   npm install
   npm run dev
   ```

### 常见问题（Windows）

| 问题 | 解决方案 |
|------|----------|
| 麦克风无法使用 | 检查 Windows 设置 → 隐私 → 麦克风，允许应用访问 |
| OSC 不生效 | 确认 VRChat 中已启用 OSC，默认端口为 9000 |

## 项目结构

```
vrcflow/
├── client/                  # Electron + Vite + React + TypeScript
│   ├── electron/            # 主进程 (Provider API、OSC 发送、IPC bridge)
│   │   ├── main.ts          # 入口 + IPC 处理 + Provider 路由
│   │   ├── dashscope.ts     # DashScope WebSocket API 客户端
│   │   ├── openrouter.ts    # OpenRouter REST API 客户端
│   │   ├── osc.ts           # OSC UDP 发送
│   │   └── preload.ts       # contextBridge IPC
│   ├── src/                 # 渲染进程 (React UI、VAD)
│   │   ├── lib/
│   │   │   ├── providers.ts # Provider/模型注册表 & 费用估算
│   │   │   └── wav.ts       # PCM → WAV 编码
│   │   ├── hooks/
│   │   │   ├── useVAD.ts    # 麦克风 VAD + 转录
│   │   │   └── useSpeakerVAD.ts # 系统音频 VAD + 转录
│   │   └── components/      # React UI 组件
│   └── electron-builder.yml # 构建配置
├── docs/                    # 用户使用指南 (EN, ZH, JA)
└── Makefile                 # 开发便捷命令
```

## Makefile 命令

| 命令 | 说明 |
|------|------|
| `make install` | 安装依赖 |
| `make dev` | 启动 Electron 客户端 (Vite dev) |
| `make clean` | 清理所有构建产物和依赖 |

## 技术栈

**客户端**: Electron 40 · Vite 7 · React 19 · TypeScript · @ricky0123/vad-web (Silero VAD)

**语音识别/翻译 Provider**：
- 阿里云 DashScope — WebSocket API (gummy-chat-v1)，实时流式处理
- OpenRouter — REST API，多模型可选（Voxtral Small 24B、Gemini 3.1 Flash Lite）

**CI/CD**: GitHub Actions — 推送 `v*` tag 自动构建 Windows 安装包并创建 Release

## License

MIT
