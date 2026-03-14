import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  sendOsc: (message: string, port: number) =>
    ipcRenderer.invoke("osc:send", message, port),
  isMuted: () => ipcRenderer.invoke("osc:isMuted") as Promise<boolean>,
  onMuteChanged: (callback: (muted: boolean) => void) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = (_event: any, muted: boolean) => callback(muted);
    ipcRenderer.on("osc:muteChanged", handler);
    return () => { ipcRenderer.removeListener("osc:muteChanged", handler); };
  },
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
