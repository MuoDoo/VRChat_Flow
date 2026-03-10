import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

interface TranslationEntry {
  id: number;
  transcription: string;
  translation: string;
  timestamp: Date;
  audioDuration: number;
  source: "mic" | "speaker";
}

interface TranslationViewProps {
  entries: TranslationEntry[];
}

export default function TranslationView({ entries }: TranslationViewProps) {
  const { t } = useTranslation();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length]);

  return (
    <div style={styles.container}>
      {entries.map((entry) => (
        <div
          key={entry.id}
          style={{
            ...styles.entry,
            backgroundColor:
              entry.source === "speaker" ? "#1e2a44" : "#222244",
            borderLeft:
              entry.source === "speaker"
                ? "3px solid #2980b9"
                : "3px solid transparent",
          }}
        >
          <div style={styles.entryHeader}>
            <div style={styles.headerLeft}>
              {entry.source === "speaker" && (
                <span style={styles.speakerBadge}>
                  {t("label.speaker")}
                </span>
              )}
              <div style={styles.time}>
                {entry.timestamp.toLocaleTimeString()}
              </div>
            </div>
            <div style={styles.duration}>
              {entry.audioDuration.toFixed(1)}s
            </div>
          </div>
          <div style={styles.transcription}>{entry.transcription}</div>
          <div
            style={{
              ...styles.translation,
              color: entry.source === "speaker" ? "#5dade2" : "#8b8bff",
            }}
          >
            {entry.translation}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    overflowY: "auto",
    padding: "12px 16px",
  },
  entry: {
    marginBottom: "12px",
    padding: "10px 12px",
    borderRadius: "6px",
  },
  entryHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "4px",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  speakerBadge: {
    fontSize: "10px",
    color: "#5dade2",
    backgroundColor: "rgba(41, 128, 185, 0.2)",
    padding: "1px 5px",
    borderRadius: "3px",
    fontWeight: 600,
  },
  time: {
    fontSize: "11px",
    color: "#555",
  },
  duration: {
    fontSize: "11px",
    color: "#666",
  },
  transcription: {
    fontSize: "14px",
    color: "#ccc",
    marginBottom: "4px",
  },
  translation: {
    fontSize: "14px",
  },
};
