import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../lib/api.ts";
import type { User } from "../types.ts";

export interface RegisterData {
  name: string;
  username: string;
  email: string;
  password: string;
}

interface AuthContextValue {
  user: User | null;
  // true enquanto verifica, ao abrir o app, se já existe uma sessão
  loading: boolean;
  login: (login: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  // Atualiza os dados do usuário logado na tela (ex: depois de editar o perfil)
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Guarda quem está logado e disponibiliza para qualquer tela do app
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ user: User | null }>("/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(login: string, password: string) {
    const data = await api<{ user: User }>("/auth/login", {
      method: "POST",
      body: { login, password },
    });
    setUser(data.user);
  }

  async function register(registerData: RegisterData) {
    const data = await api<{ user: User }>("/auth/register", {
      method: "POST",
      body: registerData,
    });
    setUser(data.user);
  }

  async function logout() {
    await api("/auth/logout", { method: "POST" });
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser: setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return context;
}
