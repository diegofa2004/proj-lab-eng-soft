import Link from "next/link";

import {
  enrichAdminActivities,
  getAdminActivities,
  getAdminData,
  type AdminStats,
} from "@/app/lib/admin";
import { card } from "@/app/lib/ui";
import AdminActivityList from "@/components/admin/admin-activity-list";

export default async function AdminOverviewPage() {
  const [stats, rawActivities] = await Promise.all([
    getAdminData<AdminStats>("/admin/stats"),
    getAdminActivities({ limit: 5, offset: 0 }),
  ]);
  const recentActivities = rawActivities ? await enrichAdminActivities(rawActivities) : null;

  return (
    <section>
      <h2 className="text-xl font-semibold">Overview</h2>
      {!stats ? (
        <p className={`mt-4 p-5 text-red-700 ${card}`}>Administration data is unavailable.</p>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Users", value: stats.users.total, href: "/admin/users" },
            { label: "Suspended users", value: stats.users.blocked, href: "/admin/users" },
            { label: "Books", value: stats.books, href: "/admin/books" },
            { label: "Visible comments", value: stats.reviews, href: "/admin/reviews" },
          ].map((item) => (
            <Link className={`block p-6 hover:ring-2 hover:ring-[#1E2E4F]/20 ${card}`} href={item.href} key={item.label}>
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

      <div className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-black">Recent administrative activity</h3>
            <p className="mt-1 text-sm text-slate-600">
              Latest moderation and catalog actions recorded in the audit log.
            </p>
          </div>
          <Link
            className="text-sm font-semibold text-[#1E2E4F] hover:underline"
            href="/admin/activity"
          >
            View full activity log →
          </Link>
        </div>

        <div className="mt-4">
          {recentActivities === null ? (
            <p className={`p-5 text-red-700 ${card}`}>Could not load recent activity.</p>
          ) : (
            <AdminActivityList activities={recentActivities} compact />
          )}
        </div>
      </div>
    </section>
  );
}
