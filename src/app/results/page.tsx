import { requireCurrentUser } from "@/lib/auth";

export default async function ResultsPage() {
  await requireCurrentUser();

  return (
    <div className="m-2 rounded bg-white p-4 text-gray-900">
      <h1 className="text-2xl font-semibold">Résultats</h1>
    </div>
  );
}
