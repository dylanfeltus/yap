import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-4">
      <h1 className="text-5xl font-bold text-zinc-200">404</h1>
      <p className="text-lg text-zinc-500">Page not found</p>
      <Link
        href="/ideas"
        className="mt-4 rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-zinc-100"
      >
        Go to Idea Bank
      </Link>
    </div>
  );
}
