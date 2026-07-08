// src/app/layout.tsx
import { Roboto } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { AuthStoreProvider } from "./AuthStoreProvider";
import { UserMenu } from "./UserMenu";
import { getCurrentUser } from "@/lib/auth";

export const metadata = {
  title: "ZTrackIQ",
  description: "Mini-Z Race Control",
};

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "700", "900"],
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();

  return (
  <html lang="fr">
    <body className={`${roboto.className} min-h-screen bg-[#09090f] text-white`}>
      <AuthStoreProvider initialUser={currentUser}>
        <div className="flex min-h-screen">
          <aside className="w-72 border-r border-white/10 bg-black/80 p-6">
            <h1 className="text-3xl font-black italic">
              <span className="text-pink-500">ZTRACK</span>
              <span className="text-yellow-300">IQ</span>
            </h1>

            <nav className="mt-10 space-y-3">
              <NavItem href="/" label="Dashboard" />
              <NavItem href="/pilots" label="Pilotes" />
              <NavItem href="/cars" label="Voitures" />
              <NavItem href="/races" label="Courses" />
              <NavItem href="/championships" label="Championnats" />
              <NavItem href="/me" label="Mon profil" />
            </nav>

            <UserMenu />
          </aside>

          <main className="flex-1 bg-gradient-to-br from-pink-600 via-yellow-400 to-cyan-400">
            {children}
          </main>
        </div>
      </AuthStoreProvider>
    </body>
  </html>
);
}

function NavItem({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block rounded-xl px-4 py-3 font-bold uppercase text-white hover:bg-pink-500"
    >
      {label}
    </Link>
  );
}
