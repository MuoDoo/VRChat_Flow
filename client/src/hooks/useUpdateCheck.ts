import { useState, useEffect } from "react";
import { APP_VERSION, GITHUB_REPO } from "../constants";

interface UpdateInfo {
  latestVersion: string;
  downloadUrl: string;
}

export function useUpdateCheck(): UpdateInfo | null {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.tag_name) return;
        const latest = data.tag_name.replace(/^v/, "");
        const current = APP_VERSION.replace(/^v/, "");
        if (latest !== current) {
          setUpdate({
            latestVersion: latest,
            downloadUrl: data.html_url,
          });
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, []);

  return update;
}
