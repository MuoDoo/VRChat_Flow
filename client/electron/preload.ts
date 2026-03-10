import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  sendOsc: (message: string, port: number) =>
    ipcRenderer.invoke("osc:send", message, port),
  openExternal: (url: string) =>
    ipcRenderer.invoke("shell:openExternal", url),
  openLogFile: () => ipcRenderer.invoke("log:openFile"),
  transcribe: (
    wavBuffer: ArrayBuffer,
    provider: string,
    apiKey: string,
    model: string,
    sourceLang: string,
    targetLang: string
  ) => ipcRenderer.invoke("transcribe", wavBuffer, provider, apiKey, model, sourceLang, targetLang),

  // SteamVR Overlay
  overlayInit: () => ipcRenderer.invoke("overlay:init"),
  overlayUpdate: (rgbaBuffer: ArrayBuffer, width: number, height: number) =>
    ipcRenderer.invoke("overlay:update", rgbaBuffer, width, height),
  overlayShow: () => ipcRenderer.invoke("overlay:show"),
  overlayHide: () => ipcRenderer.invoke("overlay:hide"),
  overlayShutdown: () => ipcRenderer.invoke("overlay:shutdown"),
});
