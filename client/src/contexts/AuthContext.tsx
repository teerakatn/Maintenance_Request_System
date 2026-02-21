import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type { AuthUser, RegisterPayload } from "../types/auth";
import { loginApi, registerApi } from "../lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────
interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  register: (payload: RegisterPayload) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

// ── Context ───────────────────────────────────────────────────────────────────
export const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [token, setToken]     = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // โหลด token + user จาก localStorage เมื่อเปิด app ครั้งแรก
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUser  = localStorage.getItem("user");
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser) as AuthUser);
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    setIsLoading(false);
  }, []);

  async function register(payload: RegisterPayload) {
    await registerApi(payload);
    // หลังสมัครสำเร็จ → login อัตโนมัติ
    await login(payload.email, payload.password);
  }

  async function login(email: string, password: string) {
    const { token: newToken, user: newUser } = await loginApi(email, password);
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
