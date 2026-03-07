import { useState, useCallback, useEffect, useRef } from "react";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  username: string | null;
  isLoggedIn: boolean;
}

// Decode JWT payload without external library
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

function isTokenExpiringSoon(token: string, thresholdMs = 60_000): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") return true;
  return payload.exp * 1000 - Date.now() < thresholdMs;
}

const STORAGE_KEY_ACCESS = "vrcflow-accessToken";
const STORAGE_KEY_REFRESH = "vrcflow-refreshToken";
const STORAGE_KEY_USERNAME = "vrcflow-username";

export function useAuth() {
  const [state, setState] = useState<AuthState>(() => {
    const accessToken = localStorage.getItem(STORAGE_KEY_ACCESS);
    const refreshToken = localStorage.getItem(STORAGE_KEY_REFRESH);
    const username = localStorage.getItem(STORAGE_KEY_USERNAME);
    return {
      accessToken,
      refreshToken,
      username,
      isLoggedIn: !!accessToken,
    };
  });

  const refreshingRef = useRef(false);

  const setTokens = useCallback(
    (access: string, refresh: string, user: string) => {
      localStorage.setItem(STORAGE_KEY_ACCESS, access);
      localStorage.setItem(STORAGE_KEY_REFRESH, refresh);
      localStorage.setItem(STORAGE_KEY_USERNAME, user);
      setState({
        accessToken: access,
        refreshToken: refresh,
        username: user,
        isLoggedIn: true,
      });
    },
    []
  );

  const clearTokens = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_ACCESS);
    localStorage.removeItem(STORAGE_KEY_REFRESH);
    localStorage.removeItem(STORAGE_KEY_USERNAME);
    setState({
      accessToken: null,
      refreshToken: null,
      username: null,
      isLoggedIn: false,
    });
  }, []);

  const serverUrl = useCallback(
    () => localStorage.getItem("vrcflow-serverUrl") || "http://localhost:8080",
    []
  );

  const login = useCallback(
    async (username: string, password: string): Promise<string | null> => {
      const res = await fetch(`${serverUrl()}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return data?.detail?.code || data?.code || "AUTH_INVALID_CREDENTIALS";
      }
      setTokens(data.access_token, data.refresh_token, username);
      return null;
    },
    [serverUrl, setTokens]
  );

  const register = useCallback(
    async (username: string, password: string): Promise<string | null> => {
      const res = await fetch(`${serverUrl()}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return data?.detail?.code || data?.code || "AUTH_USERNAME_TAKEN";
      }
      return "REGISTER_SUCCESS_PENDING";
    },
    [serverUrl]
  );

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    const rt = localStorage.getItem(STORAGE_KEY_REFRESH);
    if (!rt) {
      clearTokens();
      return null;
    }
    if (refreshingRef.current) return null;
    refreshingRef.current = true;
    try {
      const res = await fetch(`${serverUrl()}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: rt }),
      });
      if (!res.ok) {
        clearTokens();
        return null;
      }
      const data = await res.json();
      const newAccess = data.access_token;
      localStorage.setItem(STORAGE_KEY_ACCESS, newAccess);
      setState((prev) => ({ ...prev, accessToken: newAccess }));
      return newAccess;
    } catch {
      clearTokens();
      return null;
    } finally {
      refreshingRef.current = false;
    }
  }, [serverUrl, clearTokens]);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const current = localStorage.getItem(STORAGE_KEY_ACCESS);
    if (!current) return null;
    if (isTokenExpiringSoon(current)) {
      return refreshAccessToken();
    }
    return current;
  }, [refreshAccessToken]);

  const logout = useCallback(async () => {
    const rt = localStorage.getItem(STORAGE_KEY_REFRESH);
    if (rt) {
      try {
        await fetch(`${serverUrl()}/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: rt }),
        });
      } catch {
        // ignore
      }
    }
    clearTokens();
  }, [serverUrl, clearTokens]);

  // Auto-refresh on mount if token is expiring
  useEffect(() => {
    if (state.accessToken && isTokenExpiringSoon(state.accessToken)) {
      refreshAccessToken();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isLoggedIn: state.isLoggedIn,
    username: state.username,
    accessToken: state.accessToken,
    getAccessToken,
    login,
    register,
    logout,
  };
}
