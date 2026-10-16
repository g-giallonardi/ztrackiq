"use client";

import { useState } from "react";

const roleLabels: Record<string, string> = {
  "": "Aucun rôle",
  admin: "Admin",
  adherent: "Adhérent",
  membre_honneur: "★ Mb. d’honneur",
  visiteur: "Visiteur",
};

export function PilotRoleField({ defaultRole }: { defaultRole?: string | null }) {
  const [role, setRole] = useState(defaultRole ?? "");

  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-zinc-700">
        Rôle
      </span>
      <select
        name="role"
        value={role}
        onChange={(event) => setRole(event.currentTarget.value)}
        className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
      >
        <option value="">Aucun rôle</option>
        <option value="admin">Admin</option>
        <option value="adherent">Adhérent</option>
        <option value="membre_honneur">★ Mb. d’honneur</option>
        <option value="visiteur">Visiteur</option>
      </select>
      <span className="mt-1.5 block text-xs text-zinc-500">
        Rôle sélectionné : {roleLabels[role] ?? role}
      </span>
    </label>
  );
}
