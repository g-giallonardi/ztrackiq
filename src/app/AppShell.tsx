"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { UserMenu } from "./UserMenu";
import { theme } from "@/lib/theme";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/pilots", label: "Pilotes" },
  { href: "/cars", label: "Voitures" },
  { href: "/races", label: "Courses" },
  { href: "/championships", label: "Championnats" },
  { href: "/me", label: "Mon profil" },
];

function Logo() {
  return (
    <Link href="/" className="text-3xl font-black italic">
      <span style={{ color: theme.brand.ztrack }}>ZTRACK</span>
      <span style={{ color: theme.brand.iq }}>IQ</span>
    </Link>
  );
}

function NavItem({
  href,
  label,
  onClick,
}: {
  href: string;
  label: string;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onClick}
      className="block rounded-xl px-4 py-3 font-bold uppercase text-white transition"
      style={{
        backgroundColor: active ? theme.brand.ztrack : undefined,
      }}
      onMouseEnter={(event) => {
        if (!active) event.currentTarget.style.backgroundColor = theme.brand.ztrack;
      }}
      onMouseLeave={(event) => {
        if (!active) event.currentTarget.style.backgroundColor = "";
      }}
    >
      {label}
    </Link>
  );
}

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="mt-10 space-y-3">
      {navItems.map((item) => (
        <NavItem
          key={item.href}
          href={item.href}
          label={item.label}
          onClick={onNavigate}
        />
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const currentUrl = `${pathname}${search ? `?${search}` : ""}`;
  const navigationPending = Boolean(pendingUrl && pendingUrl !== currentUrl);

  useEffect(() => {
    if (!navigationPending) return;

    const timeout = window.setTimeout(() => {
      setPendingUrl(null);
    }, 12000);

    return () => window.clearTimeout(timeout);
  }, [navigationPending]);

  function handleNavigationClick(event: React.MouseEvent<HTMLDivElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const anchor = (event.target as HTMLElement).closest("a[href]");

    if (!(anchor instanceof HTMLAnchorElement)) return;
    if (anchor.target && anchor.target !== "_self") return;
    if (anchor.hasAttribute("download")) return;

    const destination = new URL(anchor.href);

    if (destination.origin !== window.location.origin) return;
    if (
      destination.pathname === window.location.pathname &&
      destination.search === window.location.search
    ) {
      return;
    }

    setPendingUrl(`${destination.pathname}${destination.search}`);
  }

  return (
    <div className="min-h-screen lg:flex" onClickCapture={handleNavigationClick}>
      <aside
        className="hidden w-72 shrink-0 border-r border-white/10 p-6 lg:block"
        style={{ backgroundColor: theme.app.sidebar }}
      >
        <Logo />
        <Navigation />
        <UserMenu />
      </aside>

      <header
        className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 px-4 py-3 lg:hidden"
        style={{ backgroundColor: theme.app.header }}
      >
        <Logo />
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/15 text-white transition"
          aria-label="Ouvrir le menu"
          style={{ "--hover-color": theme.brand.ztrack } as React.CSSProperties}
          onMouseEnter={(event) => {
            event.currentTarget.style.borderColor = theme.brand.ztrack;
            event.currentTarget.style.backgroundColor = theme.brand.ztrack;
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.borderColor = "";
            event.currentTarget.style.backgroundColor = "";
          }}
        >
          <Menu size={22} />
        </button>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0"
            style={{ backgroundColor: theme.app.overlay }}
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Fermer le menu"
          />
          <aside
            className="relative h-full w-72 max-w-[85vw] overflow-y-auto border-r border-white/10 p-6"
            style={{ backgroundColor: theme.app.bg }}
          >
            <div className="flex items-center justify-between gap-4">
              <Logo />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/15 text-white transition"
                aria-label="Fermer le menu"
                onMouseEnter={(event) => {
                  event.currentTarget.style.borderColor = theme.brand.ztrack;
                  event.currentTarget.style.backgroundColor = theme.brand.ztrack;
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.borderColor = "";
                  event.currentTarget.style.backgroundColor = "";
                }}
              >
                <X size={20} />
              </button>
            </div>

            <Navigation onNavigate={() => setMobileMenuOpen(false)} />
            <UserMenu />
          </aside>
        </div>
      )}

      <main className={`min-w-0 flex-1 bg-gradient-to-br ${theme.gradient.main}`}>
        {children}
      </main>

      {navigationPending && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-white/10 bg-white p-5 text-center text-zinc-900 shadow-2xl">
            <div className="mx-auto mb-3 h-9 w-9 animate-spin rounded-full border-4 border-zinc-200 border-t-pink-500" />
            <p className="text-base font-black">Chargement en cours</p>
            <p className="mt-1 text-sm font-medium text-zinc-500">
              On récupère les données, merci de patienter.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
