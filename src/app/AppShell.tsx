"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { UserMenu } from "./UserMenu";

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
      <span className="text-pink-500">ZTRACK</span>
      <span className="text-yellow-300">IQ</span>
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
      className={`block rounded-xl px-4 py-3 font-bold uppercase text-white transition ${
        active ? "bg-pink-500" : "hover:bg-pink-500"
      }`}
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

  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-black/80 p-6 lg:block">
        <Logo />
        <Navigation />
        <UserMenu />
      </aside>

      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-black/90 px-4 py-3 lg:hidden">
        <Logo />
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/15 text-white transition hover:border-pink-500 hover:bg-pink-500"
          aria-label="Ouvrir le menu"
        >
          <Menu size={22} />
        </button>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Fermer le menu"
          />
          <aside className="relative h-full w-72 max-w-[85vw] overflow-y-auto border-r border-white/10 bg-black p-6">
            <div className="flex items-center justify-between gap-4">
              <Logo />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/15 text-white transition hover:border-pink-500 hover:bg-pink-500"
                aria-label="Fermer le menu"
              >
                <X size={20} />
              </button>
            </div>

            <Navigation onNavigate={() => setMobileMenuOpen(false)} />
            <UserMenu />
          </aside>
        </div>
      )}

      <main className="min-w-0 flex-1 bg-gradient-to-br from-pink-600 via-yellow-400 to-cyan-400">
        {children}
      </main>
    </div>
  );
}
