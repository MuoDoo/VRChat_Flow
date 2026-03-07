import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  sendOsc: (message: string, port: number) =>
    ipcRenderer.invoke("osc:send", message, port),
});
