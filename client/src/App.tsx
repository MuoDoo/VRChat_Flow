import { useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "./hooks/useAuth";
import AuthView from "./components/AuthView";
import MicControl from "./components/MicControl";
import TranslationView from "./components/TranslationView";
import Settings from "./components/Settings";
import LanguageSwitcher from "./components/LanguageSwitcher";

interface TranslationEntry {
  id: number;
  transcription: string;
  translation: string;
  timestamp: Date;
}

export default function App() {
  const { t } = useTranslation();
  const { isLoggedIn, username, getAccessToken, login, register, logout } = useAuth();
  const [entries, setEntries] = useState<TranslationEntry[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [serverUrl, setServerUrl] = useState(() =>
    localStorage.getItem("vrcflow-serverUrl") || "http://localhost:8080"
  );
  const [oscPort, setOscPort] = useState(() =>
    parseInt(localStorage.getItem("vrcflow-oscPort") || "9000", 10)
  );
  const [sourceLang, setSourceLang] = useState(() =>
    localStorage.getItem("vrcflow-sourceLang") || "zh"
  );
  const [targetLang, setTargetLang] = useState(() =>
    localStorage.getItem("vrcflow-targetLang") || "en"
  );
  const entryIdRef = useRef(0);

  const handleResult = useCallback(
    (data: { transcription: string; translation: string; remaining: number }) => {
      const id = ++entryIdRef.current;
      setEntries((prev) => [
        ...prev,
        {
          id,
          transcription: data.transcription,
          translation: data.translation,
          timestamp: new Date(),
        },
      ]);
      setRemaining(data.remaining);

      // Send to VRChat via OSC
      const oscText = `${data.transcription}\n${data.translation}`;
      window.electronAPI?.sendOsc(oscText, oscPort);
    },
    [oscPort]
  );

  const handleError = useCallback((error: string) => {
    console.error("Transcription error:", error);
  }, []);

  const saveSettings = useCallback(
    (url: string, port: number, src: string, tgt: string) => {
      setServerUrl(url);
      setOscPort(port);
      setSourceLang(src);
      setTargetLang(tgt);
      localStorage.setItem("vrcflow-serverUrl", url);
      localStorage.setItem("vrcflow-oscPort", String(port));
      localStorage.setItem("vrcflow-sourceLang", src);
      localStorage.setItem("vrcflow-targetLang", tgt);
    },
    []
  );

  if (!isLoggedIn) {
    return (
      <div style={styles.container}>
        <div style={styles.preAuthHeader}>
          <LanguageSwitcher />
          <button onClick={() => setShowSettings(!showSettings)} style={styles.settingsBtn}>
            {t("settings.title")}
          </button>
        </div>
        {showSettings && (
          <Settings
            serverUrl={serverUrl}
            oscPort={oscPort}
            sourceLang={sourceLang}
            targetLang={targetLang}
            remaining={null}
            onSave={saveSettings}
            onClose={() => setShowSettings(false)}
          />
        )}
        <AuthView onLogin={login} onRegister={register} />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>{t("app.title")}</h1>
        <div style={styles.headerRight}>
          <span style={styles.username}>{username}</span>
          <button onClick={() => setShowSettings(!showSettings)} style={styles.settingsBtn}>
            {t("settings.title")}
          </button>
          <button onClick={logout} style={styles.logoutBtn}>
            {t("auth.logout")}
          </button>
          <LanguageSwitcher />
        </div>
      </header>

      {showSettings && (
        <Settings
          serverUrl={serverUrl}
          oscPort={oscPort}
          sourceLang={sourceLang}
          targetLang={targetLang}
          remaining={remaining}
          onSave={saveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      <TranslationView entries={entries} />

      <MicControl
        serverUrl={serverUrl}
        sourceLang={sourceLang}
        targetLang={targetLang}
        getAccessToken={getAccessToken}
        onResult={handleResult}
        onError={handleError}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: "#1a1a2e",
    color: "#e0e0e0",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 16px",
    borderBottom: "1px solid #2a2a4a",
  },
  title: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 600,
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  username: {
    fontSize: "13px",
    color: "#888",
  },
  settingsBtn: {
    background: "none",
    border: "1px solid #444",
    color: "#ccc",
    padding: "4px 10px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "13px",
  },
  logoutBtn: {
    background: "none",
    border: "1px solid #555",
    color: "#aaa",
    padding: "4px 10px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "13px",
  },
  preAuthHeader: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "8px",
    padding: "8px 16px",
  },
};
