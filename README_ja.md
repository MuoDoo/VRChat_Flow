# VRCFlow

[English](./README.md) | [中文](./README.zh-CN.md) | 日本語

VRChat 向けリアルタイム音声翻訳デスクトップアプリ。

マイク / システム音声キャプチャ → ローカル VAD でスライス → マルチプロバイダー ASR 認識 + 翻訳 → OSC 経由で VRChat Chatbox に送信。

## ユーザーガイド

**VRCFlow を使いたいだけの方は** [ユーザーガイド](docs/USER_GUIDE_ja.md)（[English](docs/USER_GUIDE.md) | [中文](docs/USER_GUIDE_zh-CN.md)）をご覧ください。ダウンロード・インストール・使い方の説明があります。

以下は開発者向けの情報です。

---

## 主な機能

- **リアルタイム音声翻訳** — 話すだけで即座に翻訳、低レイテンシー
- **マルチプロバイダー対応** — Aliyun DashScope と OpenRouter から選択可能、複数のモデルに対応
- **マイク + システム音声キャプチャ** — 自分の声（マイク）や他者の声（システム音声）を翻訳
- **ローカル VAD 検出** — Silero VAD (ONNX) がブラウザ上でローカル推論、有効な音声セグメントのみ送信
- **バックエンド不要** — ユーザー自身の API Key を使用、中間サーバー不要
- **VRChat OSC 連携** — 翻訳結果を VRChat Chatbox に自動プッシュ
- **SteamVR オーバーレイ** — VR 内で翻訳結果を直接表示するオプションモード
- **多言語 UI** — English / 中文 / 日本語
- **ダッシュボードと履歴** — プロバイダー別の日次使用量・費用の追跡、過去の翻訳履歴の閲覧
- **アップデートチェッカー** — 新しいバージョンが利用可能な場合に通知

## クイックスタート

### 前提条件

- Node.js 20+

### インストール

```bash
make install
```

### 開発

```bash
make dev
```

### ビルド

```bash
cd client && npm run build
```

`client/release/` に Windows x64 NSIS インストーラーが生成されます。

## Windows 開発環境のセットアップ

### 必要な環境

- Windows 10/11（x64）
- Node.js 20+（[ダウンロード](https://nodejs.org/)）
- Git（[ダウンロード](https://git-scm.com/download/win)）

### 手順

1. **PowerShell を開く**（またはコマンドプロンプト）

2. **リポジトリをクローンして移動**
   ```powershell
   git clone https://github.com/MuoDoo/VRCFlow.git
   cd VRCFlow
   ```

3. **依存関係をインストールして起動**
   ```powershell
   cd client
   npm install
   npm run dev
   ```

### トラブルシューティング（Windows）

| 問題 | 解決方法 |
|------|----------|
| マイクが動作しない | Windows 設定 → プライバシー → マイクで、アプリのアクセスを許可 |
| OSC が動作しない | VRChat で OSC が有効であることを確認（デフォルトポート: 9000） |

## プロジェクト構成

```
vrcflow/
├── client/                  # Electron + Vite + React + TypeScript
│   ├── electron/            # メインプロセス（Provider API、OSC 送信、IPC bridge）
│   │   ├── main.ts          # エントリ + IPC ハンドラ + Provider ルーティング
│   │   ├── dashscope.ts     # DashScope WebSocket API クライアント
│   │   ├── openrouter.ts    # OpenRouter REST API クライアント
│   │   ├── osc.ts           # OSC UDP 送信
│   │   └── preload.ts       # contextBridge IPC
│   ├── src/                 # レンダラープロセス（React UI、VAD）
│   │   ├── lib/
│   │   │   ├── providers.ts # Provider/モデルレジストリ & コスト算出
│   │   │   └── wav.ts       # PCM → WAV エンコード
│   │   ├── hooks/
│   │   │   ├── useVAD.ts    # マイク VAD + 文字起こし
│   │   │   └── useSpeakerVAD.ts # システム音声 VAD + 文字起こし
│   │   └── components/      # React UI コンポーネント
│   └── electron-builder.yml # ビルド設定
├── docs/                    # ユーザーガイド（EN, ZH, JA）
└── Makefile                 # 開発コマンド
```

## Makefile コマンド

| コマンド | 説明 |
|----------|------|
| `make install` | 依存関係をインストール |
| `make dev` | Electron クライアント起動（Vite dev） |
| `make clean` | 全ビルド成果物と依存関係をクリーンアップ |

## 技術スタック

**クライアント**: Electron 40 · Vite 7 · React 19 · TypeScript · @ricky0123/vad-web (Silero VAD)

**音声認識/翻訳プロバイダー**：
- Aliyun DashScope — WebSocket API (gummy-chat-v1)、リアルタイムストリーミング
- OpenRouter — REST API、複数モデル対応（Voxtral Small 24B、Gemini 3.1 Flash Lite）

**CI/CD**: GitHub Actions — `v*` タグをプッシュすると Windows インストーラーを自動ビルドし Release を作成

## License

MIT
