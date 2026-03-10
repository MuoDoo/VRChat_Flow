/// <reference types="vite/client" />

export {};

interface TranscribeResult {
  transcription: string;
  translation: string;
  audioDuration: number;
}

interface OverlayInitResult {
  ok: boolean;
  error?: string;
}

interface ElectronAPI {
  sendOsc: (message: string, port: number) => Promise<void>;
  openExternal: (url: string) => Promise<void>;
  transcribe: (
    wavBuffer: ArrayBuffer,
    apiKey: string,
    sourceLang: string,
    targetLang: string
  ) => Promise<TranscribeResult>;

  // SteamVR Overlay
  overlayInit: () => Promise<OverlayInitResult>;
  overlayUpdate: (
    rgbaBuffer: ArrayBuffer,
    width: number,
    height: number
  ) => Promise<boolean>;
  overlayShow: () => Promise<boolean>;
  overlayHide: () => Promise<boolean>;
  overlayShutdown: () => Promise<void>;
}

declare global {
  const __APP_VERSION__: string;
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
