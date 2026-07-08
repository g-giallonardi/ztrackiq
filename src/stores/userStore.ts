"use client";

import { create } from "zustand";
import type { AuthUser } from "@/types/auth";

type UserStore = {
  user: AuthUser | null;
  jwtValid: boolean;
  setAuthUser: (user: AuthUser) => void;
  clearAuthUser: () => void;
  hasRole: (roles: string[]) => boolean;
};

export const useUserStore = create<UserStore>((set, get) => ({
  user: null,
  jwtValid: false,
  setAuthUser: (user) => set({ user, jwtValid: true }),
  clearAuthUser: () => set({ user: null, jwtValid: false }),
  hasRole: (roles) => {
    const user = get().user;
    return Boolean(user && roles.includes(user.role));
  },
}));
