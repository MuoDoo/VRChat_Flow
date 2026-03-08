import { useTranslation } from "react-i18next";

interface HelpProps {
  onClose: () => void;
}

export default function Help({ onClose }: HelpProps) {
  const { t } = useTranslation();

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>{t("help.title")}</h3>
          <button onClick={onClose} style={styles.closeBtn}>
            &times;
          </button>
        </div>

        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>{t("help.pricingTitle")}</h4>
          <table style={styles.table}>
            <tbody>
              <tr>
                <td style={styles.td}>{t("help.modelPrice")}</td>
                <td style={styles.tdValue}>0.00015 {t("help.yuanPerSec")}</td>
              </tr>
              <tr>
                <td style={styles.td}>{t("help.modelPriceHour")}</td>
                <td style={styles.tdValue}>0.54 {t("help.yuanPerHour")}</td>
              </tr>
            </tbody>
          </table>
          <p style={styles.note}>{t("help.dualBilling")}</p>
          <table style={styles.table}>
            <tbody>
              <tr>
                <td style={styles.td}>{t("help.actualPrice")}</td>
                <td style={styles.tdValue}>0.0003 {t("help.yuanPerSec")}</td>
              </tr>
              <tr>
                <td style={styles.td}>{t("help.actualPriceHour")}</td>
                <td style={styles.tdValue}>1.08 {t("help.yuanPerHour")}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p style={styles.billingNote}>{t("help.billingNote")}</p>

        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>{t("help.freeQuotaTitle")}</h4>
          <p style={styles.text}>{t("help.freeQuota")}</p>
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
    width: "340px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
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
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "13px",
    color: "#aaa",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  table: {
    borderCollapse: "collapse",
  },
  td: {
    padding: "4px 12px 4px 0",
    fontSize: "13px",
    color: "#ccc",
  },
  tdValue: {
    padding: "4px 0",
    fontSize: "13px",
    color: "#51cf66",
    fontWeight: 600,
    textAlign: "right",
  },
  note: {
    margin: "6px 0 2px",
    fontSize: "12px",
    color: "#e67e22",
    lineHeight: "1.5",
  },
  billingNote: {
    margin: 0,
    fontSize: "13px",
    color: "#51cf66",
    lineHeight: "1.5",
    padding: "8px 12px",
    backgroundColor: "rgba(81,207,102,0.1)",
    borderRadius: "4px",
  },
  text: {
    margin: 0,
    fontSize: "13px",
    color: "#ccc",
    lineHeight: "1.6",
  },
};
