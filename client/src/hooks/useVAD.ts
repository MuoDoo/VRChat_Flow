import { useState, useCallback, useRef, useEffect } from "react";
import { useMicVAD } from "@ricky0123/vad-react";
import { encodeWAV } from "../lib/wav";

interface UseVADOptions {
  provider: string;
  apiKey: string;
  model: string;
  sourceLang: string;
  targetLang: string;
  timeoutSec: number;
  speechPadMs: number;
  micDeviceId?: string;
  onResult: (data: {
    transcription: string;
    translation: string;
    audioDuration: number;
    processingTime: number;
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number; cost?: number };
    generationId?: string;
    isNoise?: boolean;
  }) => void;
  onError: (error: string) => void;
}

interface UseVADReturn {
  start: () => void;
  stop: () => void;
  isListening: boolean;
  isProcessing: boolean;
  vadLoading: boolean;
  vadError: string | false;
}

export function useVAD(options: UseVADOptions): UseVADReturn {
  const { provider, apiKey, model, sourceLang, targetLang, timeoutSec, speechPadMs, micDeviceId, onResult, onError } =
    options;
  const [isProcessing, setIsProcessing] = useState(false);
  const inflightRef = useRef(false);
  const pendingRef = useRef<Float32Array | null>(null);

  // Refs to keep latest callbacks without re-triggering VAD re-init
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
  }, [onResult, onError]);

  const optionsRef = useRef({ provider, apiKey, model, sourceLang, targetLang, timeoutSec });
  useEffect(() => {
    optionsRef.current = { provider, apiKey, model, sourceLang, targetLang, timeoutSec };
  }, [provider, apiKey, model, sourceLang, targetLang, timeoutSec]);

  const uploadAudio = useCallback(async (audio: Float32Array) => {
    const { provider, apiKey, model, sourceLang, targetLang, timeoutSec } = optionsRef.current;

    if (!apiKey) {
      onErrorRef.current("API_KEY_REQUIRED");
      return;
    }

    if (!window.electronAPI) {
      onErrorRef.current("transcribeFailed");
      return;
    }

    const wavBuffer = encodeWAV(audio, 16000);
    const t0 = performance.now();
    const timeoutMs = timeoutSec * 1000;
    const result = await Promise.race([
      window.electronAPI.transcribe(wavBuffer, provider, apiKey, model, sourceLang, targetLang),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Processing timeout (${timeoutSec}s)`)), timeoutMs)
      ),
    ]);
    const processingTime = (performance.now() - t0) / 1000;

    onResultRef.current({
      transcription: result.transcription,
      translation: result.translation,
      audioDuration: result.audioDuration,
      processingTime,
      usage: result.usage,
      generationId: result.generationId,
      isNoise: result.isNoise,
    });
  }, []);

  const processQueue = useCallback(
    async (audio: Float32Array) => {
      if (inflightRef.current) {
        // Keep only the latest pending segment, discard older ones
        pendingRef.current = audio;
        return;
      }

      inflightRef.current = true;
      setIsProcessing(true);

      try {
        await uploadAudio(audio);
      } catch (e) {
        console.error("Transcribe error:", e);
        const msg = e instanceof Error ? e.message : "transcribeFailed";
        onErrorRef.current(msg);
      }

      inflightRef.current = false;

      // Process pending segment if any
      const pending = pendingRef.current;
      pendingRef.current = null;
      if (pending) {
        processQueue(pending);
      } else {
        setIsProcessing(false);
      }
    },
    [uploadAudio]
  );

  const useCustomDevice = micDeviceId && micDeviceId !== "default";

  const vad = useMicVAD({
    startOnLoad: false,
    model: "legacy",
    baseAssetPath: "./",
    onnxWASMBasePath: "./",
    positiveSpeechThreshold: 0.5,
    minSpeechMs: 150,
    preSpeechPadMs: 300,
    redemptionMs: speechPadMs,
    ...(useCustomDevice && {
      getStream: async () =>
        navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: micDeviceId } },
        }),
    }),
    onSpeechEnd: (audio: Float32Array) => {
      processQueue(audio);
    },
    onVADMisfire: () => {
      // Short speech segment, ignore
    },
  });

  const start = useCallback(async () => {
    if (vad.loading) {
      console.warn("VAD still loading, cannot start yet");
      return;
    }
    if (vad.errored) {
      console.error("VAD errored:", vad.errored);
      return;
    }
    await vad.start();
  }, [vad]);

  const stop = useCallback(async () => {
    await vad.pause();
  }, [vad]);

  return {
    start,
    stop,
    isListening: vad.listening,
    isProcessing,
    vadLoading: vad.loading,
    vadError: vad.errored,
  };
}
