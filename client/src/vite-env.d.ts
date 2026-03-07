/// <reference types="vite/client" />

export {};

interface ElectronAPI {
  sendOsc: (message: string, port: number) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
