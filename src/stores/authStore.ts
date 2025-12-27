import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "../lib/axiosInstance";

interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setTokens: (accessToken: string, refreshToken: string | null) => void;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      loading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ loading: true, error: null });
        try {
          const res = await api.post<{
            accessToken: string;
            refreshToken?: string;
            user: { _id?: string; id?: string; name: string; email: string; role?: string };
          }>("/auth/signin", { email, password });

          const { accessToken, refreshToken, user } = res.data;
          set({
            accessToken,
            refreshToken: refreshToken || null,
            user: {
              id: user._id || user.id || "",
              name: user.name,
              email: user.email,
              role: user.role,
            },
            loading: false,
          });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Login failed";
          set({ error: message, loading: false });
          throw new Error(message);
        }
      },

      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null });
      },

      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken });
      },

      setUser: (user) => set({ user }),
    }),
    { name: "admin-auth" }
  )
);
