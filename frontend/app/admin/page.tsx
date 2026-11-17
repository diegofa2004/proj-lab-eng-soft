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
  const totalUsers = stats?.users.total ?? 0;
  const activeUsers = stats?.users.active ?? 0;
  const blockedUsers = stats?.users.blocked ?? 0;
  const activePercent = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;
  const blockedPercent = totalUsers > 0 ? Math.round((blockedUsers / totalUsers) * 100) : 0;

  return (
    <section>
      <h2 className="text-xl font-semibold">Overview</h2>
      {!stats ? (
        <p className={`mt-4 p-5 text-red-700 ${card}`}>Administration data is unavailable.</p>
      ) : (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: "Registered users", value: stats.users.total, href: "/admin/users" },
              { label: "Active users", value: stats.users.active, href: "/admin/users" },
              { label: "Blocked users", value: stats.users.blocked, href: "/admin/users" },
              { label: "Books", value: stats.books, href: "/admin/books" },
              { label: "Visible comments", value: stats.reviews, href: "/admin/reviews" },
            ].map((item) => (
              <Link className={`block p-6 hover:ring-2 hover:ring-[#1E2E4F]/20 ${card}`} href={item.href} key={item.label}>
                <span className="text-sm text-slate-500">{item.label}</span>
                <strong className="mt-2 block text-3xl">{item.value}</strong>
              </Link>
            ))}
          </div>

          <div className={`mt-4 p-5 ${card}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-base font-semibold text-black">User account status</h3>
              <p className="font-mono text-xs text-slate-500">
                {totalUsers} registered · {activePercent}% active · {blockedPercent}% blocked
              </p>
            </div>
            <div
              aria-label={`${activeUsers} active users and ${blockedUsers} blocked users out of ${totalUsers} registered`}
              className="mt-3 flex h-3 overflow-hidden rounded-full bg-black/10"
              role="img"
            >
              <span
                className="bg-[#556B45]"
                style={{ width: `${activePercent}%` }}
                title={`${activeUsers} active users`}
              />
              <span
                className="bg-red-500"
                style={{ width: `${blockedPercent}%` }}
                title={`${blockedUsers} blocked users`}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-[#556B45]" />
                Active: {activeUsers}
              </span>
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-red-500" />
                Blocked: {blockedUsers}
              </span>
            </div>
          </div>
        </>
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
