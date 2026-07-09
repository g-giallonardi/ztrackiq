"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ExistingPilotEmail = {
  id: number;
  email: string;
};

export function PilotEmailField({
  defaultValue,
  defaultRole,
  currentPilotId,
  existingEmails,
}: {
  defaultValue?: string;
  defaultRole?: string | null;
  currentPilotId?: number;
  existingEmails: ExistingPilotEmail[];
}) {
  const [message, setMessage] = useState("");
  const [roleSelected, setRoleSelected] = useState(Boolean(defaultRole));
  const inputRef = useRef<HTMLInputElement>(null);
  const existingEmailSet = useMemo(
    () =>
      new Set(
        existingEmails
          .filter((pilot) => pilot.id !== currentPilotId)
          .map((pilot) => pilot.email.trim().toLowerCase()),
      ),
    [currentPilotId, existingEmails],
  );

  const validateEmail = useCallback(
    (input: HTMLInputElement) => {
      const email = input.value.trim().toLowerCase();
      const nextMessage =
        email && existingEmailSet.has(email)
          ? "Cette adresse email est déjà utilisée."
          : "";

      input.setCustomValidity(nextMessage);
      setMessage(nextMessage);
    },
    [existingEmailSet],
  );

  useEffect(() => {
    const input = inputRef.current;
    const roleField = input?.form?.elements.namedItem("role");

    if (!input || !(roleField instanceof HTMLSelectElement)) {
      return;
    }

    const syncRequiredState = () => {
      const hasRole = Boolean(roleField.value);

      setRoleSelected(hasRole);
      input.required = hasRole;

      if (hasRole) {
        validateEmail(input);
      } else {
        input.setCustomValidity("");
        setMessage("");
      }
    };

    syncRequiredState();
    roleField.addEventListener("change", syncRequiredState);

    return () => {
      roleField.removeEventListener("change", syncRequiredState);
    };
  }, [validateEmail]);

  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-zinc-700">
        Email {roleSelected && <span className="text-pink-500">*</span>}
      </span>
      <input
        ref={inputRef}
        type="email"
        name="email"
        defaultValue={defaultValue}
        required={roleSelected}
        onChange={(event) => {
          validateEmail(event.currentTarget);
        }}
        onInvalid={(event) => {
          validateEmail(event.currentTarget);
        }}
        className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
      />
      <p className="mt-1.5 text-xs text-zinc-500">
        Obligatoire uniquement si un rôle est attribué.
      </p>
      {message && (
        <p className="mt-1.5 text-sm font-medium text-red-600">{message}</p>
      )}
    </label>
  );
}
