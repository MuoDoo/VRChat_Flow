import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import zhCN from "./zh-CN.json";
import ja from "./ja.json";

// Detect language from localStorage or navigator
function detectLanguage(): string {
  try {
    const stored = localStorage.getItem("vrcflow-language");
    if (stored) return stored;
  } catch {
    // localStorage may not be available
  }
  const nav = navigator.language;
  if (nav.startsWith("zh")) return "zh-CN";
  if (nav.startsWith("ja")) return "ja";
  return "en";
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    "zh-CN": { translation: zhCN },
    ja: { translation: ja },
  },
  lng: detectLanguage(),
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
