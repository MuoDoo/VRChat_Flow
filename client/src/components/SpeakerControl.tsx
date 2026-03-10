import { useTranslation } from "react-i18next";
import { useSpeakerVAD } from "../hooks/useSpeakerVAD";

interface SpeakerControlProps {
  provider: string;
  apiKey: string;
  model: string;
  sourceLang: string;
  targetLang: string;
  volumeRef?: React.MutableRefObject<number>;
  onResult: (data: {
    transcription: string;
    translation: string;
    audioDuration: number;
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number; cost?: number };
    generationId?: string;
  }) => void;
  onError: (error: string) => void;
}

export default function SpeakerControl({
  provider,
  apiKey,
  model,
  sourceLang,
  targetLang,
  volumeRef,
  onResult,
  onError,
}: SpeakerControlProps) {
  const { t } = useTranslation();
  const { start, stop, isListening, isProcessing, vadLoading, vadError } =
    useSpeakerVAD({
      provider,
      apiKey,
      model,
      // Speaker capture translates others' speech — reverse the language pair
      sourceLang: targetLang,
      targetLang: sourceLang,
      volumeRef,
      onResult,
      onError,
    });

  const status = vadError
    ? String(vadError)
    : vadLoading
      ? "Loading VAD..."
      : isProcessing
        ? t("speaker.status.processing")
        : isListening
          ? t("speaker.status.listening")
          : t("speaker.status.idle");

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
              : "#2980b9",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="currentColor"
          style={{ marginRight: "6px", verticalAlign: "middle" }}
        >
          <path d="M11.536 14.01A8.47 8.47 0 0014.026 8a8.47 8.47 0 00-2.49-6.01l-.708.707A7.48 7.48 0 0113.026 8c0 2.071-.84 3.946-2.198 5.303l.708.707z" />
          <path d="M10.121 12.596A6.48 6.48 0 0012.026 8a6.48 6.48 0 00-1.905-4.596l-.707.707A5.48 5.48 0 0111.026 8a5.48 5.48 0 01-1.612 3.889l.707.707z" />
          <path d="M8.707 11.182A4.49 4.49 0 0010.026 8a4.49 4.49 0 00-1.319-3.182l-.707.707A3.49 3.49 0 019.026 8a3.49 3.49 0 01-1.026 2.475l.707.707z" />
          <path d="M6.717 3.55A.5.5 0 017 4v8a.5.5 0 01-.812.39L3.825 10.5H1.5A.5.5 0 011 10V6a.5.5 0 01.5-.5h2.325l2.363-1.89a.5.5 0 01.529-.06z" />
        </svg>
        {isListening ? t("speaker.stop") : t("speaker.start")}
      </button>
      {isListening && (
        <div
          style={{
            ...styles.indicator,
            backgroundColor: isProcessing ? "#e67e22" : "#2980b9",
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
    padding: "8px 16px 16px",
  },
  status: {
    fontSize: "13px",
    minWidth: "100px",
    textAlign: "right",
  },
  button: {
    padding: "10px 24px",
    borderRadius: "24px",
    border: "none",
    color: "#fff",
    fontSize: "14px",
    fontWeight: 600,
    transition: "background-color 0.2s",
    display: "flex",
    alignItems: "center",
  },
  indicator: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
  },
};
