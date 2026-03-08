# VRCFlow User Guide

[中文](USER_GUIDE_zh-CN.md) | [日本語](USER_GUIDE_ja.md) | English

VRCFlow is a real-time voice translation app for VRChat. Speak into your microphone — your speech is automatically recognized, translated, and displayed in VRChat's Chatbox.

## Download & Install (Windows)

1. Go to the [Releases page](https://github.com/MuoDoo/VRCFlow/releases)
2. Download the latest `.exe` installer (e.g. `VRCFlow-Setup-0.0.6.exe`)
3. Run the installer, choose your install location, and complete the setup
4. Launch **VRCFlow** from the Start menu or desktop shortcut

> The installer is for Windows x64 (Windows 10/11). No additional runtime is needed.

## Getting Started

### 1. Get a DashScope API Key

VRCFlow uses Alibaba Cloud's DashScope API for speech recognition and translation. You need your own API key:

1. Visit the [Alibaba Cloud Bailian API Key page](https://bailian.console.aliyun.com/cn-beijing/?apiKey=1&tab=model#/api-key)
2. Register an account if you don't have one (new users get 10 hours of free quota)
3. Create and copy your API key

### 2. Configure Settings

Click the **Settings** button (top-right corner) to open the settings panel:

| Setting | Description | Default |
|---------|-------------|---------|
| **DashScope API Key** | Your API key for speech recognition and translation | (required) |
| **OSC Port** | UDP port for VRChat OSC | `9000` |
| **Source Language** | Language you speak | Chinese |
| **Target Language** | Language to translate into | English |

Available languages: Chinese, English, Japanese, Korean.

### 3. Switch UI Language

Use the language dropdown (top-right area) to switch the interface between **English**, **中文**, and **日本語**. This setting is saved automatically.

## Using VRCFlow

### Start Translating

1. Click the green **Start** button at the bottom of the screen
2. Allow microphone access if prompted by your system
3. Status shows **"Listening..."** — speak normally
4. When you pause, VRCFlow automatically detects the end of your speech, sends it for recognition and translation
5. Results appear in the main area as cards showing:
   - Timestamp
   - Original text (what you said)
   - Translated text (in the target language)
6. The translated text is simultaneously sent to VRChat's Chatbox via OSC

> You are only charged for the time you are actually speaking. If you press Start but remain silent, no fees are incurred.

### Stop Translating

Click the red **Stop** button to stop listening.

### Status Indicators

| Status | Meaning |
|--------|---------|
| **Ready** | Idle, press Start to begin |
| **Listening...** | Microphone is active, waiting for speech |
| **Processing...** | Speech detected, recognizing and translating |
| Green dot | Listening |
| Orange dot | Processing a speech segment |

### Dashboard

Click the bar chart icon in the header to view your usage dashboard:
- Today's audio seconds, billed seconds, and estimated cost
- Noise detection stats (coughs, background sounds)
- Daily breakdown table

### History

Click the clock icon in the header to browse all past translations with timestamps and durations.

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

- Check that your DashScope API Key is correct in Settings
- Check your internet connection
- Your API quota may be exhausted — check your [Bailian console](https://bailian.console.aliyun.com/)
