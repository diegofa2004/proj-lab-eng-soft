import Link from "next/link";
import type { ReactNode } from "react";

import { requireAdmin } from "@/app/lib/admin";
import LogoutButton from "@/components/auth/logout-button";
import { LivruspLogo } from "@/components/home/livrusp-logos";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <Link aria-label="LivrUSP home" href="/home"><LivruspLogo className="h-6 w-auto" /></Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="font-medium text-slate-500">Administrator · {admin.username}</span>
            <Link className="font-semibold text-indigo-700 hover:underline" href="/profile">My profile</Link>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-7">
          <h1 className="text-3xl font-bold">Administration</h1>
          <p className="mt-1 text-slate-600">Manage the catalog and community.</p>
        </div>
        <nav aria-label="Administration sections" className="mb-8 flex flex-wrap gap-2">
          {[
            { href: "/admin", label: "Overview" },
            { href: "/admin/users", label: "Users" },
            { href: "/admin/books", label: "Books" },
            { href: "/admin/reviews", label: "Comments" },
          ].map((item) => (
            <Link
              className="rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-800 hover:bg-indigo-50"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {children}
      </div>
    </div>
  );
}
