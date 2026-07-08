"use client";

import Link from "next/link";
import { logout } from "./logout/actions";
import { useUserStore } from "@/stores/userStore";

function getDisplayName(user: {
  firstname: string;
  lastname: string | null;
  nickname: string | null;
}) {
  if (user.nickname) return user.nickname;

  return [user.firstname, user.lastname].filter(Boolean).join(" ");
}

function formatRole(role: string) {
  return role === "admin"
    ? "Admin"
    : role === "adherent"
      ? "Adhérent"
      : "Visiteur";
}

export function UserMenu() {
  const user = useUserStore((state) => state.user);
  const jwtValid = useUserStore((state) => state.jwtValid);

  if (!jwtValid || !user) {
    return (
      <Link
        href="/login"
        className="mt-8 block rounded-xl border border-white/10 px-4 py-3 text-sm font-bold uppercase text-white transition hover:border-pink-500 hover:bg-pink-500"
      >
        Connexion
      </Link>
    );
  }

  return (
    <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="truncate text-sm font-black text-white">
        {getDisplayName(user)}
      </p>
      <p className="mt-1 text-xs font-semibold uppercase text-zinc-400">
        {formatRole(user.role)}
      </p>

      <form action={logout} className="mt-3">
        <button
          type="submit"
          className="w-full rounded-md border border-white/10 px-3 py-2 text-xs font-bold uppercase text-white transition hover:border-pink-500 hover:bg-pink-500"
        >
          Déconnexion
        </button>
      </form>
    </div>
  );
}
