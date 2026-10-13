import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-slate-900">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">LivrUSP</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Your next read starts here.</h1>
        <p className="mt-3 text-slate-600">
          Sign in to follow books or create an account to get started.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link
            className="rounded-lg bg-indigo-600 px-4 py-3 text-center font-semibold text-white transition hover:bg-indigo-700"
            href="/login"
          >
            Sign in
          </Link>
          <Link
            className="rounded-lg border border-slate-300 px-4 py-3 text-center font-semibold text-slate-700 transition hover:bg-slate-50"
            href="/signup"
          >
            Sign up
          </Link>
        </div>
      </section>
    </main>
  );
}
