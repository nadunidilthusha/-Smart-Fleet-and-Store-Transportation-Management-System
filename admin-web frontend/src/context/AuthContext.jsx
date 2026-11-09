import { createContext, useCallback, useMemo, useState } from "react";
import { ROLES } from "../utils/roles";
import { TOKEN_KEY, USER_KEY } from "../utils/constants";

export const AuthContext = createContext(null);

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";
// Used only while VITE_USE_MOCK is on, so the dashboard opens without a login page
const DEMO_USER = { id: "demo-admin", name: "Sadun Perera", role: ROLES.SYSTEM_ADMIN };

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readStoredUser() ?? (USE_MOCK ? DEMO_USER : null));

  // Call this from the login page: login({ token, user })
  const login = useCallback(({ token, user: nextUser }) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}