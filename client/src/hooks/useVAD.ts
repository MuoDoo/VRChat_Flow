import { useState, useCallback, useRef, useEffect } from "react";
import { useMicVAD } from "@ricky0123/vad-react";
import { encodeWAV } from "../lib/wav";
import { startVolumeMonitor } from "../lib/volumeMonitor";

interface UseVADOptions {
  apiKey: string;
  sourceLang: string;
  targetLang: string;
  volumeRef?: React.MutableRefObject<number>;
  onResult: (data: {
    transcription: string;
    translation: string;
    audioDuration: number;
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
  const { apiKey, sourceLang, targetLang, volumeRef, onResult, onError } =
    options;
  const [isProcessing, setIsProcessing] = useState(false);
  const inflightRef = useRef(false);
  const pendingRef = useRef<Float32Array | null>(null);
  const volumeCleanupRef = useRef<(() => void) | null>(null);
  const volumeRefStable = useRef(volumeRef);
  volumeRefStable.current = volumeRef;

  // Refs to keep latest callbacks without re-triggering VAD re-init
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
  }, [onResult, onError]);

  const optionsRef = useRef({ apiKey, sourceLang, targetLang });
  useEffect(() => {
    optionsRef.current = { apiKey, sourceLang, targetLang };
  }, [apiKey, sourceLang, targetLang]);

  const uploadAudio = useCallback(async (audio: Float32Array) => {
    const { apiKey, sourceLang, targetLang } = optionsRef.current;

    if (!apiKey) {
      onErrorRef.current("API_KEY_REQUIRED");
      return;
    }

    if (!window.electronAPI) {
      onErrorRef.current("transcribeFailed");
      return;
    }

    const wavBuffer = encodeWAV(audio, 16000);
    const result = await window.electronAPI.transcribe(
      wavBuffer,
      apiKey,
      sourceLang,
      targetLang
    );

    onResultRef.current({
      transcription: result.transcription,
      translation: result.translation,
      audioDuration: result.audioDuration,
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
        onErrorRef.current("transcribeFailed");
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

  const vad = useMicVAD({
    startOnLoad: false,
    model: "legacy",
    baseAssetPath: "./",
    onnxWASMBasePath: "./",
    positiveSpeechThreshold: 0.5,
    minSpeechMs: 150,
    preSpeechPadMs: 300,
    redemptionMs: 250,
    getStream: async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      // Set up volume monitoring
      volumeCleanupRef.current?.();
      if (volumeRefStable.current) {
        volumeCleanupRef.current = startVolumeMonitor(
          stream,
          volumeRefStable.current
        );
      }
      return stream;
    },
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
    volumeCleanupRef.current?.();
    volumeCleanupRef.current = null;
    await vad.pause();
  }, [vad]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      volumeCleanupRef.current?.();
    };
  }, []);

  return {
    start,
    stop,
    isListening: vad.listening,
    isProcessing,
    vadLoading: vad.loading,
    vadError: vad.errored,
  };
}
