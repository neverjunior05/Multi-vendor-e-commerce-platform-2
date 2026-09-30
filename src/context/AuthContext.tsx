"use client";

/**
 * AUTH CONTEXT (React Context API state management)
 * Bootstraps from GET /api/auth/me on mount, exposes login/signup/logout and
 * role helpers (`isVendor`, `isAdmin`, `can(...)`). Route protection on the
 * client is a UX courtesy — the real enforcement lives in the API middleware.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, TOKEN_KEY, apiErrorMessage } from "@/lib/api-client";
import type { Role, SessionUser, VendorProfile } from "@/lib/types";

type AuthState = {
  user: SessionUser | null;
  vendor: VendorProfile | null;
  loading: boolean;
  ready: boolean;
  login: (email: string, password: string) => Promise<SessionUser>;
  signup: (input: SignupInput) => Promise<SessionUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<SessionUser | null>;
  hasRole: (...roles: Role[]) => boolean;
};

export type SignupInput = {
  name: string;
  email: string;
  password: string;
  role: "customer" | "vendor";
  storeName?: string;
  tagline?: string;
  city?: string;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const persist = useCallback((payload: { user: SessionUser | null; vendor?: VendorProfile | null }, token?: string) => {
    setUser(payload.user);
    setVendor(payload.vendor ?? null);
    if (token && typeof window !== "undefined") window.localStorage.setItem(TOKEN_KEY, token);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get<{ user: SessionUser | null; vendor: VendorProfile | null }>("/auth/me");
      setUser(data.user);
      setVendor(data.vendor);
      return data.user;
    } catch {
      setUser(null);
      setVendor(null);
      return null;
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        const { data } = await api.post<{ token: string; user: SessionUser }>("/auth/login", { email, password });
        const me = await api.get<{ user: SessionUser | null; vendor: VendorProfile | null }>("/auth/me", {
          headers: { Authorization: `Bearer ${data.token}` },
        });
        persist({ user: me.data.user, vendor: me.data.vendor }, data.token);
        return data.user;
      } catch (error) {
        throw new Error(apiErrorMessage(error, "Could not sign in."));
      } finally {
        setLoading(false);
      }
    },
    [persist],
  );

  const signup = useCallback(
    async (input: SignupInput) => {
      setLoading(true);
      try {
        const { data } = await api.post<{ token: string; user: SessionUser }>("/auth/signup", input);
        const me = await api.get<{ user: SessionUser | null; vendor: VendorProfile | null }>("/auth/me", {
          headers: { Authorization: `Bearer ${data.token}` },
        });
        persist({ user: me.data.user, vendor: me.data.vendor }, data.token);
        return data.user;
      } catch (error) {
        throw new Error(apiErrorMessage(error, "Could not create the account."));
      } finally {
        setLoading(false);
      }
    },
    [persist],
  );

  const logout = useCallback(async () => {
    await api.post("/auth/logout").catch(() => null);
    if (typeof window !== "undefined") window.localStorage.removeItem(TOKEN_KEY);
    persist({ user: null, vendor: null });
  }, [persist]);

  const hasRole = useCallback(
    (...roles: Role[]) => (user ? roles.includes(user.role) : false),
    [user],
  );

  const value = useMemo<AuthState>(
    () => ({ user, vendor, loading, ready, login, signup, logout, refresh, hasRole }),
    [user, vendor, loading, ready, login, signup, logout, refresh, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
