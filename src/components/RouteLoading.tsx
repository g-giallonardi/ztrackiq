type RouteLoadingProps = {
  title?: string;
  message?: string;
};

export function RouteLoading({
  title = "Chargement",
  message = "On prépare les données, ça peut prendre quelques secondes.",
}: RouteLoadingProps) {
  return (
    <div className="m-2 min-h-[calc(100vh-1rem)] rounded bg-white p-4 text-gray-900">
      <div className="flex min-h-[55vh] items-center justify-center">
        <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 border-t-pink-500" />
          <p className="text-lg font-black text-zinc-900">{title}</p>
          <p className="mt-2 text-sm font-medium text-zinc-500">{message}</p>
        </div>
      </div>
    </div>
  );
}
