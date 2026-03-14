import {
  app,
  BrowserWindow,
  desktopCapturer,
  ipcMain,
  session,
  shell,
} from "electron";
import path from "node:path";
import fs from "node:fs";
import { sendChatbox, startMuteListener, stopMuteListener, isMuted, oscEvents } from "./osc";
import { transcribeAudio } from "./dashscope";
import { transcribeAudioOpenRouter } from "./openrouter";
import {
  initOverlay,
  updateOverlayImage,
  showOverlay,
  hideOverlay,
  shutdownOverlay,
} from "./overlay";

process.env.DIST = path.join(__dirname, "../dist");

// --- Log file setup ---
const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5MB
let logFilePath = "";

function setupLogFile() {
  const logsDir = path.join(app.getPath("userData"), "logs");
  fs.mkdirSync(logsDir, { recursive: true });
  logFilePath = path.join(logsDir, "vrcflow.log");

  // Rotate: if log exceeds MAX_LOG_SIZE, keep last half
  try {
    const stat = fs.statSync(logFilePath);
    if (stat.size > MAX_LOG_SIZE) {
      const content = fs.readFileSync(logFilePath, "utf-8");
      const half = content.slice(content.length / 2);
      const firstNewline = half.indexOf("\n");
      fs.writeFileSync(logFilePath, firstNewline >= 0 ? half.slice(firstNewline + 1) : half);
    }
  } catch { /* file doesn't exist yet */ }

  const logStream = fs.createWriteStream(logFilePath, { flags: "a" });
  const timestamp = () => new Date().toISOString();

  const origLog = console.log;
  const origErr = console.error;
  const origWarn = console.warn;

  console.log = (...args: unknown[]) => {
    origLog(...args);
    logStream.write(`[${timestamp()}] [INFO] ${args.map(String).join(" ")}\n`);
  };
  console.error = (...args: unknown[]) => {
    origErr(...args);
    logStream.write(`[${timestamp()}] [ERROR] ${args.map(String).join(" ")}\n`);
  };
  console.warn = (...args: unknown[]) => {
    origWarn(...args);
    logStream.write(`[${timestamp()}] [WARN] ${args.map(String).join(" ")}\n`);
  };

  console.log("=== VRCFlow started ===");
}

// Enable system audio loopback capture (platform-specific flags)
if (process.platform === "darwin") {
  app.commandLine.appendSwitch(
    "enable-features",
    "MacLoopbackAudioForScreenShare,MacCatapSystemAudioLoopbackCapture"
  );
} else if (process.platform === "linux") {
  app.commandLine.appendSwitch(
    "enable-features",
    "PulseaudioLoopbackForScreenShare"
  );
}

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 720,
    minWidth: 400,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    autoHideMenuBar: true,
    backgroundColor: "#1a1a2e",
    title: "VRCFlow",
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(process.env.DIST!, "index.html"));
  }
}

app.whenReady().then(() => {
  setupLogFile();

  // Auto-grant loopback audio for speaker capture (no picker dialog)
  session.defaultSession.setDisplayMediaRequestHandler(
    (_request, callback) => {
      desktopCapturer.getSources({ types: ["screen"] }).then((sources) => {
        callback({ video: sources[0], audio: "loopback" });
      });
    }
  );

  createWindow();

  ipcMain.handle("osc:send", (_event, message: string, port: number) => {
    sendChatbox(message, port);
  });

  // VRChat mute detection — listen on VRChat's OSC output port (default 9001)
  startMuteListener(9001);

  ipcMain.handle("osc:isMuted", () => {
    return isMuted();
  });

  oscEvents.on("muteChanged", (muted: boolean) => {
    mainWindow?.webContents.send("osc:muteChanged", muted);
  });

  ipcMain.handle("shell:openExternal", (_event, url: string) => {
    shell.openExternal(url);
  });

  ipcMain.handle("log:openFile", () => {
    if (logFilePath) shell.showItemInFolder(logFilePath);
  });

  ipcMain.handle(
    "transcribe",
    async (
      _event,
      wavArrayBuffer: ArrayBuffer,
      provider: string,
      apiKey: string,
      model: string,
      sourceLang: string,
      targetLang: string
    ) => {
      const wavBuffer = Buffer.from(wavArrayBuffer);
      if (provider === "openrouter") {
        return transcribeAudioOpenRouter(wavBuffer, apiKey, model, sourceLang, targetLang);
      }
      return transcribeAudio(wavBuffer, apiKey, sourceLang, targetLang);
    }
  );

  // SteamVR Overlay IPC handlers
  ipcMain.handle("overlay:init", () => {
    return initOverlay();
  });

  ipcMain.handle(
    "overlay:update",
    (_event, rgbaBuffer: ArrayBuffer, width: number, height: number) => {
      return updateOverlayImage(Buffer.from(rgbaBuffer), width, height);
    }
  );

  ipcMain.handle("overlay:show", () => {
    return showOverlay();
  });

  ipcMain.handle("overlay:hide", () => {
    return hideOverlay();
  });

  ipcMain.handle("overlay:shutdown", () => {
    shutdownOverlay();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  shutdownOverlay();
  stopMuteListener();
  if (process.platform !== "darwin") app.quit();
});
