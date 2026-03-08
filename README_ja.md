# VRCFlow

[English](./README.md) | [中文](./README.zh-CN.md) | 日本語

VRChat 向けリアルタイム音声翻訳デスクトップアプリ。

マイクで音声をキャプチャ → ローカル VAD でスライス → クラウド ASR 認識 + 翻訳 → OSC 経由で VRChat Chatbox に送信。

## ユーザーガイド

**VRCFlow を使いたいだけの方は** [ユーザーガイド](docs/USER_GUIDE_ja.md)（[English](docs/USER_GUIDE.md) | [中文](docs/USER_GUIDE_zh-CN.md)）をご覧ください。ダウンロード・インストール・使い方の説明があります。

以下は開発者向けの情報です。

---

## 主な機能

- **リアルタイム音声翻訳** — 話すだけで即座に翻訳、低レイテンシー
- **ローカル VAD 検出** — Silero VAD (ONNX) がブラウザ上でローカル推論、有効な音声セグメントのみアップロード
- **VRChat OSC 連携** — 翻訳結果を VRChat Chatbox に自動プッシュ
- **多言語 UI** — English / 中文 / 日本語
- **ユーザー管理** — 管理者承認制の登録、JWT 認証、管理者ダッシュボード
- **レート制限** — ユーザーごとの日次音声クォータで不正利用を防止
- **アップデートチェッカー** — 新しいバージョンが利用可能な場合に通知

## クイックスタート

### 前提条件

- Node.js 20+
- Python 3.11+
- [Alibaba DashScope API Key](https://dashscope.console.aliyun.com/)

### インストール

```bash
make install
```

### 設定

```bash
cp server/.env.example server/.env
```

`server/.env` を編集して認証情報を設定：

```env
DASHSCOPE_API_KEY=your_dashscope_api_key
JWT_SECRET=your_jwt_secret
```

### 開発

```bash
# バックエンド（バックグラウンド）とクライアントを同時に起動
make dev

# または個別に起動
make server    # フォアグラウンドでバックエンド起動
make client    # Electron クライアント起動
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
- Python 3.11+（[ダウンロード](https://www.python.org/downloads/)、インストール時に「Add to PATH」にチェック）
- Git（[ダウンロード](https://git-scm.com/download/win)）

### 手順

1. **PowerShell を開く**（またはコマンドプロンプト）

2. **リポジトリをクローンして移動**
   ```powershell
   git clone https://github.com/MuoDoo/VRChat_Flow.git
   cd VRChat_Flow
   ```

3. **サーバーをセットアップ**
   ```powershell
   cd server
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   copy .env.example .env
   ```
   メモ帳で `server\.env` を編集し、`DASHSCOPE_API_KEY` と `JWT_SECRET` を設定します。

4. **サーバーを起動**
   ```powershell
   cd server
   .venv\Scripts\activate
   python main.py
   ```

5. **クライアントをセットアップして起動**（新しいターミナルウィンドウを開く）
   ```powershell
   cd client
   npm install
   npm run dev
   ```

### トラブルシューティング（Windows）

| 問題 | 解決方法 |
|------|----------|
| `python` コマンドが見つからない | Python を「Add to PATH」にチェックを入れて再インストールするか、`py` コマンドを使用 |
| ポート 8080 が使用中 | `.env` で `PORT=8081` に変更し、クライアントの設定でサーバー URL を更新 |
| マイクが動作しない | Windows 設定 → プライバシー → マイクで、アプリのアクセスを許可 |
| OSC が動作しない | VRChat で OSC が有効であることを確認（デフォルトポート: 9000） |

## プロジェクト構成

```
vrcflow/
├── client/                  # Electron + Vite + React + TypeScript
│   ├── electron/            # メインプロセス（OSC 送信、IPC bridge）
│   ├── src/                 # レンダラープロセス（React UI、VAD、Auth）
│   └── electron-builder.yml # ビルド設定
├── server/                  # Python FastAPI バックエンド
│   ├── main.py              # アプリエントリ + 管理者ダッシュボード
│   ├── routers/             # API ルート（auth, transcribe, admin）
│   └── .env.example         # 環境変数テンプレート
├── docs/                    # ユーザーガイド（EN, ZH, JA）
└── Makefile                 # 開発コマンド
```

## Makefile コマンド

| コマンド | 説明 |
|----------|------|
| `make install` | 全依存関係をインストール（server venv + client npm） |
| `make dev` | バックエンド（バックグラウンド）+ クライアント起動 |
| `make server` | フォアグラウンドでバックエンド起動 |
| `make server-start` | バックグラウンドでバックエンド起動 |
| `make server-stop` | バックエンド停止 |
| `make server-status` | バックエンドのステータス確認 |
| `make server-log` | バックエンドのログ表示 |
| `make client` | Electron クライアント起動 |
| `make clean` | 全ビルド成果物と依存関係をクリーンアップ |

## 環境変数

| 変数 | 必須 | デフォルト | 説明 |
|------|------|-----------|------|
| `DASHSCOPE_API_KEY` | はい | - | DashScope API Key |
| `JWT_SECRET` | はい | - | JWT 署名シークレット |
| `DATABASE_PATH` | | `./vrcflow.db` | SQLite データベースパス |
| `MAX_USER_DAILY_SECONDS` | | `7200` | ユーザーごとの日次音声クォータ（秒） |
| `MAX_AUDIO_DURATION` | | `30` | 1回のアップロード最大音声秒数 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | | `15` | アクセストークン有効期間 |
| `REFRESH_TOKEN_EXPIRE_DAYS` | | `7` | リフレッシュトークン有効期間 |
| `PORT` | | `8080` | サーバーポート |
| `ADMIN_INIT_PASSWORD` | | ランダム | 初回起動時の管理者パスワード |

## 技術スタック

**クライアント**: Electron 40 · Vite 7 · React 19 · TypeScript · @ricky0123/vad-web (Silero VAD)

**サーバー**: Python 3.11+ · FastAPI · uvicorn · DashScope SDK · aiosqlite · PyJWT · passlib[bcrypt]

**CI/CD**: GitHub Actions — `v*` タグをプッシュすると Windows インストーラーを自動ビルドし Release を作成

## License

MIT
