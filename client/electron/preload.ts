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
});
