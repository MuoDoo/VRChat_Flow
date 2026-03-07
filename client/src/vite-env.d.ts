/// <reference types="vite/client" />

export {};

interface ElectronAPI {
  sendOsc: (message: string, port: number) => Promise<void>;
}

declare global {
  const __APP_VERSION__: string;
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
