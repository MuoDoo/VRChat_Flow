import { useMemo } from "react";
import { useTranslation } from "react-i18next";

const DEFAULT_DAILY_LIMIT = 7200; // 2 hours in seconds
const GITHUB_URL = "https://github.com/MuoDoo/VRChat_Flow";

interface StatusBarProps {
  remaining: number | null;
  dailyLimit: number;
}

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.round(totalSeconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function getResetCountdown(): string {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diffMs = midnight.getTime() - now.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  const diffM = Math.floor((diffMs % 3600000) / 60000);
  if (diffH > 0) return `${diffH}h ${diffM}m`;
  return `${diffM}m`;
}

export default function StatusBar({ remaining, dailyLimit }: StatusBarProps) {
  const { t } = useTranslation();

  const resetTime = useMemo(() => getResetCountdown(), []);

  const limit = dailyLimit || DEFAULT_DAILY_LIMIT;
  const displayRemaining = remaining ?? limit;
  const used = Math.max(0, limit - displayRemaining);
  const usedPercent = Math.min(100, (used / limit) * 100);

  // Color based on usage: green → yellow → red
  const barColor =
    usedPercent < 50 ? "#27ae60" : usedPercent < 80 ? "#e67e22" : "#c0392b";

  return (
    <div style={styles.container}>
      {/* Usage section */}
      <div style={styles.usageSection}>
        <div style={styles.usageHeader}>
          <span style={styles.quotaLabel}>{t("usage.quota")}</span>
          <span style={styles.remaining}>
            {formatDuration(displayRemaining)}
          </span>
        </div>
        <div style={styles.barTrack}>
          <div
            style={{
              ...styles.barFill,
              width: `${usedPercent}%`,
              backgroundColor: barColor,
            }}
          />
        </div>
        <div style={styles.usageFooter}>
          <span style={styles.usedText}>
            {t("usage.used")} {formatDuration(used)}
          </span>
          <span style={styles.resetText}>
            {t("usage.resetsIn", { time: resetTime })}
          </span>
        </div>
      </div>

      {/* GitHub link */}
      <button
        onClick={() => window.electronAPI?.openExternal(GITHUB_URL)}
        style={styles.githubBtn}
        title="GitHub"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "8px 16px",
    backgroundColor: "#222244",
    borderBottom: "1px solid #2a2a4a",
  },
  usageSection: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  usageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  quotaLabel: {
    fontSize: "11px",
    color: "#888",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  },
  remaining: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#51cf66",
  },
  barTrack: {
    height: "4px",
    backgroundColor: "#1a1a2e",
    borderRadius: "2px",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: "2px",
    transition: "width 0.3s ease",
  },
  usageFooter: {
    display: "flex",
    justifyContent: "space-between",
  },
  usedText: {
    fontSize: "11px",
    color: "#666",
  },
  resetText: {
    fontSize: "11px",
    color: "#666",
  },
  githubBtn: {
    color: "#666",
    display: "flex",
    alignItems: "center",
    padding: "4px",
    borderRadius: "4px",
    background: "none",
    border: "none",
    cursor: "pointer",
  },
};
