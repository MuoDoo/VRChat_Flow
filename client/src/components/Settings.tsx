import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DEFAULT_SERVER_URL } from "../constants";

const CUSTOM_BACKENDS_KEY = "vrcflow-customBackends";
const ADD_CUSTOM_VALUE = "__add_custom__";

function loadCustomBackends(): string[] {
  try {
    const raw = localStorage.getItem(CUSTOM_BACKENDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustomBackends(backends: string[]) {
  localStorage.setItem(CUSTOM_BACKENDS_KEY, JSON.stringify(backends));
}

interface SettingsProps {
  serverUrl: string;
  oscPort: number;
  sourceLang: string;
  targetLang: string;
  onSave: (url: string, port: number, src: string, tgt: string) => void;
  onClose: () => void;
}

export default function Settings({
  serverUrl: initUrl,
  oscPort: initPort,
  sourceLang: initSrc,
  targetLang: initTgt,
  onSave,
  onClose,
}: SettingsProps) {
  const { t } = useTranslation();
  const [url, setUrl] = useState(initUrl);
  const [port, setPort] = useState(String(initPort));
  const [src, setSrc] = useState(initSrc);
  const [tgt, setTgt] = useState(initTgt);
  const [customBackends, setCustomBackends] = useState(loadCustomBackends);
  const [addingCustom, setAddingCustom] = useState(false);
  const [newBackendUrl, setNewBackendUrl] = useState("");

  const handleSave = () => {
    onSave(url, parseInt(port, 10) || 9000, src, tgt);
    onClose();
  };

  const handleDropdownChange = (value: string) => {
    if (value === ADD_CUSTOM_VALUE) {
      setAddingCustom(true);
      setNewBackendUrl("");
    } else {
      setUrl(value);
      setAddingCustom(false);
    }
  };

  const handleAddBackend = () => {
    const trimmed = newBackendUrl.trim().replace(/\/+$/, "");
    if (!trimmed) return;
    if (trimmed === DEFAULT_SERVER_URL || customBackends.includes(trimmed)) {
      setUrl(trimmed);
      setAddingCustom(false);
      return;
    }
    const updated = [...customBackends, trimmed];
    setCustomBackends(updated);
    saveCustomBackends(updated);
    setUrl(trimmed);
    setAddingCustom(false);
  };

  const handleDeleteBackend = (backend: string) => {
    const updated = customBackends.filter((b) => b !== backend);
    setCustomBackends(updated);
    saveCustomBackends(updated);
    if (url === backend) {
      setUrl(DEFAULT_SERVER_URL);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <h3 style={styles.title}>{t("settings.title")}</h3>

        <label style={styles.label}>{t("settings.serverUrl")}</label>
        <select
          style={styles.input}
          value={addingCustom ? ADD_CUSTOM_VALUE : url}
          onChange={(e) => handleDropdownChange(e.target.value)}
        >
          <option value={DEFAULT_SERVER_URL}>
            vrcflow.com ({t("settings.backendDefault")})
          </option>
          {customBackends.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
          <option value={ADD_CUSTOM_VALUE}>
            + {t("settings.addCustomBackend")}
          </option>
        </select>

        {/* Custom backend entries with delete buttons */}
        {customBackends.length > 0 && !addingCustom && (
          <div style={styles.backendList}>
            {customBackends.map((b) => (
              <div key={b} style={styles.backendItem}>
                <span style={styles.backendUrl}>{b}</span>
                <button
                  onClick={() => handleDeleteBackend(b)}
                  style={styles.deleteBtn}
                  title={t("settings.deleteBackend")}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add custom backend inline form */}
        {addingCustom && (
          <div style={styles.addRow}>
            <input
              style={{ ...styles.input, flex: 1 }}
              value={newBackendUrl}
              onChange={(e) => setNewBackendUrl(e.target.value)}
              placeholder="https://example.com"
              onKeyDown={(e) => e.key === "Enter" && handleAddBackend()}
              autoFocus
            />
            <button onClick={handleAddBackend} style={styles.addBtn}>
              {t("settings.backendAdd")}
            </button>
            <button
              onClick={() => {
                setAddingCustom(false);
                // restore dropdown to current url
              }}
              style={styles.cancelSmallBtn}
            >
              &times;
            </button>
          </div>
        )}

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
  backendList: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    marginTop: "2px",
  },
  backendItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "4px 8px",
    backgroundColor: "#1a1a2e",
    borderRadius: "4px",
    border: "1px solid #333",
  },
  backendUrl: {
    fontSize: "12px",
    color: "#aaa",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flex: 1,
  },
  deleteBtn: {
    background: "none",
    border: "none",
    color: "#e55",
    cursor: "pointer",
    fontSize: "16px",
    padding: "0 4px",
    lineHeight: 1,
    flexShrink: 0,
  },
  addRow: {
    display: "flex",
    gap: "4px",
    alignItems: "center",
  },
  addBtn: {
    padding: "6px 10px",
    borderRadius: "4px",
    border: "none",
    backgroundColor: "#4a4a8a",
    color: "#fff",
    cursor: "pointer",
    fontSize: "12px",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  cancelSmallBtn: {
    background: "none",
    border: "1px solid #444",
    color: "#aaa",
    cursor: "pointer",
    fontSize: "14px",
    padding: "4px 8px",
    borderRadius: "4px",
    flexShrink: 0,
  },
};
