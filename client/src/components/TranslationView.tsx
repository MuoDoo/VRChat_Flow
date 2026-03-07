import { useEffect, useRef } from "react";

interface TranslationEntry {
  id: number;
  transcription: string;
  translation: string;
  timestamp: Date;
}

interface TranslationViewProps {
  entries: TranslationEntry[];
}

export default function TranslationView({ entries }: TranslationViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length]);

  return (
    <div style={styles.container}>
      {entries.map((entry) => (
        <div key={entry.id} style={styles.entry}>
          <div style={styles.time}>
            {entry.timestamp.toLocaleTimeString()}
          </div>
          <div style={styles.transcription}>{entry.transcription}</div>
          <div style={styles.translation}>{entry.translation}</div>
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
    backgroundColor: "#222244",
    borderRadius: "6px",
  },
  time: {
    fontSize: "11px",
    color: "#555",
    marginBottom: "4px",
  },
  transcription: {
    fontSize: "14px",
    color: "#ccc",
    marginBottom: "4px",
  },
  translation: {
    fontSize: "14px",
    color: "#8b8bff",
  },
};
