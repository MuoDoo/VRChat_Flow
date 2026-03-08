import { useState, useCallback, useRef, useEffect } from "react";
import { useMicVAD } from "@ricky0123/vad-react";
import { encodeWAV } from "../lib/wav";

interface UseSpeakerVADOptions {
  apiKey: string;
  sourceLang: string;
  targetLang: string;
  onResult: (data: {
    transcription: string;
    translation: string;
    audioDuration: number;
  }) => void;
  onError: (error: string) => void;
}

interface UseSpeakerVADReturn {
  start: () => void;
  stop: () => void;
  isListening: boolean;
  isProcessing: boolean;
  vadLoading: boolean;
  vadError: string | false;
}

async function getLoopbackStream(): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: true,
  });
  // Remove video tracks — we only need system audio loopback
  stream.getVideoTracks().forEach((t) => {
    t.stop();
    stream.removeTrack(t);
  });
  return stream;
}

export function useSpeakerVAD(
  options: UseSpeakerVADOptions
): UseSpeakerVADReturn {
  const { apiKey, sourceLang, targetLang, onResult, onError } = options;
  const [isProcessing, setIsProcessing] = useState(false);
  const inflightRef = useRef(false);
  const pendingRef = useRef<Float32Array | null>(null);

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
        pendingRef.current = audio;
        return;
      }

      inflightRef.current = true;
      setIsProcessing(true);

      try {
        await uploadAudio(audio);
      } catch (e) {
        console.error("Speaker transcribe error:", e);
        onErrorRef.current("transcribeFailed");
      }

      inflightRef.current = false;

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
    // Override stream source to capture system audio loopback
    getStream: getLoopbackStream,
    onSpeechEnd: (audio: Float32Array) => {
      processQueue(audio);
    },
    onVADMisfire: () => {
      // Short speech segment, ignore
    },
  });

  const start = useCallback(async () => {
    if (vad.loading) {
      console.warn("Speaker VAD still loading");
      return;
    }
    if (vad.errored) {
      console.error("Speaker VAD errored:", vad.errored);
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
