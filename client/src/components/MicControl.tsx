import { useTranslation } from "react-i18next";
import { useVAD } from "../hooks/useVAD";

interface MicControlProps {
  provider: string;
  apiKey: string;
  model: string;
  sourceLang: string;
  targetLang: string;
  timeoutSec: number;
  speechPadMs: number;
  onResult: (data: {
    transcription: string;
    translation: string;
    audioDuration: number;
    processingTime: number;
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number; cost?: number };
    generationId?: string;
  }) => void;
  onError: (error: string) => void;
}

export default function MicControl({
  provider,
  apiKey,
  model,
  sourceLang,
  targetLang,
  timeoutSec,
  speechPadMs,
  onResult,
  onError,
}: MicControlProps) {
  const { t } = useTranslation();
  const { start, stop, isListening, isProcessing, vadLoading, vadError } = useVAD({
    provider,
    apiKey,
    model,
    sourceLang,
    targetLang,
    timeoutSec,
    speechPadMs,
    onResult,
    onError,
  });

  const status = vadError
    ? String(vadError)
    : vadLoading
      ? "Loading VAD..."
      : isProcessing
        ? t("mic.status.processing")
        : isListening
          ? t("mic.status.listening")
          : t("mic.status.idle");

  const disabled = vadLoading || !!vadError || !apiKey;

  return (
    <div style={styles.container}>
      <div style={{ ...styles.status, color: vadError ? "#ff6b6b" : "#888" }}>
        {status}
      </div>
      <button
        onClick={isListening ? stop : start}
        disabled={disabled}
        style={{
          ...styles.button,
          backgroundColor: disabled
            ? "#555"
            : isListening
              ? "#c0392b"
              : "#27ae60",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        {isListening ? t("mic.stop") : t("mic.start")}
      </button>
      {isListening && (
        <div
          style={{
            ...styles.indicator,
            backgroundColor: isProcessing ? "#e67e22" : "#27ae60",
          }}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    padding: "16px",
    borderTop: "1px solid #2a2a4a",
  },
  status: {
    fontSize: "13px",
    minWidth: "100px",
    textAlign: "right",
  },
  button: {
    padding: "12px 32px",
    borderRadius: "24px",
    border: "none",
    color: "#fff",
    fontSize: "16px",
    fontWeight: 600,
    transition: "background-color 0.2s",
  },
  indicator: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
  },
};
