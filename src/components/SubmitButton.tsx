"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
};

export function SubmitButton({
  children,
  pendingLabel = "Enregistrement...",
  className = "rounded-md bg-gradient-to-r from-pink-500 to-yellow-400 px-4 py-2 font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-wait disabled:opacity-75 disabled:hover:translate-y-0",
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={className}>
      <span className="inline-flex items-center justify-center gap-2">
        {pending && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        )}
        {pending ? pendingLabel : children}
      </span>
    </button>
  );
}
