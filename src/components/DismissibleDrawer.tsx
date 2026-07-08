"use client";

import { createContext, type ReactNode, useContext, useState } from "react";

const DismissibleDrawerContext = createContext<(() => void) | null>(null);

export function DismissibleDrawer({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);

  function close() {
    const url = new URL(window.location.href);

    [
      "drawer",
      "pilotId",
      "carId",
      "raceId",
      "championshipId",
      "specId",
      "confirmDelete",
    ].forEach((key) => url.searchParams.delete(key));

    window.history.replaceState(
      null,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
    setIsOpen(false);
  }

  if (!isOpen) return null;

  return (
    <DismissibleDrawerContext.Provider value={close}>
      {children}
    </DismissibleDrawerContext.Provider>
  );
}

export function DrawerCloseButton({
  children,
  className,
  ariaLabel = "Fermer",
}: {
  children?: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const close = useContext(DismissibleDrawerContext);

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={className}
      onClick={() => close?.()}
    >
      {children}
    </button>
  );
}
