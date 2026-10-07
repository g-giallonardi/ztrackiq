import { requireAdmin } from "@/lib/auth";

export default async function SettingsPage() {
  await requireAdmin();

  return (
    <div className="m-2 rounded bg-white p-4 text-gray-900">
      <h1 className="text-2xl font-semibold">Paramètres</h1>
    </div>
  );
}
