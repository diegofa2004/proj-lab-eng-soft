import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-slate-900">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">LivrUSP</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Sign in</h1>
        <p className="mt-3 text-slate-600">The sign-in form will be added in a later step.</p>
        <Link className="mt-8 inline-block font-semibold text-indigo-600 hover:text-indigo-700" href="/">
          Back to home
        </Link>
      </section>
    </main>
  );
}
