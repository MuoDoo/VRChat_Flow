import { useTranslation } from "react-i18next";

const languages = [
  { code: "en", label: "English" },
  { code: "zh-CN", label: "中文" },
  { code: "ja", label: "日本語" },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value;
    i18n.changeLanguage(lang);
    localStorage.setItem("vrcflow-language", lang);
  };

  return (
    <select
      value={i18n.language}
      onChange={handleChange}
      style={styles.select}
    >
      {languages.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  );
}

const styles: Record<string, React.CSSProperties> = {
  select: {
    padding: "4px 24px 4px 8px",
    borderRadius: "4px",
    border: "1px solid #3a3a6a",
    backgroundColor: "#1a1a2e",
    color: "#ccc",
    fontSize: "12px",
    outline: "none",
    cursor: "pointer",
  },
};
