import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 text-zinc-900 shadow-2xl">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-pink-500">
            ZTrackIQ
          </p>
          <h1 className="mt-1 text-3xl font-black italic">Connexion</h1>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
