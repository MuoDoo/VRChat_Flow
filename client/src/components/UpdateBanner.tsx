import { useState } from "react";
import { useTranslation } from "react-i18next";
import { APP_VERSION } from "../constants";

interface Props {
  latestVersion: string;
  downloadUrl: string;
}

export default function UpdateBanner({ latestVersion, downloadUrl }: Props) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div style={styles.banner}>
      <span>
        {t("update.available", { current: APP_VERSION, latest: latestVersion })}
      </span>
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          window.electronAPI.openExternal(downloadUrl);
        }}
        style={styles.link}
      >
        {t("update.download")}
      </a>
      <button onClick={() => setDismissed(true)} style={styles.dismiss}>
        &times;
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  banner: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "6px 16px",
    background: "#2a2a4a",
    borderBottom: "1px solid #3a3a6a",
    fontSize: "13px",
    color: "#ccc",
  },
  link: {
    color: "#6cb4ee",
    textDecoration: "none",
    fontWeight: 600,
  },
  dismiss: {
    marginLeft: "auto",
    background: "none",
    border: "none",
    color: "#888",
    fontSize: "16px",
    cursor: "pointer",
    padding: "0 4px",
  },
};
