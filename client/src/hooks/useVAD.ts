import { useState, useCallback, useRef, useEffect } from "react";
import { useMicVAD } from "@ricky0123/vad-react";
import { encodeWAV } from "../lib/wav";

interface UseVADOptions {
  serverUrl: string;
  sourceLang: string;
  targetLang: string;
  getAccessToken: () => Promise<string | null>;
  onResult: (data: {
    transcription: string;
    translation: string;
    remaining: number;
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
  const {
    serverUrl,
    sourceLang,
    targetLang,
    getAccessToken,
    onResult,
    onError,
  } = options;
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

  const optionsRef = useRef({ serverUrl, sourceLang, targetLang, getAccessToken });
  useEffect(() => {
    optionsRef.current = { serverUrl, sourceLang, targetLang, getAccessToken };
  }, [serverUrl, sourceLang, targetLang, getAccessToken]);

  const uploadAudio = useCallback(async (audio: Float32Array) => {
    const { serverUrl, sourceLang, targetLang, getAccessToken } = optionsRef.current;

    const token = await getAccessToken();
    if (!token) {
      onErrorRef.current("AUTH_INVALID_TOKEN");
      return;
    }

    const blob = encodeWAV(audio, 16000);
    const formData = new FormData();
    formData.append("file", blob, "audio.wav");
    formData.append("source_lang", sourceLang);
    formData.append("target_lang", targetLang);

    const res = await fetch(`${serverUrl}/transcribe`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (res.status === 401) {
      // Try refresh once
      const newToken = await getAccessToken();
      if (!newToken) {
        onErrorRef.current("AUTH_INVALID_TOKEN");
        return;
      }
      const retry = await fetch(`${serverUrl}/transcribe`, {
        method: "POST",
        headers: { Authorization: `Bearer ${newToken}` },
        body: formData,
      });
      if (!retry.ok) {
        const err = await retry.json().catch(() => null);
        onErrorRef.current(err?.detail?.code || "transcribeFailed");
        return;
      }
      const data = await retry.json();
      onResultRef.current({
        transcription: data.transcription,
        translation: data.translation,
        remaining: data.remaining_seconds,
      });
      return;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      onErrorRef.current(err?.detail?.code || "transcribeFailed");
      return;
    }

    const data = await res.json();
    onResultRef.current({
      transcription: data.transcription,
      translation: data.translation,
      remaining: data.remaining_seconds,
    });
  }, []);

  const processQueue = useCallback(async (audio: Float32Array) => {
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
      console.error("Upload error:", e);
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
  }, [uploadAudio]);

  const vad = useMicVAD({
    startOnLoad: false,
    model: "legacy",
    baseAssetPath: "./",
    onnxWASMBasePath: "./",
    positiveSpeechThreshold: 0.5,
    minSpeechMs: 150,
    preSpeechPadMs: 300,
    redemptionMs: 250,
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
