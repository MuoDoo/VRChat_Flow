import { useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import MicControl from "./components/MicControl";
import SpeakerControl from "./components/SpeakerControl";
import VolumeBars from "./components/VolumeBars";
import TranslationView from "./components/TranslationView";
import Settings from "./components/Settings";
import Help from "./components/Help";
import Dashboard from "./components/Dashboard";
import History from "./components/History";
import LanguageSwitcher from "./components/LanguageSwitcher";
import UpdateBanner from "./components/UpdateBanner";
import { useUpdateCheck } from "./hooks/useUpdateCheck";
import { renderOverlayText } from "./lib/overlayRenderer";

const HISTORY_KEY = "vrcflow-history";

interface TranslationEntry {
  id: number;
  transcription: string;
  translation: string;
  timestamp: Date;
  audioDuration: number;
  source: "mic" | "speaker";
}

function appendHistory(entry: {
  id: number;
  transcription: string;
  translation: string;
  timestamp: string;
  audioDuration: number;
  isNoise: boolean;
}) {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const history = raw ? JSON.parse(raw) : [];
    history.push(entry);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // storage full or corrupt, start fresh
    localStorage.setItem(HISTORY_KEY, JSON.stringify([entry]));
  }
}

export default function App() {
  const { t } = useTranslation();
  const updateInfo = useUpdateCheck();
  const [entries, setEntries] = useState<TranslationEntry[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [apiKey, setApiKey] = useState(() =>
    localStorage.getItem("vrcflow-apiKey") || ""
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
  const [overlayEnabled, setOverlayEnabled] = useState(() =>
    localStorage.getItem("vrcflow-overlayEnabled") === "true"
  );
  const overlayInitRef = useRef(false);
  const micVolumeRef = useRef(0);
  const speakerVolumeRef = useRef(0);
  const entryIdRef = useRef(0);

  const addEntry = useCallback(
    (
      data: { transcription: string; translation: string; audioDuration: number },
      source: "mic" | "speaker"
    ) => {
      const id = ++entryIdRef.current;
      const now = new Date();
      const isNoise = !data.transcription.trim() && !data.translation.trim();

      setEntries((prev) => [
        ...prev,
        {
          id,
          transcription: isNoise ? `【${t("label.noise")}】` : data.transcription,
          translation: isNoise ? "" : data.translation,
          timestamp: now,
          audioDuration: data.audioDuration,
          source,
        },
      ]);

      appendHistory({
        id,
        transcription: data.transcription,
        translation: data.translation,
        timestamp: now.toISOString(),
        audioDuration: data.audioDuration,
        isNoise,
      });

      // Only send mic speech to VRChat OSC (not speaker translations)
      if (!isNoise && source === "mic") {
        const oscText = `${data.transcription}\n${data.translation}`;
        window.electronAPI?.sendOsc(oscText, oscPort);
      }
    },
    [oscPort, t]
  );

  const handleResult = useCallback(
    (data: { transcription: string; translation: string; audioDuration: number }) => {
      addEntry(data, "mic");
    },
    [addEntry]
  );

  const sendToOverlay = useCallback(
    async (transcription: string, translation: string) => {
      if (!overlayEnabled || !window.electronAPI) return;

      // Lazy-init overlay on first use
      if (!overlayInitRef.current) {
        const result = await window.electronAPI.overlayInit();
        if (!result.ok) {
          console.warn("Overlay init failed:", result.error);
          return;
        }
        await window.electronAPI.overlayShow();
        overlayInitRef.current = true;
      }

      const { buffer, width, height } = renderOverlayText(
        transcription,
        translation
      );
      await window.electronAPI.overlayUpdate(buffer, width, height);
    },
    [overlayEnabled]
  );

  const handleSpeakerResult = useCallback(
    (data: { transcription: string; translation: string; audioDuration: number }) => {
      addEntry(data, "speaker");
      sendToOverlay(data.transcription, data.translation);
    },
    [addEntry, sendToOverlay]
  );

  const toggleOverlay = useCallback(
    (enabled: boolean) => {
      setOverlayEnabled(enabled);
      localStorage.setItem("vrcflow-overlayEnabled", String(enabled));
      if (!enabled && overlayInitRef.current) {
        window.electronAPI?.overlayHide();
      }
    },
    []
  );

  const handleError = useCallback((error: string) => {
    console.error("Transcription error:", error);
  }, []);

  const saveSettings = useCallback(
    (key: string, port: number, src: string, tgt: string) => {
      setApiKey(key);
      setOscPort(port);
      setSourceLang(src);
      setTargetLang(tgt);
      localStorage.setItem("vrcflow-apiKey", key);
      localStorage.setItem("vrcflow-oscPort", String(port));
      localStorage.setItem("vrcflow-sourceLang", src);
      localStorage.setItem("vrcflow-targetLang", tgt);
    },
    []
  );

  return (
    <div style={styles.container}>
      {updateInfo && <UpdateBanner {...updateInfo} />}
      <header style={styles.header}>
        <h1 style={styles.title}>{t("app.title")}</h1>
        <div style={styles.headerRight}>
          <button
            onClick={() => window.electronAPI?.openExternal("https://github.com/MuoDoo/VRCFlow")}
            style={styles.iconBtn}
            title="GitHub"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </button>
          {/* Dashboard */}
          <button onClick={() => setShowDashboard(true)} style={styles.iconBtn} title={t("dashboard.title")}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1 14h3V6H1v8zm5 0h3V2H6v12zm5 0h3v-5h-3v5z" />
            </svg>
          </button>
          {/* History */}
          <button onClick={() => setShowHistory(true)} style={styles.iconBtn} title={t("history.title")}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 1.5a5.5 5.5 0 110 11 5.5 5.5 0 010-11zM7.25 4v4.5l3.5 2.1.75-1.23-2.75-1.63V4h-1.5z" />
            </svg>
          </button>
          {/* Help */}
          <button onClick={() => setShowHelp(true)} style={styles.iconBtn} title={t("help.title")}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm9-3a1 1 0 00-2 0v.5a.75.75 0 001.5 0V5zm-.25 4a.75.75 0 00-1.5 0v3a.75.75 0 001.5 0V9z" />
            </svg>
          </button>
          <button onClick={() => setShowSettings(!showSettings)} style={styles.settingsBtn}>
            {t("settings.title")}
          </button>
          <LanguageSwitcher />
        </div>
      </header>

      {!apiKey && (
        <div style={styles.apiKeyHint}>
          {t("settings.apiKeyRequired")}
        </div>
      )}

      {showDashboard && <Dashboard onClose={() => setShowDashboard(false)} />}
      {showHistory && <History onClose={() => setShowHistory(false)} />}
      {showHelp && <Help onClose={() => setShowHelp(false)} />}

      {showSettings && (
        <Settings
          apiKey={apiKey}
          oscPort={oscPort}
          sourceLang={sourceLang}
          targetLang={targetLang}
          overlayEnabled={overlayEnabled}
          onSave={saveSettings}
          onOverlayToggle={toggleOverlay}
          onClose={() => setShowSettings(false)}
        />
      )}

      <TranslationView entries={entries} />

      <MicControl
        apiKey={apiKey}
        sourceLang={sourceLang}
        targetLang={targetLang}
        volumeRef={micVolumeRef}
        onResult={handleResult}
        onError={handleError}
      />

      <SpeakerControl
        apiKey={apiKey}
        sourceLang={sourceLang}
        targetLang={targetLang}
        volumeRef={speakerVolumeRef}
        onResult={handleSpeakerResult}
        onError={handleError}
      />

      <VolumeBars
        micVolumeRef={micVolumeRef}
        speakerVolumeRef={speakerVolumeRef}
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
  settingsBtn: {
    background: "none",
    border: "1px solid #444",
    color: "#ccc",
    padding: "4px 10px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "13px",
  },
  iconBtn: {
    color: "#666",
    display: "flex",
    alignItems: "center",
    padding: "4px",
    background: "none",
    border: "none",
    cursor: "pointer",
  },
  apiKeyHint: {
    padding: "12px 16px",
    backgroundColor: "#2a2a4a",
    color: "#e67e22",
    fontSize: "13px",
    textAlign: "center",
  },
};
