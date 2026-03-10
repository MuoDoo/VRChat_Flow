import {
  app,
  BrowserWindow,
  desktopCapturer,
  ipcMain,
  session,
  shell,
} from "electron";
import path from "node:path";
import { sendChatbox } from "./osc";
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

  ipcMain.handle("shell:openExternal", (_event, url: string) => {
    shell.openExternal(url);
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
  if (process.platform !== "darwin") app.quit();
});
