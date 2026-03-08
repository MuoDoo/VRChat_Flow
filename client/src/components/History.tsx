import { useMemo } from "react";
import { useTranslation } from "react-i18next";

const HISTORY_KEY = "vrcflow-history";

interface StoredEntry {
  id: number;
  transcription: string;
  translation: string;
  timestamp: string;
  audioDuration: number;
  isNoise?: boolean;
}

interface DayGroup {
  date: string;
  entries: StoredEntry[];
  totalSeconds: number;
}

function loadHistory(): StoredEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function History({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();

  const groups = useMemo(() => {
    const entries = loadHistory().reverse();
    const dayMap = new Map<string, StoredEntry[]>();

    for (const e of entries) {
      const date = e.timestamp.slice(0, 10);
      const list = dayMap.get(date) || [];
      list.push(e);
      dayMap.set(date, list);
    }

    const result: DayGroup[] = [];
    for (const [date, list] of dayMap) {
      result.push({
        date,
        entries: list,
        totalSeconds: list.reduce((sum, e) => sum + e.audioDuration, 0),
      });
    }
    return result;
  }, []);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>{t("history.title")}</h3>
          <button onClick={onClose} style={styles.closeBtn}>&times;</button>
        </div>

        <div style={styles.list}>
          {groups.length === 0 && (
            <div style={styles.empty}>{t("history.noData")}</div>
          )}
          {groups.map((group) => (
            <div key={group.date}>
              <div style={styles.dateHeader}>
                <span>{group.date}</span>
                <span style={styles.daySummary}>
                  {group.entries.length} {t("history.entriesUnit")} · {group.totalSeconds.toFixed(1)}s
                </span>
              </div>
              {group.entries.map((entry, i) => (
                <div key={`${group.date}-${i}`} style={styles.entry}>
                  <div style={styles.entryHeader}>
                    <span style={styles.time}>
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                    <span style={styles.duration}>{entry.audioDuration.toFixed(1)}s</span>
                  </div>
                  {entry.isNoise ? (
                    <div style={styles.noise}>【{t("label.noise")}】</div>
                  ) : (
                    <>
                      <div style={styles.transcription}>{entry.transcription}</div>
                      <div style={styles.translation}>{entry.translation}</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  panel: {
    backgroundColor: "#222244",
    borderRadius: "8px",
    padding: "20px",
    width: "400px",
    maxHeight: "85vh",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { margin: 0, fontSize: "16px", color: "#fff" },
  closeBtn: {
    background: "none",
    border: "1px solid #444",
    color: "#aaa",
    cursor: "pointer",
    fontSize: "16px",
    padding: "4px 8px",
    borderRadius: "4px",
  },
  list: {
    flex: 1,
    overflowY: "auto",
    minHeight: 0,
  },
  empty: {
    textAlign: "center",
    color: "#555",
    fontSize: "13px",
    padding: "24px",
  },
  dateHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 4px 4px",
    fontSize: "12px",
    color: "#888",
    borderBottom: "1px solid #333",
    marginBottom: "6px",
    position: "sticky",
    top: 0,
    backgroundColor: "#222244",
  },
  daySummary: {
    fontSize: "11px",
    color: "#666",
  },
  entry: {
    marginBottom: "8px",
    padding: "8px 10px",
    backgroundColor: "#1a1a2e",
    borderRadius: "6px",
  },
  entryHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "4px",
  },
  time: { fontSize: "11px", color: "#555" },
  duration: { fontSize: "11px", color: "#666" },
  transcription: { fontSize: "13px", color: "#ccc", marginBottom: "2px" },
  translation: { fontSize: "13px", color: "#8b8bff" },
  noise: { fontSize: "13px", color: "#666", fontStyle: "italic" },
};
