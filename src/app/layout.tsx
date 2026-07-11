// src/app/layout.tsx
import "./globals.css";
import { AuthStoreProvider } from "./AuthStoreProvider";
import { AppShell } from "./AppShell";
import { getCurrentUser } from "@/lib/auth";
import { theme } from "@/lib/theme";

export const metadata = {
  title: "ZTrackIQ",
  description: "Mini-Z Race Control",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();

  return (
    <html lang="fr">
      <body
        className="min-h-screen text-white"
        style={{ backgroundColor: theme.app.bg }}
      >
        <AuthStoreProvider initialUser={currentUser}>
          <AppShell>{children}</AppShell>
        </AuthStoreProvider>
      </body>
    </html>
  );
}
