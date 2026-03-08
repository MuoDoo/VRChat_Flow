import { useMemo } from "react";
import { useTranslation } from "react-i18next";

const HISTORY_KEY = "vrcflow-history";
const PRICE_PER_SEC = 0.00015;

interface StoredEntry {
  timestamp: string;
  audioDuration: number;
  isNoise?: boolean;
}

interface DayStat {
  date: string;
  audioSeconds: number;
  noiseSeconds: number;
  count: number;
}

function loadHistory(): StoredEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

export default function Dashboard({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();

  const { days, todayStats, totalSeconds, totalNoiseSeconds, totalCount } = useMemo(() => {
    const entries = loadHistory();
    const dayMap = new Map<string, { audioSeconds: number; noiseSeconds: number; count: number }>();

    let totalSec = 0;
    let totalNoise = 0;
    for (const e of entries) {
      const date = formatDate(e.timestamp);
      const existing = dayMap.get(date) || { audioSeconds: 0, noiseSeconds: 0, count: 0 };
      existing.audioSeconds += e.audioDuration;
      if (e.isNoise) existing.noiseSeconds += e.audioDuration;
      existing.count += 1;
      dayMap.set(date, existing);
      totalSec += e.audioDuration;
      if (e.isNoise) totalNoise += e.audioDuration;
    }

    const sorted: DayStat[] = Array.from(dayMap.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => b.date.localeCompare(a.date));

    const today = new Date().toISOString().slice(0, 10);
    const todayData = dayMap.get(today) || { audioSeconds: 0, noiseSeconds: 0, count: 0 };

    return {
      days: sorted,
      todayStats: todayData,
      totalSeconds: totalSec,
      totalNoiseSeconds: totalNoise,
      totalCount: entries.length,
    };
  }, []);

  const noisePercent = (sec: number, total: number) =>
    total > 0 ? ((sec / total) * 100).toFixed(1) : "0.0";

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>{t("dashboard.title")}</h3>
          <button onClick={onClose} style={styles.closeBtn}>&times;</button>
        </div>

        {/* Today's summary */}
        <div style={styles.todayCard}>
          <div style={styles.todayLabel}>{t("dashboard.today")}</div>
          <div style={styles.todayRow}>
            <div style={styles.stat}>
              <div style={styles.statValue}>{todayStats.audioSeconds.toFixed(1)}s</div>
              <div style={styles.statLabel}>{t("dashboard.audioSeconds")}</div>
            </div>
            <div style={styles.stat}>
              <div style={styles.statValue}>{(todayStats.audioSeconds * 2).toFixed(1)}s</div>
              <div style={styles.statLabel}>{t("dashboard.billedSeconds")}</div>
            </div>
            <div style={styles.stat}>
              <div style={styles.statValue}>¥{(todayStats.audioSeconds * 2 * PRICE_PER_SEC).toFixed(4)}</div>
              <div style={styles.statLabel}>{t("dashboard.cost")}</div>
            </div>
          </div>
          {todayStats.noiseSeconds > 0 && (
            <div style={styles.noiseRow}>
              {t("dashboard.noise")}: {todayStats.noiseSeconds.toFixed(1)}s
              ({noisePercent(todayStats.noiseSeconds, todayStats.audioSeconds)}%)
            </div>
          )}
          <div style={styles.todayCount}>
            {t("dashboard.entries", { count: todayStats.count })}
          </div>
        </div>

        {/* All-time total */}
        <div style={styles.totalRow}>
          <span style={styles.totalLabel}>{t("dashboard.total")}</span>
          <span style={styles.totalValue}>
            {totalCount} {t("dashboard.entriesUnit")} · {totalSeconds.toFixed(1)}s · ¥{(totalSeconds * 2 * PRICE_PER_SEC).toFixed(4)}
          </span>
        </div>
        {totalNoiseSeconds > 0 && (
          <div style={styles.noiseTotalRow}>
            {t("dashboard.noiseTotal")}: {totalNoiseSeconds.toFixed(1)}s
            ({noisePercent(totalNoiseSeconds, totalSeconds)}%)
            · ¥{(totalNoiseSeconds * 2 * PRICE_PER_SEC).toFixed(4)}
          </div>
        )}

        {/* Daily breakdown table */}
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>{t("dashboard.date")}</th>
                <th style={{ ...styles.th, textAlign: "right" }}>{t("dashboard.audioSeconds")}</th>
                <th style={{ ...styles.th, textAlign: "right" }}>{t("dashboard.noise")}</th>
                <th style={{ ...styles.th, textAlign: "right" }}>{t("dashboard.cost")}</th>
              </tr>
            </thead>
            <tbody>
              {days.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ ...styles.td, textAlign: "center", color: "#555" }}>
                    {t("dashboard.noData")}
                  </td>
                </tr>
              )}
              {days.map((day) => (
                <tr key={day.date}>
                  <td style={styles.td}>{day.date}</td>
                  <td style={{ ...styles.td, textAlign: "right" }}>{day.audioSeconds.toFixed(1)}s</td>
                  <td style={{ ...styles.td, textAlign: "right", color: day.noiseSeconds > 0 ? "#e67e22" : "#555" }}>
                    {day.noiseSeconds > 0
                      ? `${day.noiseSeconds.toFixed(1)}s (${noisePercent(day.noiseSeconds, day.audioSeconds)}%)`
                      : "-"}
                  </td>
                  <td style={{ ...styles.td, textAlign: "right" }}>¥{(day.audioSeconds * 2 * PRICE_PER_SEC).toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
    width: "380px",
    maxHeight: "80vh",
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
  todayCard: {
    backgroundColor: "#1a1a2e",
    borderRadius: "6px",
    padding: "12px",
  },
  todayLabel: {
    fontSize: "11px",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "8px",
  },
  todayRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "8px",
  },
  stat: { textAlign: "center", flex: 1 },
  statValue: { fontSize: "18px", fontWeight: 700, color: "#51cf66" },
  statLabel: { fontSize: "11px", color: "#888", marginTop: "2px" },
  noiseRow: {
    fontSize: "11px",
    color: "#e67e22",
    textAlign: "center",
    marginTop: "6px",
  },
  todayCount: {
    fontSize: "11px",
    color: "#666",
    textAlign: "center",
    marginTop: "4px",
  },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 12px",
    backgroundColor: "#1a1a2e",
    borderRadius: "6px",
  },
  totalLabel: { fontSize: "12px", color: "#888" },
  totalValue: { fontSize: "12px", color: "#ccc" },
  noiseTotalRow: {
    fontSize: "11px",
    color: "#e67e22",
    padding: "4px 12px",
    backgroundColor: "rgba(230,126,34,0.1)",
    borderRadius: "4px",
  },
  tableWrap: {
    flex: 1,
    overflowY: "auto",
    minHeight: 0,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "12px",
  },
  th: {
    textAlign: "left",
    padding: "6px 8px",
    color: "#888",
    borderBottom: "1px solid #333",
    fontWeight: 500,
  },
  td: {
    padding: "5px 8px",
    color: "#ccc",
    borderBottom: "1px solid #2a2a3e",
  },
};
