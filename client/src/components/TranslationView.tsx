import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  type CurrencyCode,
  getCachedRates,
  convertCurrency,
  formatCurrency,
} from "../lib/currency";

const DASHSCOPE_PRICE_PER_SEC = 0.00015; // CNY/s per channel, 2 channels

interface TranslationEntry {
  id: number;
  transcription: string;
  translation: string;
  timestamp: Date;
  audioDuration: number;
  source: "mic" | "speaker";
  provider?: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number; cost?: number };
}

interface TranslationViewProps {
  entries: TranslationEntry[];
}

function getEntryCost(entry: TranslationEntry): { amount: number; from: "CNY" | "USD" } | null {
  if (entry.provider === "openrouter") {
    if (entry.usage?.cost != null) return { amount: entry.usage.cost, from: "USD" };
    return null; // not yet loaded
  }
  // DashScope: compute from audio duration
  return { amount: entry.audioDuration * 2 * DASHSCOPE_PRICE_PER_SEC, from: "CNY" };
}

export default function TranslationView({ entries }: TranslationViewProps) {
  const { t } = useTranslation();
  const bottomRef = useRef<HTMLDivElement>(null);
  const displayCurrency = (localStorage.getItem("vrcflow-displayCurrency") || "CNY") as CurrencyCode;
  const rates = getCachedRates();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length]);

  return (
    <div style={styles.container}>
      {entries.map((entry) => {
        const cost = getEntryCost(entry);
        const costStr = cost
          ? formatCurrency(convertCurrency(cost.amount, cost.from, displayCurrency, rates), displayCurrency)
          : null;

        return (
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
            <div style={styles.entryFooter}>
              <div
                style={{
                  ...styles.translation,
                  color: entry.source === "speaker" ? "#5dade2" : "#8b8bff",
                  flex: 1,
                }}
              >
                {entry.translation}
              </div>
              {costStr && <div style={styles.cost}>{costStr}</div>}
            </div>
          </div>
        );
      })}
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
  entryFooter: {
    display: "flex",
    alignItems: "flex-end",
    gap: "8px",
  },
  translation: {
    fontSize: "14px",
  },
  cost: {
    fontSize: "10px",
    color: "#666",
    fontFamily: "monospace",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
};
