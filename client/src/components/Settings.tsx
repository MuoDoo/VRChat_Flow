import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { PROVIDERS, type ModelInfo } from "../lib/providers";

interface SettingsProps {
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
  overlayEnabled: boolean;
  micDeviceId: string;
  onSave: (settings: {
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
    micDeviceId: string;
  }) => void;
  onOverlayToggle: (enabled: boolean) => void;
  onClose: () => void;
}

export default function Settings({
  provider: initProvider,
  dashscopeKey: initDashscopeKey,
  openrouterKey: initOpenrouterKey,
  openrouterModel: initOpenrouterModel,
  oscPort: initPort,
  sourceLang: initSrc,
  targetLang: initTgt,
  displayCurrency: initCurrency,
  processingTimeout: initTimeout,
  speechPadMs: initSpeechPad,
  overlayEnabled,
  micDeviceId: initMicDeviceId,
  onSave,
  onOverlayToggle,
  onClose,
}: SettingsProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"general" | "provider">("general");
  const [providerSelection, setProviderSelection] = useState(initProvider);
  const [dashscopeKey, setDashscopeKey] = useState(initDashscopeKey);
  const [openrouterKey, setOpenrouterKey] = useState(initOpenrouterKey);
  const [openrouterModel, setOpenrouterModel] = useState(initOpenrouterModel);
  const [port, setPort] = useState(String(initPort));
  const [src, setSrc] = useState(initSrc);
  const [tgt, setTgt] = useState(initTgt);
  const [currency, setCurrency] = useState(initCurrency);
  const [timeout, setTimeout_] = useState(String(initTimeout));
  const [speechPad, setSpeechPad] = useState(String(initSpeechPad));
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [modelDetailId, setModelDetailId] = useState<string | null>(null);
  const [showDashscopeHelp, setShowDashscopeHelp] = useState(false);
  const [micDevice, setMicDevice] = useState(initMicDeviceId);
  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);

  const refreshDevices = async () => {
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      setInputDevices(devs.filter((d) => d.kind === "audioinput"));
      setOutputDevices(devs.filter((d) => d.kind === "audiooutput"));
    } catch {
      setInputDevices([]);
      setOutputDevices([]);
    }
  };

  useEffect(() => {
    refreshDevices();
  }, []);

  const handleSave = () => {
    onSave({
      provider: providerSelection,
      dashscopeKey: dashscopeKey.trim(),
      openrouterKey: openrouterKey.trim(),
      openrouterModel,
      oscPort: parseInt(port, 10) || 9000,
      sourceLang: src,
      targetLang: tgt,
      displayCurrency: currency,
      processingTimeout: Math.max(1, parseInt(timeout, 10) || 5),
      speechPadMs: Math.max(100, parseInt(speechPad, 10) || 600),
      micDeviceId: micDevice,
    });
    onClose();
  };

  const openrouterProvider = PROVIDERS.find((p) => p.id === "openrouter");
  const models = openrouterProvider?.models || [];

  // Show model detail view
  if (modelDetailId) {
    const model = models.find((m) => m.id === modelDetailId);
    if (model) {
      return (
        <div style={styles.overlay}>
          <div style={styles.panel}>
            <ModelDetail model={model} onBack={() => setModelDetailId(null)} />
          </div>
        </div>
      );
    }
  }

  // Show DashScope help view
  if (showDashscopeHelp) {
    return (
      <div style={styles.overlay}>
        <div style={styles.panel}>
          <DashScopeHelp onBack={() => setShowDashscopeHelp(false)} />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <div style={styles.header}>
          <h3 style={styles.title}>{t("settings.title")}</h3>
          <button onClick={onClose} style={styles.closeBtn}>&times;</button>
        </div>

        {/* Tab bar */}
        <div style={styles.tabBar}>
          <button
            onClick={() => setActiveTab("general")}
            style={{
              ...styles.tab,
              borderBottomColor: activeTab === "general" ? "#6c8ebf" : "transparent",
              color: activeTab === "general" ? "#fff" : "#888",
            }}
          >
            {t("settings.generalTab")}
          </button>
          <button
            onClick={() => setActiveTab("provider")}
            style={{
              ...styles.tab,
              borderBottomColor: activeTab === "provider" ? "#6c8ebf" : "transparent",
              color: activeTab === "provider" ? "#fff" : "#888",
            }}
          >
            {t("settings.providerTab")}
          </button>
        </div>

        {activeTab === "provider" && (
          <div style={styles.tabContent}>
            <div style={styles.providerDisclaimer}>{t("settings.providerDisclaimer")}</div>
            {/* Provider selector */}
            <div style={styles.providerSelector}>
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProviderSelection(p.id)}
                  style={{
                    ...styles.providerBtn,
                    backgroundColor: providerSelection === p.id ? "#4a4a8a" : "#2a2a4a",
                    borderColor: providerSelection === p.id ? "#6c8ebf" : "#444",
                  }}
                >
                  <div style={styles.providerBtnName}>{p.name}</div>
                  {providerSelection === p.id && (
                    <div style={styles.activeBadge}>{t("settings.active")}</div>
                  )}
                </button>
              ))}
            </div>

            {/* DashScope section */}
            {providerSelection === "dashscope" && (
              <div style={styles.providerSection}>
                <div style={styles.sectionTitle}>{t("settings.aliyunTitle")}</div>
                <div style={styles.sectionDesc}>{t("settings.aliyunDesc")}</div>
                <div style={styles.regionWarning}>{t("settings.aliyunRegionNote")}</div>

                <label style={styles.label}>{t("settings.apiKey")}</label>
                <input
                  style={styles.input}
                  type="password"
                  value={dashscopeKey}
                  onChange={(e) => setDashscopeKey(e.target.value)}
                  placeholder="sk-..."
                />
                <div style={styles.hint}>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      window.electronAPI?.openExternal(
                        "https://bailian.console.aliyun.com/cn-beijing/?apiKey=1&tab=model#/api-key"
                      );
                    }}
                    style={styles.link}
                  >
                    {t("settings.getApiKeyAliyun")}
                  </a>
                </div>

                {/* DashScope pricing info */}
                <div style={styles.pricingCard}>
                  <div style={styles.pricingRow}>
                    <span style={styles.pricingLabel}>gummy-chat-v1</span>
                    <span style={styles.pricingValue}>¥0.00015/s</span>
                  </div>
                  <div style={styles.pricingNote}>{t("settings.aliyunBillingNote")}</div>
                  <button
                    onClick={() => setShowDashscopeHelp(true)}
                    style={styles.helpLink}
                  >
                    {t("settings.viewDetail")}
                  </button>
                </div>
              </div>
            )}

            {/* OpenRouter section */}
            {providerSelection === "openrouter" && (
              <div style={styles.providerSection}>
                <div style={styles.sectionTitle}>{t("settings.openrouterTitle")}</div>
                <div style={styles.sectionDesc}>{t("settings.openrouterDesc")}</div>
                <div style={styles.regionWarning}>{t("settings.openrouterRegionNote")}</div>

                <label style={styles.label}>{t("settings.apiKey")}</label>
                <input
                  style={styles.input}
                  type="password"
                  value={openrouterKey}
                  onChange={(e) => setOpenrouterKey(e.target.value)}
                  placeholder="sk-or-..."
                />
                <div style={styles.hint}>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      window.electronAPI?.openExternal("https://openrouter.ai/keys");
                    }}
                    style={styles.link}
                  >
                    {t("settings.getApiKeyOpenRouter")}
                  </a>
                  <div style={{ color: "#888", marginTop: "2px" }}>{t("settings.openrouterPrepaid")}</div>
                </div>

                {/* Model selection */}
                <label style={styles.label}>{t("settings.model")}</label>
                <div style={styles.modelList}>
                  {models.map((model) => {
                    const selected = openrouterModel === model.id;
                    return (
                    <div
                      key={model.id}
                      onClick={() => setOpenrouterModel(model.id)}
                      className={selected ? "rainbow-border" : ""}
                      style={{
                        ...styles.modelCard,
                        borderColor: selected ? "transparent" : "#444",
                        cursor: "pointer",
                      }}
                    >
                      <div style={styles.modelCardHeader}>
                        <div>
                          <div style={styles.modelName}>
                            {model.name}
                            {model.recommended && <span style={styles.recommendedBadge}>{t("settings.recommended")}</span>}
                          </div>
                          <div style={styles.modelId}>{model.id}</div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setModelDetailId(model.id); }}
                          style={styles.modelDetailBtn}
                          title={t("settings.viewDetail")}
                        >
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm9-3a1 1 0 00-2 0v.5a.75.75 0 001.5 0V5zm-.25 4a.75.75 0 00-1.5 0v3a.75.75 0 001.5 0V9z" />
                          </svg>
                        </button>
                      </div>
                      <div style={styles.modelPriceRow}>
                        <span style={styles.modelPriceLabel}>Input</span>
                        <span style={styles.modelPriceValue}>
                          {model.pricing.audioPricingUnit === "seconds"
                            ? `$${model.pricing.inputAudio}/1M sec`
                            : `$${model.pricing.inputAudio ?? model.pricing.inputText}/1M tokens`}
                        </span>
                      </div>
                      <div style={styles.modelPriceRow}>
                        <span style={styles.modelPriceLabel}>Output</span>
                        <span style={styles.modelPriceValue}>
                          ${model.pricing.outputText}/1M tokens
                        </span>
                      </div>
                      <div style={styles.modelPriceRow}>
                        <span style={styles.modelPriceLabel}>Context</span>
                        <span style={styles.modelPriceValue}>
                          {(model.contextWindow / 1000).toFixed(0)}K
                        </span>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "general" && (
          <div style={styles.tabContent}>
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

            <label style={styles.label}>{t("settings.displayCurrency")}</label>
            <select style={styles.input} value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="CNY">CNY (¥)</option>
              <option value="USD">USD ($)</option>
              <option value="JPY">JPY (¥)</option>
            </select>

            <label style={styles.label}>{t("settings.oscPort")}</label>
            <input
              style={styles.input}
              type="number"
              value={port}
              onChange={(e) => setPort(e.target.value)}
            />

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
              <div style={styles.deviceSelectRow}>
                <span style={styles.deviceKind}>{t("settings.inputDevices")}</span>
                <select
                  style={styles.deviceSelect}
                  value={micDevice}
                  onChange={(e) => setMicDevice(e.target.value)}
                >
                  <option value="default">{t("settings.defaultDevice")}</option>
                  {inputDevices
                    .filter((d) => d.deviceId !== "default" && d.deviceId !== "communications")
                    .map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || d.deviceId}
                      </option>
                    ))}
                </select>
              </div>
              <div style={styles.deviceSelectRow}>
                <span style={styles.deviceKind}>{t("settings.outputDevices")}</span>
                <span style={styles.deviceName}>
                  {outputDevices.find((d) => d.deviceId === "default")?.label
                    || outputDevices[0]?.label
                    || t("settings.speakerLoopbackNote")}
                </span>
              </div>
              <div style={styles.pricingNote}>{t("settings.speakerLoopbackNote")}</div>
            </div>

            <div style={styles.separator} />

            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={styles.advancedToggle}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="currentColor"
                style={{
                  marginRight: "6px",
                  transition: "transform 0.2s",
                  transform: showAdvanced ? "rotate(90deg)" : "rotate(0deg)",
                }}
              >
                <path d="M3 1l5 4-5 4V1z" />
              </svg>
              {t("settings.advanced")}
            </button>

            {showAdvanced && (
              <div style={styles.advancedSection}>
                <label style={styles.label}>{t("settings.processingTimeout")}</label>
                <div style={styles.timeoutRow}>
                  <input
                    style={{ ...styles.input, flex: 1 }}
                    type="number"
                    min="1"
                    max="30"
                    value={timeout}
                    onChange={(e) => setTimeout_(e.target.value)}
                  />
                  <span style={styles.timeoutUnit}>s</span>
                </div>
                <div style={styles.pricingNote}>{t("settings.processingTimeoutDesc")}</div>

                <label style={{ ...styles.label, marginTop: "12px" }}>{t("settings.speechPadMs")}</label>
                <div style={styles.timeoutRow}>
                  <input
                    style={{ ...styles.input, flex: 1 }}
                    type="number"
                    min="100"
                    max="2000"
                    step="50"
                    value={speechPad}
                    onChange={(e) => setSpeechPad(e.target.value)}
                  />
                  <span style={styles.timeoutUnit}>ms</span>
                </div>
                <div style={styles.pricingNote}>{t("settings.speechPadMsDesc")}</div>

                <button
                  onClick={() => window.electronAPI?.openLogFile()}
                  style={styles.logBtn}
                >
                  {t("settings.openLogFile")}
                </button>
              </div>
            )}
          </div>
        )}

        <div style={styles.buttons}>
          <button onClick={handleSave} style={styles.saveBtn}>
            {t("settings.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Model detail page showing pricing, notes, and usage info */
function ModelDetail({ model, onBack }: { model: ModelInfo; onBack: () => void }) {
  const { t } = useTranslation();

  return (
    <>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: "4px" }}>
            <path d="M11 1L4 8l7 7" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
          {t("settings.back")}
        </button>
      </div>

      <div style={styles.modelDetailHeader}>
        <h3 style={{ margin: 0, fontSize: "16px", color: "#fff" }}>{model.name}</h3>
        <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>{model.id}</div>
      </div>

      <div style={{ fontSize: "13px", color: "#ccc", lineHeight: "1.5" }}>
        {model.description}
      </div>

      {/* Specs */}
      <div style={styles.pricingCard}>
        <div style={styles.pricingTitle}>{t("settings.specs")}</div>
        <div style={styles.specRow}>
          <span style={styles.pricingLabel}>{t("settings.contextWindow")}</span>
          <span style={styles.specValue}>{(model.contextWindow / 1000).toFixed(0)}K tokens</span>
        </div>
        <div style={styles.specRow}>
          <span style={styles.pricingLabel}>{t("settings.maxOutput")}</span>
          <span style={styles.specValue}>{(model.maxOutputTokens / 1000).toFixed(0)}K tokens</span>
        </div>
        <div style={styles.specRow}>
          <span style={styles.pricingLabel}>{t("settings.supportedFormats")}</span>
          <span style={styles.specValue}>{model.audioFormats.join(", ")}</span>
        </div>
      </div>

      {/* Pricing table */}
      <div style={styles.pricingCard}>
        <div style={styles.pricingTitle}>{t("settings.pricingInfo")}</div>
        <table style={styles.pricingTable}>
          <thead>
            <tr>
              <th style={styles.pricingTh}>{t("settings.pricingType")}</th>
              <th style={{ ...styles.pricingTh, textAlign: "right" }}>{t("settings.pricingRate")}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.pricingTd}>Text Input</td>
              <td style={{ ...styles.pricingTd, textAlign: "right" }}>${model.pricing.inputText}/1M tokens</td>
            </tr>
            <tr>
              <td style={styles.pricingTd}>Text Output</td>
              <td style={{ ...styles.pricingTd, textAlign: "right" }}>${model.pricing.outputText}/1M tokens</td>
            </tr>
            {model.pricing.inputAudio != null && (
              <tr>
                <td style={styles.pricingTd}>Audio Input</td>
                <td style={{ ...styles.pricingTd, textAlign: "right" }}>
                  ${model.pricing.inputAudio}/1M {model.pricing.audioPricingUnit === "seconds" ? "sec" : "tokens"}
                </td>
              </tr>
            )}
            {model.pricing.outputAudio != null && (
              <tr>
                <td style={styles.pricingTd}>Audio Output</td>
                <td style={{ ...styles.pricingTd, textAlign: "right" }}>${model.pricing.outputAudio}/1M tokens</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Cost estimation */}
      <div style={styles.pricingCard}>
        <div style={styles.pricingTitle}>{t("settings.costEstimate")}</div>
        {(() => {
          // For seconds-based audio pricing: $X per 1M seconds
          // 1 min = 60 seconds, 1 hour = 3600 seconds
          const isPerSec = model.pricing.audioPricingUnit === "seconds";
          const audioCostPerMin = isPerSec
            ? (60 * (model.pricing.inputAudio ?? 0)) / 1_000_000
            : (1500 * (model.pricing.inputAudio ?? model.pricing.inputText)) / 1_000_000;
          const outputCostPerMin = (100 * model.pricing.outputText) / 1_000_000;
          const costPerMin = audioCostPerMin + outputCostPerMin;
          const costPerHour = costPerMin * 60;
          return (
            <>
              <div style={styles.estimateRow}>
                <span style={styles.pricingLabel}>{t("settings.costPer1Min")}</span>
                <span style={styles.estimateValue}>~${costPerMin.toFixed(4)}</span>
              </div>
              <div style={styles.estimateRow}>
                <span style={styles.pricingLabel}>{t("settings.costPer1Hour")}</span>
                <span style={styles.estimateValue}>~${costPerHour.toFixed(2)}</span>
              </div>
            </>
          );
        })()}
        <div style={styles.pricingNote}>{t("settings.costEstimateNote")}</div>
      </div>

      {/* Notes */}
      <div style={styles.pricingCard}>
        <div style={styles.pricingTitle}>{t("settings.notes")}</div>
        <ul style={styles.notesList}>
          {model.notes.map((note, i) => (
            <li key={i} style={styles.noteItem}>{note}</li>
          ))}
        </ul>
      </div>

      {/* Link to OpenRouter model page */}
      <div style={{ marginTop: "4px" }}>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            window.electronAPI?.openExternal(`https://openrouter.ai/${model.id}`);
          }}
          style={styles.link}
        >
          {t("settings.viewOnOpenRouter")}
        </a>
      </div>
    </>
  );
}

/** DashScope help page showing pricing and free quota info */
function DashScopeHelp({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();

  return (
    <>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: "4px" }}>
            <path d="M11 1L4 8l7 7" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
          {t("settings.back")}
        </button>
      </div>

      <div style={styles.modelDetailHeader}>
        <h3 style={{ margin: 0, fontSize: "16px", color: "#fff" }}>{t("settings.aliyunTitle")}</h3>
        <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>gummy-chat-v1</div>
      </div>

      <div style={styles.pricingCard}>
        <div style={styles.pricingTitle}>{t("help.pricingTitle")}</div>
        <div style={styles.specRow}>
          <span style={styles.pricingLabel}>{t("help.modelPrice")}</span>
          <span style={styles.specValue}>0.00015 {t("help.yuanPerSec")}</span>
        </div>
        <div style={styles.specRow}>
          <span style={styles.pricingLabel}>{t("help.modelPriceHour")}</span>
          <span style={styles.specValue}>0.54 {t("help.yuanPerHour")}</span>
        </div>
        <div style={{ ...styles.pricingNote, color: "#e67e22", marginTop: "8px" }}>{t("help.dualBilling")}</div>
        <div style={styles.specRow}>
          <span style={styles.pricingLabel}>{t("help.actualPrice")}</span>
          <span style={styles.specValue}>0.0003 {t("help.yuanPerSec")}</span>
        </div>
        <div style={styles.specRow}>
          <span style={styles.pricingLabel}>{t("help.actualPriceHour")}</span>
          <span style={styles.specValue}>1.08 {t("help.yuanPerHour")}</span>
        </div>
      </div>

      <div style={{
        fontSize: "13px",
        color: "#51cf66",
        lineHeight: "1.5",
        padding: "8px 12px",
        backgroundColor: "rgba(81,207,102,0.1)",
        borderRadius: "4px",
      }}>
        {t("help.billingNote")}
      </div>

      <div style={styles.pricingCard}>
        <div style={styles.pricingTitle}>{t("help.freeQuotaTitle")}</div>
        <div style={{ fontSize: "13px", color: "#ccc", lineHeight: "1.6" }}>
          {t("help.freeQuota")}
        </div>
      </div>
    </>
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
    padding: "20px",
    width: "380px",
    maxHeight: "90vh",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    margin: 0,
    fontSize: "16px",
    color: "#fff",
  },
  closeBtn: {
    background: "none",
    border: "1px solid #444",
    color: "#aaa",
    cursor: "pointer",
    fontSize: "16px",
    padding: "4px 8px",
    borderRadius: "4px",
  },
  tabBar: {
    display: "flex",
    gap: "0",
    borderBottom: "1px solid #333",
  },
  tab: {
    flex: 1,
    background: "none",
    border: "none",
    borderBottom: "2px solid transparent",
    padding: "8px 12px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 500,
    transition: "color 0.2s",
  },
  tabContent: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    minHeight: 0,
    flex: 1,
    overflowY: "auto",
  },
  providerSelector: {
    display: "flex",
    gap: "8px",
  },
  providerBtn: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: "6px",
    border: "1px solid #444",
    cursor: "pointer",
    textAlign: "left",
    transition: "all 0.2s",
  },
  providerBtnName: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#e0e0e0",
  },
  activeBadge: {
    fontSize: "10px",
    color: "#51cf66",
    marginTop: "2px",
  },
  providerSection: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  sectionTitle: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#e0e0e0",
    marginTop: "4px",
  },
  sectionDesc: {
    fontSize: "12px",
    color: "#888",
    lineHeight: "1.4",
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
  modelList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  modelCard: {
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #444",
    backgroundColor: "#1a1a2e",
  },
  modelCardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
  },
  modelName: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#e0e0e0",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  recommendedBadge: {
    fontSize: "10px",
    color: "#27ae60",
    backgroundColor: "rgba(39,174,96,0.15)",
    padding: "1px 5px",
    borderRadius: "3px",
    fontWeight: 500,
  },
  modelId: {
    fontSize: "11px",
    color: "#888",
    marginTop: "2px",
  },
  modelDetailBtn: {
    background: "none",
    border: "1px solid #555",
    color: "#888",
    cursor: "pointer",
    padding: "4px 6px",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
  },
  modelPriceRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "4px",
    padding: "0 8px",
  },
  modelPriceLabel: {
    fontSize: "11px",
    color: "#888",
  },
  modelPriceValue: {
    fontSize: "11px",
    color: "#aaa",
  },
  pricingCard: {
    backgroundColor: "#1a1a2e",
    borderRadius: "6px",
    padding: "10px 12px",
    marginTop: "4px",
  },
  pricingTitle: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#aaa",
    marginBottom: "6px",
    textTransform: "uppercase",
    letterSpacing: "0.3px",
  },
  pricingRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "2px 0",
  },
  pricingLabel: {
    fontSize: "12px",
    color: "#888",
  },
  pricingValue: {
    fontSize: "12px",
    color: "#ccc",
    fontFamily: "monospace",
  },
  pricingNote: {
    fontSize: "11px",
    color: "#666",
    marginTop: "6px",
    lineHeight: "1.4",
  },
  pricingTable: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "12px",
  },
  pricingTh: {
    textAlign: "left",
    padding: "4px 0",
    color: "#888",
    borderBottom: "1px solid #333",
    fontWeight: 500,
    fontSize: "11px",
  },
  pricingTd: {
    padding: "4px 0",
    color: "#ccc",
    borderBottom: "1px solid #2a2a3e",
  },
  estimateRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "3px 0",
  },
  estimateValue: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#51cf66",
    fontFamily: "monospace",
  },
  notesList: {
    margin: 0,
    paddingLeft: "18px",
    listStyle: "disc",
  },
  noteItem: {
    fontSize: "12px",
    color: "#bbb",
    lineHeight: "1.6",
  },
  formatRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "6px 0",
  },
  buttons: {
    display: "flex",
    gap: "8px",
    marginTop: "8px",
    flexShrink: 0,
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
  deviceSelectRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "3px 0",
  },
  deviceSelect: {
    flex: 1,
    padding: "4px 8px",
    borderRadius: "4px",
    border: "1px solid #444",
    backgroundColor: "#222244",
    color: "#e0e0e0",
    fontSize: "12px",
    outline: "none",
  },
  deviceKind: {
    fontSize: "11px",
    color: "#666",
    flexShrink: 0,
    minWidth: "28px",
  },
  deviceName: {
    fontSize: "12px",
    color: "#bbb",
    wordBreak: "break-word",
  },
  backBtn: {
    background: "none",
    border: "1px solid #444",
    color: "#aaa",
    cursor: "pointer",
    fontSize: "12px",
    padding: "4px 10px",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
  },
  modelDetailHeader: {
    marginTop: "4px",
  },
  specRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "3px 0",
  },
  specValue: {
    fontSize: "12px",
    color: "#ccc",
    fontFamily: "monospace",
  },
  providerDisclaimer: {
    fontSize: "11px",
    color: "#888",
    lineHeight: "1.5",
  },
  regionWarning: {
    fontSize: "11px",
    color: "#e67e22",
    backgroundColor: "rgba(230,126,34,0.1)",
    padding: "6px 10px",
    borderRadius: "4px",
    lineHeight: "1.5",
  },
  logBtn: {
    padding: "6px 12px",
    borderRadius: "4px",
    border: "1px solid #444",
    backgroundColor: "transparent",
    color: "#aaa",
    fontSize: "12px",
    cursor: "pointer",
    marginTop: "4px",
  },
  advancedToggle: {
    background: "none",
    border: "none",
    color: "#888",
    cursor: "pointer",
    fontSize: "12px",
    padding: "4px 0",
    display: "flex",
    alignItems: "center",
    textAlign: "left",
  },
  advancedSection: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  timeoutRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  timeoutUnit: {
    fontSize: "13px",
    color: "#888",
  },
  helpLink: {
    background: "none",
    border: "none",
    color: "#6c8ebf",
    cursor: "pointer",
    fontSize: "11px",
    padding: "4px 0 0",
    textAlign: "left",
  },
};
