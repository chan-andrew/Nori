import { createContext, useContext, useState } from "react";
import { api } from "../lib/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("nori_user")) ?? null;
    } catch {
      return null;
    }
  });

  function persist(nextUser) {
    setUser(nextUser);
    if (nextUser) localStorage.setItem("nori_user", JSON.stringify(nextUser));
    else localStorage.removeItem("nori_user");
  }

  async function signup(email, password) {
    const { user: u } = await api.signup(email, password);
    persist(u);
    return u;
  }

  async function login(email, password) {
    const { user: u } = await api.login(email, password);
    persist(u);
    return u;
  }

  function logout() {
    persist(null);
  }

  return (
    <AuthContext.Provider value={{ user, signup, login, logout, setUser: persist }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
