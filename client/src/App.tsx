import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import MicControl from "./components/MicControl";
import SpeakerControl from "./components/SpeakerControl";
import TranslationView from "./components/TranslationView";
import Settings from "./components/Settings";
import Tutorial from "./components/Tutorial";
import Dashboard from "./components/Dashboard";
import History from "./components/History";
import LanguageSwitcher from "./components/LanguageSwitcher";
import UpdateBanner from "./components/UpdateBanner";
import { useUpdateCheck } from "./hooks/useUpdateCheck";
import { renderOverlayMessages } from "./lib/overlayRenderer";

const HISTORY_KEY = "vrcflow-history";
const OVERLAY_TTL = 8000; // Overlay messages expire after 8 seconds
const MAX_OVERLAY_MESSAGES = 3;

/** Check if transcription result is noise (empty or punctuation-only) */
function isOverlayNoise(transcription: string, translation: string): boolean {
  const strip = (s: string) => s.replace(/[\s\p{P}]/gu, "");
  return strip(transcription).length === 0 && strip(translation).length === 0;
}

interface TranslationEntry {
  id: number;
  transcription: string;
  translation: string;
  timestamp: Date;
  audioDuration: number;
  processingTime: number;
  source: "mic" | "speaker";
  provider?: string;
  generationId?: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number; cost?: number };
}

function appendHistory(entry: {
  id: number;
  transcription: string;
  translation: string;
  timestamp: string;
  audioDuration: number;
  processingTime: number;
  isNoise: boolean;
  provider?: string;
  model?: string;
  generationId?: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number; cost?: number };
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showTutorial, setShowTutorial] = useState(() => {
    const seen = localStorage.getItem("vrcflow-tutorialSeen");
    if (!seen) {
      localStorage.setItem("vrcflow-tutorialSeen", "true");
      return true;
    }
    return false;
  });

  // Provider settings
  const [provider, setProvider] = useState(() =>
    localStorage.getItem("vrcflow-provider") || "dashscope"
  );
  const [apiKey, setApiKey] = useState(() =>
    localStorage.getItem("vrcflow-apiKey") || ""
  );
  const [openrouterKey, setOpenrouterKey] = useState(() =>
    localStorage.getItem("vrcflow-openrouterKey") || ""
  );
  const [openrouterModel, setOpenrouterModel] = useState(() =>
    localStorage.getItem("vrcflow-openrouterModel") || "mistralai/voxtral-small-24b-2507"
  );

  // General settings
  const [oscPort, setOscPort] = useState(() =>
    parseInt(localStorage.getItem("vrcflow-oscPort") || "9000", 10)
  );
  const [sourceLang, setSourceLang] = useState(() =>
    localStorage.getItem("vrcflow-sourceLang") || "zh"
  );
  const [targetLang, setTargetLang] = useState(() =>
    localStorage.getItem("vrcflow-targetLang") || "en"
  );
  const [displayCurrency, setDisplayCurrency] = useState(() =>
    localStorage.getItem("vrcflow-displayCurrency") || "CNY"
  );
  const [processingTimeout, setProcessingTimeout] = useState(() =>
    parseInt(localStorage.getItem("vrcflow-processingTimeout") || "5", 10)
  );
  const [speechPadMs, setSpeechPadMs] = useState(() =>
    parseInt(localStorage.getItem("vrcflow-speechPadMs") || "600", 10)
  );
  const [overlayEnabled, setOverlayEnabled] = useState(() =>
    localStorage.getItem("vrcflow-overlayEnabled") === "true"
  );

  // Computed active key/model
  const activeApiKey = provider === "openrouter" ? openrouterKey : apiKey;
  const activeModel = provider === "openrouter" ? openrouterModel : "gummy-chat-v1";

  const overlayInitRef = useRef(false);
  const overlayMessagesRef = useRef<Array<{ transcription: string; translation: string; expiresAt: number }>>([]);
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overlayVisibleRef = useRef(false);
  const entryIdRef = useRef(0);


  const addEntry = useCallback(
    (
      data: {
        transcription: string;
        translation: string;
        audioDuration: number;
        processingTime: number;
        usage?: { promptTokens: number; completionTokens: number; totalTokens: number; cost?: number };
        generationId?: string;
      },
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
          processingTime: data.processingTime,
          source,
          provider,
          generationId: data.generationId,
          usage: data.usage,
        },
      ]);

      appendHistory({
        id,
        transcription: data.transcription,
        translation: data.translation,
        timestamp: now.toISOString(),
        audioDuration: data.audioDuration,
        processingTime: data.processingTime,
        isNoise,
        provider,
        model: activeModel,
        generationId: data.generationId,
        usage: data.usage,
      });

      // Only send mic speech to VRChat OSC (not speaker translations)
      if (!isNoise && source === "mic") {
        const oscText = `${data.transcription}\n${data.translation}`;
        window.electronAPI?.sendOsc(oscText, oscPort);
      }
    },
    [oscPort, t, provider, activeModel]
  );

  const handleResult = useCallback(
    (data: {
      transcription: string;
      translation: string;
      audioDuration: number;
      processingTime: number;
      usage?: { promptTokens: number; completionTokens: number; totalTokens: number; cost?: number };
      generationId?: string;
    }) => {
      addEntry(data, "mic");
    },
    [addEntry]
  );

  const refreshOverlay = useCallback(async () => {
    if (!window.electronAPI) return;

    const now = Date.now();
    overlayMessagesRef.current = overlayMessagesRef.current.filter(
      (m) => m.expiresAt > now
    );

    if (overlayTimerRef.current) {
      clearTimeout(overlayTimerRef.current);
      overlayTimerRef.current = null;
    }

    if (overlayMessagesRef.current.length === 0) {
      if (overlayVisibleRef.current) {
        window.electronAPI.overlayHide();
        overlayVisibleRef.current = false;
      }
      return;
    }

    const messages = overlayMessagesRef.current.map((m) => ({
      transcription: m.transcription,
      translation: m.translation,
    }));
    const { buffer, width, height } = renderOverlayMessages(messages);
    await window.electronAPI.overlayUpdate(buffer, width, height);

    if (!overlayVisibleRef.current) {
      window.electronAPI.overlayShow();
      overlayVisibleRef.current = true;
    }

    // Schedule next refresh at earliest expiration
    const earliest = Math.min(
      ...overlayMessagesRef.current.map((m) => m.expiresAt)
    );
    overlayTimerRef.current = setTimeout(
      refreshOverlay,
      Math.max(earliest - Date.now(), 100)
    );
  }, []);

  const sendToOverlay = useCallback(
    async (transcription: string, translation: string) => {
      if (!overlayEnabled || !window.electronAPI) return;

      // Skip noise (empty or punctuation-only results)
      if (isOverlayNoise(transcription, translation)) return;

      // Lazy-init overlay on first use
      if (!overlayInitRef.current) {
        const result = await window.electronAPI.overlayInit();
        if (!result.ok) {
          console.warn("Overlay init failed:", result.error);
          return;
        }
        overlayInitRef.current = true;
      }

      const now = Date.now();
      overlayMessagesRef.current.push({
        transcription,
        translation,
        expiresAt: now + OVERLAY_TTL,
      });

      // Remove expired
      overlayMessagesRef.current = overlayMessagesRef.current.filter(
        (m) => m.expiresAt > now
      );

      // Keep at most MAX_OVERLAY_MESSAGES
      while (overlayMessagesRef.current.length > MAX_OVERLAY_MESSAGES) {
        overlayMessagesRef.current.shift();
      }

      await refreshOverlay();
    },
    [overlayEnabled, refreshOverlay]
  );

  const handleSpeakerResult = useCallback(
    (data: {
      transcription: string;
      translation: string;
      audioDuration: number;
      processingTime: number;
      usage?: { promptTokens: number; completionTokens: number; totalTokens: number; cost?: number };
      generationId?: string;
    }) => {
      addEntry(data, "speaker");
      sendToOverlay(data.transcription, data.translation);
    },
    [addEntry, sendToOverlay]
  );

  const toggleOverlay = useCallback(
    (enabled: boolean) => {
      setOverlayEnabled(enabled);
      localStorage.setItem("vrcflow-overlayEnabled", String(enabled));
      if (!enabled) {
        overlayMessagesRef.current = [];
        if (overlayTimerRef.current) {
          clearTimeout(overlayTimerRef.current);
          overlayTimerRef.current = null;
        }
        if (overlayVisibleRef.current) {
          window.electronAPI?.overlayHide();
          overlayVisibleRef.current = false;
        }
      }
    },
    []
  );

  // Cleanup overlay timer on unmount
  useEffect(() => {
    return () => {
      if (overlayTimerRef.current) {
        clearTimeout(overlayTimerRef.current);
      }
    };
  }, []);

  const handleError = useCallback((error: string) => {
    console.error("Transcription error:", error);
    setErrorMsg(error);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setErrorMsg(null), 8000);
  }, []);

  const saveSettings = useCallback(
    (settings: {
      provider: string;
      dashscopeKey: string;
      openrouterKey: string;
      openrouterModel: string;
      oscPort: number;
      sourceLang: string;
      targetLang: string;
      displayCurrency: string;
      processingTimeout: number;
      speechPadMs: number;
    }) => {
      setProvider(settings.provider);
      setApiKey(settings.dashscopeKey);
      setOpenrouterKey(settings.openrouterKey);
      setOpenrouterModel(settings.openrouterModel);
      setOscPort(settings.oscPort);
      setSourceLang(settings.sourceLang);
      setTargetLang(settings.targetLang);
      setDisplayCurrency(settings.displayCurrency);
      setProcessingTimeout(settings.processingTimeout);
      setSpeechPadMs(settings.speechPadMs);
      localStorage.setItem("vrcflow-provider", settings.provider);
      localStorage.setItem("vrcflow-apiKey", settings.dashscopeKey);
      localStorage.setItem("vrcflow-openrouterKey", settings.openrouterKey);
      localStorage.setItem("vrcflow-openrouterModel", settings.openrouterModel);
      localStorage.setItem("vrcflow-oscPort", String(settings.oscPort));
      localStorage.setItem("vrcflow-sourceLang", settings.sourceLang);
      localStorage.setItem("vrcflow-targetLang", settings.targetLang);
      localStorage.setItem("vrcflow-displayCurrency", settings.displayCurrency);
      localStorage.setItem("vrcflow-processingTimeout", String(settings.processingTimeout));
      localStorage.setItem("vrcflow-speechPadMs", String(settings.speechPadMs));
    },
    []
  );

  const providerLabel = provider === "openrouter" ? "OpenRouter" : "DashScope";

  return (
    <div style={styles.container}>
      {updateInfo && <UpdateBanner {...updateInfo} />}
      <header style={styles.header}>
        <h1 style={styles.title}>{t("app.title")}</h1>
        <div style={styles.headerRight}>
          <span style={styles.providerBadge}>{providerLabel}</span>
          <button onClick={() => setShowTutorial(true)} style={styles.iconBtn} title={t("tutorial.title")}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm8-3.5a.75.75 0 01.75.75v.5a.75.75 0 01-1.5 0v-.5A.75.75 0 018 4.5zM6.5 8a.75.75 0 01.75-.75h.75a.75.75 0 01.75.75v2.5h.25a.75.75 0 010 1.5h-2a.75.75 0 010-1.5h.25V8.75H7.25A.75.75 0 016.5 8z" />
            </svg>
          </button>
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
          <button onClick={() => setShowSettings(!showSettings)} style={styles.settingsBtn}>
            {t("settings.title")}
          </button>
          <LanguageSwitcher />
        </div>
      </header>

      {!activeApiKey && (
        <div style={styles.apiKeyHint}>
          {t("settings.apiKeyRequired", { provider: providerLabel })}
        </div>
      )}

      {errorMsg && (
        <div style={styles.errorToast} onClick={() => setErrorMsg(null)}>
          {errorMsg}
        </div>
      )}

      {showTutorial && <Tutorial onClose={() => setShowTutorial(false)} />}
      {showDashboard && <Dashboard onClose={() => setShowDashboard(false)} />}
      {showHistory && <History onClose={() => setShowHistory(false)} />}

      {showSettings && (
        <Settings
          provider={provider}
          dashscopeKey={apiKey}
          openrouterKey={openrouterKey}
          openrouterModel={openrouterModel}
          oscPort={oscPort}
          sourceLang={sourceLang}
          targetLang={targetLang}
          displayCurrency={displayCurrency}
          processingTimeout={processingTimeout}
          speechPadMs={speechPadMs}
          overlayEnabled={overlayEnabled}
          onSave={saveSettings}
          onOverlayToggle={toggleOverlay}
          onClose={() => setShowSettings(false)}
        />
      )}

      <TranslationView entries={entries} />

      <MicControl
        provider={provider}
        apiKey={activeApiKey}
        model={activeModel}
        sourceLang={sourceLang}
        targetLang={targetLang}
        timeoutSec={processingTimeout}
        speechPadMs={speechPadMs}
        onResult={handleResult}
        onError={handleError}
      />

      <SpeakerControl
        provider={provider}
        apiKey={activeApiKey}
        model={activeModel}
        sourceLang={sourceLang}
        targetLang={targetLang}
        timeoutSec={processingTimeout}
        speechPadMs={speechPadMs}
        onResult={handleSpeakerResult}
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
  providerBadge: {
    fontSize: "10px",
    color: "#888",
    backgroundColor: "#2a2a4a",
    padding: "2px 6px",
    borderRadius: "3px",
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
  errorToast: {
    padding: "8px 16px",
    backgroundColor: "rgba(231,76,60,0.15)",
    color: "#ff6b6b",
    fontSize: "12px",
    textAlign: "center",
    cursor: "pointer",
    borderBottom: "1px solid rgba(231,76,60,0.3)",
  },
};
