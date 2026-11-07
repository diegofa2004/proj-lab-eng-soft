import Link from "next/link";

import LogoutButton from "@/components/auth/logout-button";
import { requireCurrentUser } from "@/app/lib/auth";
import { LivruspLogo } from "@/components/home/livrusp-logos";

export default async function ProfilePage() {
  const user = await requireCurrentUser();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-slate-900">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <LivruspLogo className="block h-7 w-auto" />
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Welcome, {user.username}</h1>
        <p className="mt-2 text-sm font-medium text-indigo-700">
          {user.is_admin ? "Administrator profile" : "Reader profile"}
        </p>
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
        {user.is_admin && (
          <Link
            className="mt-6 inline-flex rounded-lg bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800"
            href="/admin"
          >
            Open admin dashboard
          </Link>
        )}
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
