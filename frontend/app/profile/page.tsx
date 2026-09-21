import Link from "next/link";

import LogoutButton from "@/components/auth/logout-button";
import { requireCurrentUser } from "@/app/lib/auth";

export default async function ProfilePage() {
  const user = await requireCurrentUser();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-slate-900">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">LivrUSP</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Welcome, {user.username}</h1>
        <dl className="mt-6 space-y-3 rounded-lg bg-slate-50 p-4 text-sm">
          <div>
            <dt className="font-medium text-slate-500">Username</dt>
            <dd className="mt-1 text-slate-900">{user.username}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Email</dt>
            <dd className="mt-1 text-slate-900">{user.email}</dd>
          </div>
        </dl>
        <div className="mt-8 flex items-center justify-between gap-4">
          <Link className="font-semibold text-indigo-600 hover:text-indigo-700" href="/">
            Back to home
          </Link>
          <LogoutButton />
        </div>
      </section>
    </main>
  );
}
