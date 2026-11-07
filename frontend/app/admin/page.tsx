import Link from "next/link";

import { getAdminData, type AdminStats } from "@/app/lib/admin";

export default async function AdminOverviewPage() {
  const stats = await getAdminData<AdminStats>("/admin/stats");

  return (
    <section>
      <h2 className="text-xl font-semibold">Overview</h2>
      {!stats ? (
        <p className="mt-4 rounded-xl bg-white p-5 text-red-700">Administration data is unavailable.</p>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Users", value: stats.users.total, href: "/admin/users" },
            { label: "Suspended users", value: stats.users.blocked, href: "/admin/users" },
            { label: "Books", value: stats.books, href: "/admin/books" },
            { label: "Visible comments", value: stats.reviews, href: "/admin/reviews" },
          ].map((item) => (
            <Link className="rounded-xl bg-white p-6 shadow-sm hover:ring-2 hover:ring-indigo-200" href={item.href} key={item.label}>
              <span className="text-sm text-slate-500">{item.label}</span>
              <strong className="mt-2 block text-3xl">{item.value}</strong>
            </Link>
          ))}
        </div>
      )}
      <p className="mt-7 text-sm text-slate-600">
        Removing a book hides it from the public catalog without erasing its file or reading history.
        Suspended accounts cannot sign in or use their existing sessions.
      </p>
    </section>
  );
}
