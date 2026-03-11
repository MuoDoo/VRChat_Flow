# VRCFlow User Guide

[中文](USER_GUIDE_zh-CN.md) | [日本語](USER_GUIDE_ja.md) | English

VRCFlow is a real-time voice translation app for VRChat. Speak into your microphone — your speech is automatically recognized, translated, and displayed in VRChat's Chatbox.

## Download & Install (Windows)

1. Go to the [Releases page](https://github.com/MuoDoo/VRCFlow/releases)
2. Download the latest `.exe` installer
3. Run the installer, choose your install location, and complete the setup
4. Launch **VRCFlow** from the Start menu or desktop shortcut

> The installer is for Windows x64 (Windows 10/11). No additional runtime is needed.

## Getting Started

### 1. Choose a Provider

VRCFlow supports multiple ASR/translation providers. Open **Settings** (top-right corner) and go to the **Provider** tab to select one.

#### Aliyun DashScope

The original built-in provider. Uses Alibaba Cloud's real-time WebSocket API for simultaneous speech recognition and translation.

**Model: gummy-chat-v1**

| Feature | Details |
|---------|---------|
| **Protocol** | WebSocket duplex streaming (real-time) |
| **ASR + Translation** | Simultaneous recognition and translation in one call |
| **Supported Languages** | Chinese, English, Japanese, Korean |
| **Pricing** | ¥0.00015/second per channel, dual-billed (ASR + translation = 2× duration) |
| **Free Tier** | New users get 10 hours of free quota |
| **Billing Model** | Only charged for actual speech duration |

**Advantages:**
- Ultra-low latency — real-time streaming, results appear as you speak
- Optimized for short voice segments in VRChat conversations
- Simple pricing, no token calculation needed
- Great value for Chinese ↔ other language translation

**How to get the API Key:**
1. Visit the [Alibaba Cloud Bailian API Key page](https://bailian.console.aliyun.com/cn-beijing/?apiKey=1&tab=model#/api-key)
2. Register an account if you don't have one (new users get 10 hours of free quota)
3. Create and copy your API key

#### OpenRouter

An alternative provider that routes to multiple AI models through a unified API. Offers model selection flexibility and transparent pricing.

**How to get the API Key:**
1. Visit [OpenRouter Keys](https://openrouter.ai/keys)
2. Create an account and generate an API key
3. Add credits to your account

##### Model: Voxtral Small 24B (Recommended)

Mistral's audio-capable model with state-of-the-art speech transcription and translation.

| Feature | Details |
|---------|---------|
| **Provider** | Mistral AI (via OpenRouter) |
| **Protocol** | REST API with function calling |
| **Context Window** | 32K tokens |
| **Max Output** | 8,192 tokens |
| **Audio Input Pricing** | $100 / 1M seconds (~$0.006/min) |
| **Text Input Pricing** | $0.10 / 1M tokens |
| **Text Output Pricing** | $0.30 / 1M tokens |
| **Audio Formats** | WAV, MP3, FLAC, Opus, OGG |

**Advantages:**
- Best-in-class speech transcription and translation accuracy
- Very low cost for short audio segments (ideal for VRChat)
- Retains strong text understanding performance
- Supports function calling for structured output

##### Model: Gemini 3.1 Flash Lite

Google's high-efficiency model optimized for high-volume, cost-sensitive use cases.

| Feature | Details |
|---------|---------|
| **Provider** | Google (via OpenRouter) |
| **Protocol** | REST API with function calling |
| **Context Window** | 1M tokens |
| **Max Output** | 65,536 tokens |
| **Audio Input Pricing** | $0.50 / 1M tokens |
| **Text Input Pricing** | $0.25 / 1M tokens |
| **Text Output Pricing** | $1.50 / 1M tokens |
| **Audio Formats** | WAV, MP3, FLAC, Opus, OGG |

**Advantages:**
- Massive 1M token context window
- Supports text, image, video, file, and audio input
- Implicit caching support (cache read: $0.025/1M tokens)
- Half the cost of Gemini 3 Flash

### Provider Comparison

| | DashScope | OpenRouter (Voxtral) | OpenRouter (Gemini) |
|---|---|---|---|
| **Best For** | Chinese ↔ other languages, lowest latency | Best accuracy, short clips | High-volume, budget-conscious |
| **Latency** | Real-time streaming | REST (one-shot) | REST (one-shot) |
| **Pricing Model** | Per-second | Per-second + per-token | Per-token |
| **Approx. Cost/min** | ~¥0.018 (~$0.0025) | ~$0.006 | Varies by audio length |
| **Free Tier** | 10 hours free | No | No |
| **Model Choice** | Fixed (gummy-chat-v1) | Selectable | Selectable |

### 2. Configure Settings

Click the **Settings** button (top-right corner) to open the settings panel:

**Provider Tab:**

| Setting | Description |
|---------|-------------|
| **Provider** | Choose between DashScope and OpenRouter |
| **API Key** | Your API key for the selected provider |
| **Model** | Model selection (OpenRouter only) |

**General Tab:**

| Setting | Description | Default |
|---------|-------------|---------|
| **Source Language** | Language you speak | Chinese |
| **Target Language** | Language to translate into | English |
| **OSC Port** | UDP port for VRChat OSC | `9000` |
| **SteamVR Overlay** | Enable/disable VR overlay display | Off |
| **Processing Timeout** | Max seconds to wait for API response | `5` |
| **Speech Pad** | Silence padding before end-of-speech detection (ms) | `600` |
| **Display Currency** | Currency for cost display (CNY/USD/JPY) | CNY |

Available languages: Chinese, English, Japanese, Korean.

### 3. Switch UI Language

Use the language dropdown (top-right area) to switch the interface between **English**, **中文**, and **日本語**. This setting is saved automatically.

## Using VRCFlow

### Microphone Translation

1. Click the green **Start** button at the bottom of the screen
2. Allow microphone access if prompted by your system
3. Status shows **"Listening..."** — speak normally
4. When you pause, VRCFlow automatically detects the end of your speech, sends it for recognition and translation
5. Results appear in the main area as cards showing:
   - Timestamp
   - Original text (what you said)
   - Translated text (in the target language)
   - Provider and processing info
6. The translated text is simultaneously sent to VRChat's Chatbox via OSC

> You are only charged for the time you are actually speaking. If you press Start but remain silent, no fees are incurred.

### Speaker / System Audio Translation

VRCFlow can also capture and translate system audio (e.g., what others are saying in VRChat):

1. Click the **Speaker** tab at the bottom
2. Click **Start** to begin capturing system audio
3. The app captures desktop audio, applies VAD, and translates detected speech
4. Results appear alongside microphone translations, tagged with a speaker icon

> This feature is useful for translating what others are saying in voice chat.

### SteamVR Overlay

Enable the overlay in Settings → General → SteamVR Overlay to display translation results as a floating panel in VR:

- Shows recent translations overlaid in your VR view
- Messages auto-expire after 8 seconds
- Up to 3 messages displayed simultaneously

### Stop Translating

Click the red **Stop** button to stop listening.

### Status Indicators

| Status | Meaning |
|--------|---------|
| **Ready** | Idle, press Start to begin |
| **Listening...** | Microphone/speaker is active, waiting for speech |
| **Processing...** | Speech detected, recognizing and translating |
| Green dot | Listening |
| Orange dot | Processing a speech segment |

### Dashboard

Click the bar chart icon in the header to view your usage dashboard:
- Cost breakdown by provider (DashScope in CNY, OpenRouter in USD)
- Today's audio seconds, billed seconds, and estimated cost
- Noise detection stats (coughs, background sounds)
- Daily breakdown table with per-provider details
- Currency conversion support (CNY / USD / JPY)

### History

Click the clock icon in the header to browse all past translations with timestamps, durations, provider info, and token usage.

## VRChat Setup

To see translations in VRChat's Chatbox:

1. Open VRChat
2. Open your **Action Menu** (R key on desktop)
3. Go to **Options** → **OSC** → **Enable**
4. Make sure VRCFlow's OSC Port is set to **9000** (VRChat's default)
5. Your translations will appear above your avatar in the Chatbox

> If VRChat and VRCFlow are on the same computer, everything works out of the box.

## Troubleshooting

### Microphone Not Working

- **Windows**: Go to Settings → Privacy & Security → Microphone, make sure app access is enabled
- Check that your microphone is set as the default recording device in Windows Sound Settings
- Try closing other apps that might be using the microphone

### Translations Not Showing in VRChat

- Confirm OSC is enabled in VRChat (Action Menu → Options → OSC → Enable)
- Check that VRCFlow's OSC Port matches VRChat's (default: 9000)
- Restart VRChat if you just enabled OSC for the first time

### App Shows "Loading VAD..."

The voice detection model is loading. This takes a few seconds on first launch. If it stays stuck, try restarting the app.

### Recognition Failed

- Check that your API Key is correct in Settings (make sure it matches your selected provider)
- Check your internet connection
- **DashScope**: Your API quota may be exhausted — check your [Bailian console](https://bailian.console.aliyun.com/)
- **OpenRouter**: Check your credit balance at [OpenRouter](https://openrouter.ai/credits)

### High Latency or Timeout

- Try reducing the **Speech Pad** value in Settings → General → Advanced
- Try a different provider or model
- Check your network connection stability
