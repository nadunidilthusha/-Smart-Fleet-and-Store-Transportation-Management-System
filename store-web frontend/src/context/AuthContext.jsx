import { createContext, useCallback, useMemo, useState } from "react";
import { canAccess } from "../utils/roles";
import { TOKEN_KEY, USER_KEY } from "../utils/constants";

export const AuthContext = createContext(null);

const REMEMBER_KEY = "store_remember_workstation";

// Prefer remembered localStorage session, otherwise fall back to sessionStorage
function readStorage() {
  const remembered = localStorage.getItem(REMEMBER_KEY) === "1";
  return remembered ? localStorage : sessionStorage;
}

function readStoredUser() {
  try {
    const raw =
      localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

export function AuthProvider({ children }) {
  // Restore an existing session if the user previously signed in
  const [user, setUser] = useState(() => {
    const storedUser = readStoredUser();
    const storedToken = readStoredToken();
    return storedUser && storedToken ? storedUser : null;
  });

  // Persist token + user after a successful loginRequest
  const login = useCallback(({ token, user: nextUser, remember = true }) => {
    // Clear both storages first so only one session copy remains
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);

    if (remember) localStorage.setItem(REMEMBER_KEY, "1");
    else localStorage.removeItem(REMEMBER_KEY);

    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(TOKEN_KEY, token);
    storage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  // Clear the active session and return the portal to the login screen
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  // Convenience permission helper for pages and navigation
  const can = useCallback((permission) => canAccess(user, permission), [user]);

  const value = useMemo(
    () => ({ user, login, logout, can, isAuthenticated: Boolean(user) }),
    [user, login, logout, can]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Exported for apiClient / tests that need the active storage target
export function getAuthStorage() {
  return readStorage();
}
