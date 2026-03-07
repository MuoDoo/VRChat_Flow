import { useState } from "react";
import { useTranslation } from "react-i18next";

interface AuthViewProps {
  onLogin: (username: string, password: string) => Promise<string | null>;
  onRegister: (username: string, password: string) => Promise<string | null>;
}

export default function AuthView({ onLogin, onRegister }: AuthViewProps) {
  const { t } = useTranslation();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (isRegister) {
        const result = await onRegister(username, password);
        if (result === "REGISTER_SUCCESS_PENDING") {
          setSuccess(t("auth.registerSuccessPending"));
          setIsRegister(false);
          setUsername("");
          setPassword("");
        } else if (result === "REGISTER_SUCCESS") {
          setSuccess(t("auth.registerSuccess"));
          setIsRegister(false);
          setUsername("");
          setPassword("");
        } else if (result) {
          setError(t(`error.${result}`, result));
        }
      } else {
        const result = await onLogin(username, password);
        if (result) {
          setError(t(`error.${result}`, result));
        }
      }
    } catch {
      setError(t("error.transcribeFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h1 style={styles.title}>{t("app.title")}</h1>
        <h2 style={styles.subtitle}>
          {isRegister ? t("auth.register") : t("auth.login")}
        </h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>{t("auth.username")}</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              autoFocus
            />
            {isRegister && (
              <span style={styles.hint}>{t("auth.usernameRule")}</span>
            )}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>{t("auth.password")}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
            />
            {isRegister && (
              <span style={styles.hint}>{t("auth.passwordRule")}</span>
            )}
          </div>

          {error && <div style={styles.error}>{error}</div>}
          {success && <div style={styles.success}>{success}</div>}

          <button type="submit" style={styles.submitBtn} disabled={loading}>
            {isRegister ? t("auth.register") : t("auth.login")}
          </button>
        </form>

        <button
          onClick={() => {
            setIsRegister(!isRegister);
            setError(null);
            setSuccess(null);
          }}
          style={styles.switchBtn}
        >
          {isRegister ? t("auth.switchToLogin") : t("auth.switchToRegister")}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#222244",
    borderRadius: "8px",
    padding: "32px",
    width: "320px",
  },
  title: {
    margin: "0 0 4px 0",
    fontSize: "24px",
    textAlign: "center",
    color: "#fff",
  },
  subtitle: {
    margin: "0 0 24px 0",
    fontSize: "16px",
    textAlign: "center",
    color: "#888",
    fontWeight: 400,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  label: {
    fontSize: "13px",
    color: "#aaa",
  },
  input: {
    padding: "8px 12px",
    borderRadius: "4px",
    border: "1px solid #444",
    backgroundColor: "#1a1a2e",
    color: "#e0e0e0",
    fontSize: "14px",
    outline: "none",
  },
  hint: {
    fontSize: "11px",
    color: "#666",
  },
  error: {
    color: "#ff6b6b",
    fontSize: "13px",
    textAlign: "center",
  },
  success: {
    color: "#51cf66",
    fontSize: "13px",
    textAlign: "center",
  },
  submitBtn: {
    padding: "10px",
    borderRadius: "4px",
    border: "none",
    backgroundColor: "#4a4a8a",
    color: "#fff",
    fontSize: "14px",
    cursor: "pointer",
    fontWeight: 600,
  },
  switchBtn: {
    background: "none",
    border: "none",
    color: "#6a6aaa",
    fontSize: "13px",
    cursor: "pointer",
    marginTop: "16px",
    width: "100%",
    textAlign: "center",
  },
};
