/// <reference types="vite/client" />

export {};

interface TranscribeResult {
  transcription: string;
  translation: string;
  audioDuration: number;
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
}

declare global {
  const __APP_VERSION__: string;
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
