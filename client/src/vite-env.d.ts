/// <reference types="vite/client" />

export {};

interface UsageInfo {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost?: number;
}

interface TranscribeResult {
  transcription: string;
  translation: string;
  audioDuration: number;
  usage?: UsageInfo;
  generationId?: string;
  isNoise?: boolean;
}

interface OverlayInitResult {
  ok: boolean;
  error?: string;
}

interface ElectronAPI {
  sendOsc: (message: string, port: number) => Promise<void>;
  openExternal: (url: string) => Promise<void>;
  openLogFile: () => Promise<void>;
  transcribe: (
    wavBuffer: ArrayBuffer,
    provider: string,
    apiKey: string,
    model: string,
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
