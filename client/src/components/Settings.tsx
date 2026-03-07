import { useState } from "react";
import { useTranslation } from "react-i18next";

interface SettingsProps {
  serverUrl: string;
  oscPort: number;
  sourceLang: string;
  targetLang: string;
  remaining: number | null;
  onSave: (url: string, port: number, src: string, tgt: string) => void;
  onClose: () => void;
}

export default function Settings({
  serverUrl: initUrl,
  oscPort: initPort,
  sourceLang: initSrc,
  targetLang: initTgt,
  remaining,
  onSave,
  onClose,
}: SettingsProps) {
  const { t } = useTranslation();
  const [url, setUrl] = useState(initUrl);
  const [port, setPort] = useState(String(initPort));
  const [src, setSrc] = useState(initSrc);
  const [tgt, setTgt] = useState(initTgt);

  const handleSave = () => {
    onSave(url, parseInt(port, 10) || 9000, src, tgt);
    onClose();
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <h3 style={styles.title}>{t("settings.title")}</h3>

        <label style={styles.label}>{t("settings.serverUrl")}</label>
        <input
          style={styles.input}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />

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

        {remaining !== null && (
          <div style={styles.remaining}>
            {t("usage.remaining", { seconds: Math.round(remaining) })}
          </div>
        )}

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
  remaining: {
    fontSize: "13px",
    color: "#51cf66",
    textAlign: "center",
    marginTop: "8px",
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
};
