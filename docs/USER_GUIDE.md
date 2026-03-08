# VRCFlow User Guide

[中文](USER_GUIDE_zh-CN.md) | [日本語](USER_GUIDE_ja.md) | English

VRCFlow is a real-time voice translation app for VRChat. Speak into your microphone — your speech is automatically recognized, translated, and displayed in VRChat's Chatbox.

## Download & Install (Windows)

1. Go to the [Releases page](https://github.com/MuoDoo/VRChat_Flow/releases)
2. Download the latest `.exe` installer (e.g. `VRCFlow-Setup-0.0.5.exe`)
3. Run the installer, choose your install location, and complete the setup
4. Launch **VRCFlow** from the Start menu or desktop shortcut

> The installer is for Windows x64 (Windows 10/11). No additional runtime is needed for the client.

## Getting Started

### 1. Register an Account

When you open VRCFlow for the first time, you'll see the login screen.

1. Click **"Don't have an account? Sign up"** at the bottom
2. Enter a username (3–20 characters, letters/numbers/underscore) and password (8+ characters)
3. Click **Sign up**
4. You'll see: *"Registration successful. Please wait for admin approval."*

Your account needs to be approved by an administrator before you can use it. Contact your server administrator and wait for activation.

### 2. Log In

Once your account is approved:

1. Enter your username and password
2. Click **Log in**
3. You'll be taken to the main screen

### 3. Configure Settings

Click the **Settings** button (top-right corner) to open the settings panel:

| Setting | Description | Default |
|---------|-------------|---------|
| **Server URL** | Address of the VRCFlow server | `https://vrcflow.com` |
| **OSC Port** | UDP port for VRChat OSC | `9000` |
| **Source Language** | Language you speak | Chinese |
| **Target Language** | Language to translate into | English |

Available languages: Chinese, English, Japanese, Korean.

Click **Settings** button inside the panel to save, or **×** to cancel.

### 4. Switch UI Language

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

### Stop Translating

Click the red **Stop** button to stop listening.

### Status Indicators

| Status | Meaning |
|--------|---------|
| **Ready** | Idle, press Start to begin |
| **Listening...** | Microphone is active, waiting for speech |
| **Processing...** | Speech detected, sending to server for translation |
| Green dot | Listening |
| Orange dot | Processing a speech segment |

### Daily Usage Quota

Each account has a daily usage limit (shown in Settings after your first translation). The remaining seconds reset every day.

## VRChat Setup

To see translations in VRChat's Chatbox:

1. Open VRChat
2. Open your **Action Menu** (R key on desktop)
3. Go to **Options** → **OSC** → **Enable**
4. Make sure VRCFlow's OSC Port is set to **9000** (VRChat's default)
5. Your translations will appear above your avatar in the Chatbox

> If VRChat and VRCFlow are on the same computer, everything works out of the box. If they're on different machines, set the OSC target IP in VRCFlow's Server URL settings accordingly.

## Troubleshooting

### Microphone Not Working

- **Windows**: Go to Settings → Privacy & Security → Microphone, make sure app access is enabled
- Check that your microphone is set as the default recording device in Windows Sound Settings
- Try closing other apps that might be using the microphone

### "Account not yet activated"

Your account hasn't been approved by the admin yet. Contact the server administrator.

### "Session expired, please log in again"

Your login session has expired. Simply log in again with your credentials.

### "Daily limit reached"

You've used all your daily quota. The limit resets at midnight (server time). Try again tomorrow.

### Translations Not Showing in VRChat

- Confirm OSC is enabled in VRChat (Action Menu → Options → OSC → Enable)
- Check that VRCFlow's OSC Port matches VRChat's (default: 9000)
- Restart VRChat if you just enabled OSC for the first time

### App Shows "Loading VAD..."

The voice detection model is loading. This takes a few seconds on first launch. If it stays stuck, try restarting the app.

### Cannot Connect to Server

- Check your internet connection
- Verify the Server URL in Settings is correct
- The server may be temporarily unavailable — try again later
