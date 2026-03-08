import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

interface SettingsProps {
  apiKey: string;
  oscPort: number;
  sourceLang: string;
  targetLang: string;
  overlayEnabled: boolean;
  onSave: (apiKey: string, port: number, src: string, tgt: string) => void;
  onOverlayToggle: (enabled: boolean) => void;
  onClose: () => void;
}

export default function Settings({
  apiKey: initKey,
  oscPort: initPort,
  sourceLang: initSrc,
  targetLang: initTgt,
  overlayEnabled,
  onSave,
  onOverlayToggle,
  onClose,
}: SettingsProps) {
  const { t } = useTranslation();
  const [key, setKey] = useState(initKey);
  const [port, setPort] = useState(String(initPort));
  const [src, setSrc] = useState(initSrc);
  const [tgt, setTgt] = useState(initTgt);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  const refreshDevices = async () => {
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      setDevices(devs);
    } catch {
      setDevices([]);
    }
  };

  useEffect(() => {
    refreshDevices();
  }, []);

  const handleSave = () => {
    onSave(key.trim(), parseInt(port, 10) || 9000, src, tgt);
    onClose();
  };

  const inputs = devices.filter((d) => d.kind === "audioinput");
  const outputs = devices.filter((d) => d.kind === "audiooutput");

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <h3 style={styles.title}>{t("settings.title")}</h3>

        <label style={styles.label}>{t("settings.apiKey")}</label>
        <input
          style={styles.input}
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder={t("settings.apiKeyPlaceholder")}
        />
        <div style={styles.hint}>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.electronAPI?.openExternal("https://bailian.console.aliyun.com/cn-beijing/?apiKey=1&tab=model#/api-key");
            }}
            style={styles.link}
          >
            {t("settings.getApiKey")}
          </a>
        </div>

        <label style={styles.label}>{t("settings.oscPort")}</label>
        <input
          style={styles.input}
          type="number"
          value={port}
          onChange={(e) => setPort(e.target.value)}
        />

        <label style={styles.label}>{t("settings.sourceLang")}</label>
        <select style={styles.input} value={src} onChange={(e) => setSrc(e.target.value)}>
          <option value="zh">Chinese</option>
          <option value="en">English</option>
          <option value="ja">Japanese</option>
          <option value="ko">Korean</option>
        </select>

        <label style={styles.label}>{t("settings.targetLang")}</label>
        <select style={styles.input} value={tgt} onChange={(e) => setTgt(e.target.value)}>
          <option value="en">English</option>
          <option value="zh">Chinese</option>
          <option value="ja">Japanese</option>
          <option value="ko">Korean</option>
        </select>

        <div style={styles.separator} />

        <label style={styles.label}>{t("settings.overlay")}</label>
        <div style={styles.toggleRow}>
          <span style={{ fontSize: "13px", color: "#ccc" }}>
            {t("settings.overlayDesc")}
          </span>
          <button
            onClick={() => onOverlayToggle(!overlayEnabled)}
            style={{
              ...styles.toggleBtn,
              backgroundColor: overlayEnabled ? "#27ae60" : "#555",
            }}
          >
            {overlayEnabled ? "ON" : "OFF"}
          </button>
        </div>

        <div style={styles.separator} />

        <div style={styles.devicesHeader}>
          <label style={styles.label}>{t("settings.devices")}</label>
          <button onClick={refreshDevices} style={styles.refreshBtn}>
            {t("settings.refreshDevices")}
          </button>
        </div>

        <div style={styles.deviceSection}>
          <div style={styles.deviceKind}>{t("settings.inputDevices")}</div>
          {inputs.length === 0 && (
            <div style={styles.deviceItem}>--</div>
          )}
          {inputs.map((d, i) => (
            <div key={d.deviceId || i} style={styles.deviceItem}>
              {d.label || `Input ${i + 1}`}
              {d.deviceId === "default" && (
                <span style={styles.defaultBadge}>default</span>
              )}
            </div>
          ))}

          <div style={{ ...styles.deviceKind, marginTop: "6px" }}>
            {t("settings.outputDevices")}
          </div>
          {outputs.length === 0 && (
            <div style={styles.deviceItem}>--</div>
          )}
          {outputs.map((d, i) => (
            <div key={d.deviceId || i} style={styles.deviceItem}>
              {d.label || `Output ${i + 1}`}
              {d.deviceId === "default" && (
                <span style={styles.defaultBadge}>default</span>
              )}
            </div>
          ))}
        </div>

        <div style={styles.buttons}>
          <button onClick={handleSave} style={styles.saveBtn}>
            {t("settings.title")}
          </button>
          <button onClick={onClose} style={styles.cancelBtn}>
            &times;
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  panel: {
    backgroundColor: "#222244",
    borderRadius: "8px",
    padding: "24px",
    width: "320px",
    maxHeight: "90vh",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  title: {
    margin: "0 0 8px 0",
    fontSize: "16px",
    color: "#fff",
  },
  label: {
    fontSize: "12px",
    color: "#aaa",
    marginTop: "4px",
  },
  input: {
    padding: "6px 10px",
    borderRadius: "4px",
    border: "1px solid #444",
    backgroundColor: "#1a1a2e",
    color: "#e0e0e0",
    fontSize: "13px",
    outline: "none",
  },
  hint: {
    fontSize: "11px",
    color: "#888",
  },
  link: {
    color: "#6c8ebf",
    textDecoration: "none",
  },
  buttons: {
    display: "flex",
    gap: "8px",
    marginTop: "12px",
  },
  saveBtn: {
    flex: 1,
    padding: "8px",
    borderRadius: "4px",
    border: "none",
    backgroundColor: "#4a4a8a",
    color: "#fff",
    cursor: "pointer",
    fontSize: "13px",
  },
  cancelBtn: {
    padding: "8px 12px",
    borderRadius: "4px",
    border: "1px solid #444",
    backgroundColor: "transparent",
    color: "#aaa",
    cursor: "pointer",
    fontSize: "16px",
  },
  separator: {
    borderTop: "1px solid #333",
    marginTop: "8px",
    paddingTop: "4px",
  },
  toggleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
  },
  toggleBtn: {
    padding: "4px 12px",
    borderRadius: "4px",
    border: "none",
    color: "#fff",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    minWidth: "40px",
  },
  devicesHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  refreshBtn: {
    padding: "2px 8px",
    borderRadius: "3px",
    border: "1px solid #444",
    backgroundColor: "transparent",
    color: "#888",
    fontSize: "11px",
    cursor: "pointer",
  },
  deviceSection: {
    backgroundColor: "#1a1a2e",
    borderRadius: "4px",
    padding: "8px 10px",
    fontSize: "12px",
  },
  deviceKind: {
    fontSize: "11px",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "3px",
  },
  deviceItem: {
    color: "#bbb",
    padding: "2px 0",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    wordBreak: "break-word",
  },
  defaultBadge: {
    fontSize: "9px",
    color: "#27ae60",
    border: "1px solid #27ae60",
    borderRadius: "2px",
    padding: "0 3px",
    flexShrink: 0,
  },
};
