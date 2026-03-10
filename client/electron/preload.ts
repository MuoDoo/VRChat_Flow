import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  sendOsc: (message: string, port: number) =>
    ipcRenderer.invoke("osc:send", message, port),
  openExternal: (url: string) =>
    ipcRenderer.invoke("shell:openExternal", url),
  transcribe: (
    wavBuffer: ArrayBuffer,
    apiKey: string,
    sourceLang: string,
    targetLang: string
  ) => ipcRenderer.invoke("transcribe", wavBuffer, apiKey, sourceLang, targetLang),

  // SteamVR Overlay
  overlayInit: () => ipcRenderer.invoke("overlay:init"),
  overlayUpdate: (rgbaBuffer: ArrayBuffer, width: number, height: number) =>
    ipcRenderer.invoke("overlay:update", rgbaBuffer, width, height),
  overlayShow: () => ipcRenderer.invoke("overlay:show"),
  overlayHide: () => ipcRenderer.invoke("overlay:hide"),
  overlayShutdown: () => ipcRenderer.invoke("overlay:shutdown"),
});
