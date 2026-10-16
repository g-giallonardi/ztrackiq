"use client";

import { useMemo, useState } from "react";

type ExistingPilotEmail = {
  id: number;
  email: string;
};

export function PilotEmailField({
  defaultValue,
  currentPilotId,
  existingEmails,
}: {
  defaultValue?: string;
  currentPilotId?: number;
  existingEmails: ExistingPilotEmail[];
}) {
  const [message, setMessage] = useState("");
  const existingEmailSet = useMemo(
    () =>
      new Set(
        existingEmails
          .filter((pilot) => pilot.id !== currentPilotId)
          .map((pilot) => pilot.email.trim().toLowerCase()),
      ),
    [currentPilotId, existingEmails],
  );

  const validateEmail = (input: HTMLInputElement) => {
    const email = input.value.trim().toLowerCase();
    const nextMessage =
      email && existingEmailSet.has(email)
        ? "Cette adresse email est déjà utilisée."
        : "";

    input.setCustomValidity(nextMessage);
    setMessage(nextMessage);
  };

  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-zinc-700">
        Email
      </span>
      <input
        type="email"
        name="email"
        defaultValue={defaultValue}
        onChange={(event) => {
          validateEmail(event.currentTarget);
        }}
        onInvalid={(event) => {
          validateEmail(event.currentTarget);
        }}
        className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
      />
      <p className="mt-1.5 text-xs text-zinc-500">
        Facultatif. Nécessaire pour se connecter.
      </p>
      {message && (
        <p className="mt-1.5 text-sm font-medium text-red-600">{message}</p>
      )}
    </label>
  );
}
