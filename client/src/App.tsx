import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "./hooks/useAuth";
import { DEFAULT_SERVER_URL } from "./constants";
import AuthView from "./components/AuthView";
import MicControl from "./components/MicControl";
import TranslationView from "./components/TranslationView";
import Settings from "./components/Settings";
import StatusBar from "./components/StatusBar";
import LanguageSwitcher from "./components/LanguageSwitcher";
import UpdateBanner from "./components/UpdateBanner";
import { useUpdateCheck } from "./hooks/useUpdateCheck";

interface TranslationEntry {
  id: number;
  transcription: string;
  translation: string;
  timestamp: Date;
}

export default function App() {
  const { t } = useTranslation();
  const { isLoggedIn, username, getAccessToken, login, register, logout } = useAuth();
  const updateInfo = useUpdateCheck();
  const [entries, setEntries] = useState<TranslationEntry[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [dailyLimit, setDailyLimit] = useState<number>(7200);
  const [showSettings, setShowSettings] = useState(false);
  const [serverUrl, setServerUrl] = useState(() =>
    localStorage.getItem("vrcflow-serverUrl") || DEFAULT_SERVER_URL
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

  // Fetch usage quota on login
  useEffect(() => {
    if (!isLoggedIn) return;
    (async () => {
      const token = await getAccessToken();
      if (!token) return;
      try {
        const res = await fetch(`${serverUrl}/usage`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setRemaining(data.remaining_seconds);
          setDailyLimit(data.daily_limit);
        }
      } catch {
        // silently ignore - will update on first transcription
      }
    })();
  }, [isLoggedIn, serverUrl, getAccessToken]);

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
        {updateInfo && <UpdateBanner {...updateInfo} />}
        <div style={styles.preAuthHeader}>
          <button
            onClick={() => window.electronAPI?.openExternal("https://github.com/MuoDoo/VRChat_Flow")}
            style={styles.githubBtn}
            title="GitHub"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </button>
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
      {updateInfo && <UpdateBanner {...updateInfo} />}
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
          onSave={saveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      <StatusBar remaining={remaining} dailyLimit={dailyLimit} />

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
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
  },
  githubBtn: {
    color: "#666",
    display: "flex",
    alignItems: "center",
    padding: "4px",
    background: "none",
    border: "none",
    cursor: "pointer",
  },
};
