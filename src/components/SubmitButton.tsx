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
  className = "rounded-md bg-zinc-900 px-4 py-2 font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-wait disabled:opacity-60",
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
