import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { sendChatbox } from "./osc";

process.env.DIST = path.join(__dirname, "../dist");

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
  createWindow();

  ipcMain.handle("osc:send", (_event, message: string, port: number) => {
    sendChatbox(message, port);
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
