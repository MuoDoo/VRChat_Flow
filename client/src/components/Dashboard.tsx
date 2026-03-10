import { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  type CurrencyCode,
  getCachedRates,
  getExchangeRates,
  convertCurrency,
  formatCurrency,
} from "../lib/currency";

const HISTORY_KEY = "vrcflow-history";
const DASHSCOPE_PRICE_PER_SEC = 0.00015; // CNY/s per channel, 2 channels (ASR + translation)

interface StoredEntry {
  timestamp: string;
  audioDuration: number;
  isNoise?: boolean;
  provider?: string;
  model?: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number; cost?: number };
}

interface DayStat {
  date: string;
  count: number;
  noiseSeconds: number;
  audioSeconds: number;
  dashscopeCostCNY: number;
  dashscopeCount: number;
  openrouterCostUSD: number;
  openrouterCount: number;
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
  const displayCurrency = (localStorage.getItem("vrcflow-displayCurrency") || "CNY") as CurrencyCode;
  const [rates, setRates] = useState(getCachedRates);

  // Fetch fresh rates on mount
  useEffect(() => {
    getExchangeRates().then(setRates);
  }, []);

  const fmt = (amount: number, from: "CNY" | "USD") =>
    formatCurrency(convertCurrency(amount, from, displayCurrency, rates), displayCurrency);

  const fmtTotal = (cnyCost: number, usdCost: number) => {
    const total =
      convertCurrency(cnyCost, "CNY", displayCurrency, rates) +
      convertCurrency(usdCost, "USD", displayCurrency, rates);
    return formatCurrency(total, displayCurrency);
  };

  const { days, todayStats, totals } = useMemo(() => {
    const entries = loadHistory();
    const dayMap = new Map<string, DayStat>();

    let totalNoiseSec = 0;
    let totalAudioSec = 0;
    let totalDashscopeCNY = 0;
    let totalDashscopeCount = 0;
    let totalOpenrouterUSD = 0;
    let totalOpenrouterCount = 0;
    let totalCount = 0;

    for (const e of entries) {
      const date = formatDate(e.timestamp);
      const existing = dayMap.get(date) || {
        date,
        count: 0,
        noiseSeconds: 0,
        audioSeconds: 0,
        dashscopeCostCNY: 0,
        dashscopeCount: 0,
        openrouterCostUSD: 0,
        openrouterCount: 0,
      };

      existing.count += 1;
      existing.audioSeconds += e.audioDuration;
      if (e.isNoise) existing.noiseSeconds += e.audioDuration;
      totalCount += 1;
      totalAudioSec += e.audioDuration;
      if (e.isNoise) totalNoiseSec += e.audioDuration;

      const prov = e.provider || "dashscope";
      if (prov === "openrouter" && e.usage) {
        const cost = e.usage.cost ?? 0;
        existing.openrouterCostUSD += cost;
        existing.openrouterCount += 1;
        totalOpenrouterUSD += cost;
        totalOpenrouterCount += 1;
      } else {
        const cost = e.audioDuration * 2 * DASHSCOPE_PRICE_PER_SEC;
        existing.dashscopeCostCNY += cost;
        existing.dashscopeCount += 1;
        totalDashscopeCNY += cost;
        totalDashscopeCount += 1;
      }

      dayMap.set(date, existing);
    }

    const sorted = Array.from(dayMap.values()).sort((a, b) => b.date.localeCompare(a.date));
    const today = new Date().toISOString().slice(0, 10);
    const todayData = dayMap.get(today) || {
      date: today,
      count: 0,
      noiseSeconds: 0,
      audioSeconds: 0,
      dashscopeCostCNY: 0,
      dashscopeCount: 0,
      openrouterCostUSD: 0,
      openrouterCount: 0,
    };

    return {
      days: sorted,
      todayStats: todayData,
      totals: {
        count: totalCount,
        noiseSeconds: totalNoiseSec,
        audioSeconds: totalAudioSec,
        dashscopeCostCNY: totalDashscopeCNY,
        dashscopeCount: totalDashscopeCount,
        openrouterCostUSD: totalOpenrouterUSD,
        openrouterCount: totalOpenrouterCount,
      },
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

          {todayStats.dashscopeCount > 0 && (
            <div style={styles.providerBlock}>
              <div style={styles.providerTag}>DashScope</div>
              <div style={styles.todayRow}>
                <div style={styles.stat}>
                  <div style={styles.statValue}>{todayStats.dashscopeCount}</div>
                  <div style={styles.statLabel}>{t("dashboard.requests")}</div>
                </div>
                <div style={styles.stat}>
                  <div style={styles.statValue}>{fmt(todayStats.dashscopeCostCNY, "CNY")}</div>
                  <div style={styles.statLabel}>{t("dashboard.cost")}</div>
                </div>
              </div>
            </div>
          )}

          {todayStats.openrouterCount > 0 && (
            <div style={styles.providerBlock}>
              <div style={{ ...styles.providerTag, color: "#6c8ebf" }}>OpenRouter</div>
              <div style={styles.todayRow}>
                <div style={styles.stat}>
                  <div style={styles.statValue}>{todayStats.openrouterCount}</div>
                  <div style={styles.statLabel}>{t("dashboard.requests")}</div>
                </div>
                <div style={styles.stat}>
                  <div style={styles.statValue}>{fmt(todayStats.openrouterCostUSD, "USD")}</div>
                  <div style={styles.statLabel}>{t("dashboard.cost")}</div>
                </div>
              </div>
            </div>
          )}

          {todayStats.count === 0 && (
            <div style={{ textAlign: "center", color: "#555", fontSize: "12px", padding: "8px 0" }}>
              {t("dashboard.noData")}
            </div>
          )}

          {todayStats.count > 0 && (
            <div style={styles.todayTotal}>
              {t("dashboard.entries", { count: todayStats.count })}
              {" · "}
              {fmtTotal(todayStats.dashscopeCostCNY, todayStats.openrouterCostUSD)}
            </div>
          )}

          {todayStats.noiseSeconds > 0 && (
            <div style={styles.noiseRow}>
              {t("dashboard.noise")}: {todayStats.noiseSeconds.toFixed(1)}s
              ({noisePercent(todayStats.noiseSeconds, todayStats.audioSeconds)}%)
            </div>
          )}
        </div>

        {/* All-time totals */}
        <div style={styles.totalCard}>
          <div style={styles.totalLabel}>{t("dashboard.total")}</div>
          {totals.dashscopeCount > 0 && (
            <div style={styles.totalLine}>
              <span style={styles.totalProvider}>DashScope ({totals.dashscopeCount})</span>
              <span style={styles.totalValue}>{fmt(totals.dashscopeCostCNY, "CNY")}</span>
            </div>
          )}
          {totals.openrouterCount > 0 && (
            <div style={styles.totalLine}>
              <span style={styles.totalProvider}>OpenRouter ({totals.openrouterCount})</span>
              <span style={styles.totalValue}>{fmt(totals.openrouterCostUSD, "USD")}</span>
            </div>
          )}
          <div style={styles.totalLine}>
            <span style={{ fontSize: "11px", color: "#666" }}>
              {totals.count} {t("dashboard.entriesUnit")}
            </span>
            <span style={{ ...styles.totalValue, fontWeight: 700 }}>
              {fmtTotal(totals.dashscopeCostCNY, totals.openrouterCostUSD)}
            </span>
          </div>
        </div>

        {totals.noiseSeconds > 0 && (
          <div style={styles.noiseTotalRow}>
            {t("dashboard.noiseTotal")}: {totals.noiseSeconds.toFixed(1)}s
            ({noisePercent(totals.noiseSeconds, totals.audioSeconds)}%)
          </div>
        )}

        {/* Daily breakdown table */}
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>{t("dashboard.date")}</th>
                <th style={{ ...styles.th, textAlign: "right" }}>DashScope</th>
                <th style={{ ...styles.th, textAlign: "right" }}>OpenRouter</th>
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
                  <td style={{ ...styles.td, textAlign: "right" }}>
                    {day.dashscopeCount > 0 ? fmt(day.dashscopeCostCNY, "CNY") : "-"}
                  </td>
                  <td style={{ ...styles.td, textAlign: "right" }}>
                    {day.openrouterCount > 0 ? fmt(day.openrouterCostUSD, "USD") : "-"}
                  </td>
                  <td style={{ ...styles.td, textAlign: "right", fontWeight: 600 }}>
                    {fmtTotal(day.dashscopeCostCNY, day.openrouterCostUSD)}
                  </td>
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
    width: "420px",
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
  providerBlock: {
    marginBottom: "8px",
  },
  providerTag: {
    fontSize: "10px",
    color: "#51cf66",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.3px",
    marginBottom: "4px",
  },
  todayRow: {
    display: "flex",
    justifyContent: "space-around",
    gap: "8px",
  },
  stat: { textAlign: "center" },
  statValue: { fontSize: "16px", fontWeight: 700, color: "#51cf66", fontFamily: "monospace" },
  statLabel: { fontSize: "10px", color: "#888", marginTop: "2px" },
  todayTotal: {
    fontSize: "12px",
    color: "#ccc",
    textAlign: "center",
    marginTop: "6px",
    fontFamily: "monospace",
  },
  noiseRow: {
    fontSize: "11px",
    color: "#e67e22",
    textAlign: "center",
    marginTop: "4px",
  },
  totalCard: {
    backgroundColor: "#1a1a2e",
    borderRadius: "6px",
    padding: "10px 12px",
  },
  totalLabel: {
    fontSize: "11px",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "4px",
  },
  totalLine: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "2px 0",
  },
  totalProvider: { fontSize: "11px", color: "#888" },
  totalValue: { fontSize: "12px", color: "#ccc", fontFamily: "monospace" },
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
    fontSize: "11px",
  },
  th: {
    textAlign: "left",
    padding: "6px 6px",
    color: "#888",
    borderBottom: "1px solid #333",
    fontWeight: 500,
  },
  td: {
    padding: "5px 6px",
    color: "#ccc",
    borderBottom: "1px solid #2a2a3e",
    fontFamily: "monospace",
  },
};
