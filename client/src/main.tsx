import ReactDOM from "react-dom/client";
import App from "./App";
import "./i18n";
import "./global.css";

// Note: StrictMode disabled because it double-mounts components in dev,
// which breaks @ricky0123/vad-react's audio context initialization.
ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
