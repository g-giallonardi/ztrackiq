"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import type { AuthUser } from "@/types/auth";
import { useUserStore } from "@/stores/userStore";

export function AuthStoreProvider({
  initialUser,
  children,
}: {
  initialUser: AuthUser | null;
  children: ReactNode;
}) {
  const setAuthUser = useUserStore((state) => state.setAuthUser);
  const clearAuthUser = useUserStore((state) => state.clearAuthUser);

  useEffect(() => {
    if (initialUser) {
      setAuthUser(initialUser);
      return;
    }

    clearAuthUser();
  }, [initialUser, setAuthUser, clearAuthUser]);

  return <>{children}</>;
}
