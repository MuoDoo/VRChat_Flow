import { useTranslation } from "react-i18next";

interface TutorialProps {
  onClose: () => void;
}

export default function Tutorial({ onClose }: TutorialProps) {
  const { t } = useTranslation();

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <div style={styles.header}>
          <h3 style={styles.title}>{t("tutorial.title")}</h3>
          <button onClick={onClose} style={styles.closeBtn}>&times;</button>
        </div>

        <div style={styles.content}>
          {/* Welcome */}
          <div style={styles.welcome}>
            {t("tutorial.welcome")}
          </div>

          {/* Step 1: UI Language */}
          <div style={styles.section}>
            <div style={styles.stepHeader}>
              <span style={styles.stepNumber}>1</span>
              <span style={styles.stepTitle}>{t("tutorial.step1Title")}</span>
            </div>
            <div style={styles.stepDesc}>{t("tutorial.step1Desc")}</div>
          </div>

          {/* Step 2: Translation Languages */}
          <div style={styles.section}>
            <div style={styles.stepHeader}>
              <span style={styles.stepNumber}>2</span>
              <span style={styles.stepTitle}>{t("tutorial.step2Title")}</span>
            </div>
            <div style={styles.stepDesc}>{t("tutorial.step2Desc")}</div>
          </div>

          {/* Step 3: Choose Provider */}
          <div style={styles.section}>
            <div style={styles.stepHeader}>
              <span style={styles.stepNumber}>3</span>
              <span style={styles.stepTitle}>{t("tutorial.step3Title")}</span>
            </div>
            <div style={styles.stepDesc}>{t("tutorial.step3Desc")}</div>

            {/* DashScope card */}
            <div style={styles.providerCard}>
              <div style={styles.providerName}>DashScope</div>
              <div style={styles.providerAudience}>{t("tutorial.dashscopeAudience")}</div>
              <div style={styles.providerDetail}>{t("tutorial.dashscopeDetail")}</div>
            </div>

            {/* OpenRouter card */}
            <div style={styles.providerCard}>
              <div style={styles.providerName}>OpenRouter</div>
              <div style={styles.providerAudience}>{t("tutorial.openrouterAudience")}</div>
              <div style={styles.providerDetail}>{t("tutorial.openrouterDetail")}</div>
            </div>
          </div>

          {/* Step 4: API Key */}
          <div style={styles.section}>
            <div style={styles.stepHeader}>
              <span style={styles.stepNumber}>4</span>
              <span style={styles.stepTitle}>{t("tutorial.step4Title")}</span>
            </div>
            <div style={styles.stepDesc}>{t("tutorial.step4Desc")}</div>
          </div>

          {/* Step 5: Model Selection */}
          <div style={styles.section}>
            <div style={styles.stepHeader}>
              <span style={styles.stepNumber}>5</span>
              <span style={styles.stepTitle}>{t("tutorial.step5Title")}</span>
            </div>
            <div style={styles.stepDesc}>{t("tutorial.step5Desc")}</div>
          </div>

          {/* Step 6: Feature Modules */}
          <div style={styles.section}>
            <div style={styles.stepHeader}>
              <span style={styles.stepNumber}>6</span>
              <span style={styles.stepTitle}>{t("tutorial.step6Title")}</span>
            </div>
            <div style={styles.stepDesc}>{t("tutorial.step6Desc")}</div>
            <div style={styles.featureList}>
              <div style={styles.featureItem}>
                <span style={styles.featureIcon}>🎤</span>
                <div>
                  <div style={styles.featureName}>{t("tutorial.featureMic")}</div>
                  <div style={styles.featureDesc}>{t("tutorial.featureMicDesc")}</div>
                </div>
              </div>
              <div style={styles.featureItem}>
                <span style={styles.featureIcon}>🔊</span>
                <div>
                  <div style={styles.featureName}>{t("tutorial.featureSpeaker")}</div>
                  <div style={styles.featureDesc}>{t("tutorial.featureSpeakerDesc")}</div>
                </div>
              </div>
              <div style={styles.featureItem}>
                <span style={styles.featureIcon}>🥽</span>
                <div>
                  <div style={styles.featureName}>{t("tutorial.featureOverlay")}</div>
                  <div style={styles.featureDesc}>{t("tutorial.featureOverlayDesc")}</div>
                </div>
              </div>
              <div style={styles.featureItem}>
                <span style={styles.featureIcon}>💬</span>
                <div>
                  <div style={styles.featureName}>{t("tutorial.featureOsc")}</div>
                  <div style={styles.featureDesc}>{t("tutorial.featureOscDesc")}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Ready */}
          <div style={styles.readySection}>
            {t("tutorial.ready")}
          </div>
        </div>

        <div style={styles.buttons}>
          <button onClick={onClose} style={styles.startBtn}>
            {t("tutorial.startBtn")}
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
    padding: "20px",
    width: "420px",
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
  content: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    overflowY: "auto",
    flex: 1,
    minHeight: 0,
  },
  welcome: {
    fontSize: "13px",
    color: "#ccc",
    lineHeight: "1.6",
    padding: "8px 12px",
    backgroundColor: "rgba(108,142,191,0.1)",
    borderRadius: "6px",
    borderLeft: "3px solid #6c8ebf",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  stepHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  stepNumber: {
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    backgroundColor: "#4a4a8a",
    color: "#fff",
    fontSize: "12px",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepTitle: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#e0e0e0",
  },
  stepDesc: {
    fontSize: "12px",
    color: "#999",
    lineHeight: "1.5",
    marginLeft: "30px",
  },
  providerCard: {
    marginLeft: "30px",
    padding: "10px 12px",
    backgroundColor: "#1a1a2e",
    borderRadius: "6px",
    border: "1px solid #333",
  },
  providerName: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#e0e0e0",
  },
  providerAudience: {
    fontSize: "12px",
    color: "#6c8ebf",
    fontWeight: 500,
    marginTop: "2px",
  },
  providerDetail: {
    fontSize: "11px",
    color: "#888",
    lineHeight: "1.5",
    marginTop: "4px",
  },
  featureList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginLeft: "30px",
  },
  featureItem: {
    display: "flex",
    gap: "8px",
    alignItems: "flex-start",
    padding: "6px 10px",
    backgroundColor: "#1a1a2e",
    borderRadius: "4px",
  },
  featureIcon: {
    fontSize: "16px",
    flexShrink: 0,
    marginTop: "1px",
  },
  featureName: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#e0e0e0",
  },
  featureDesc: {
    fontSize: "11px",
    color: "#888",
    lineHeight: "1.4",
  },
  readySection: {
    fontSize: "13px",
    color: "#51cf66",
    lineHeight: "1.5",
    padding: "8px 12px",
    backgroundColor: "rgba(81,207,102,0.1)",
    borderRadius: "4px",
    textAlign: "center",
  },
  buttons: {
    display: "flex",
    gap: "8px",
    marginTop: "8px",
    flexShrink: 0,
  },
  startBtn: {
    flex: 1,
    padding: "8px",
    borderRadius: "4px",
    border: "none",
    backgroundColor: "#4a4a8a",
    color: "#fff",
    cursor: "pointer",
    fontSize: "13px",
  },
};
