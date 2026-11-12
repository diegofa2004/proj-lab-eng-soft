import Link from "next/link";

import {
  enrichAdminActivities,
  getAdminActivities,
} from "@/app/lib/admin";
import { card } from "@/app/lib/ui";
import AdminActivityList from "@/components/admin/admin-activity-list";

type ActivityPageProps = {
  searchParams: Promise<{
    page?: string | string[];
    action?: string | string[];
    q?: string | string[];
  }>;
};

const PAGE_SIZE = 25;

export default async function AdminActivityPage({ searchParams }: ActivityPageProps) {
  const params = await searchParams;
  const requestedPage = Number(params.page);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const action = typeof params.action === "string" ? params.action.trim() : undefined;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 200) : "";

  const rawActivities = await getAdminActivities({
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const activities = rawActivities ? await enrichAdminActivities(rawActivities) : null;

  const pageHref = (number: number) => {
    const query = new URLSearchParams();
    if (action) query.set("action", action);
    if (q) query.set("q", q);
    query.set("page", String(number));
    return `/admin/activity?${query}`;
  };

  return (
    <section>
      <h2 className="text-xl font-semibold">Activity</h2>
      <p className="mt-1 text-sm text-slate-600">
        Audit log of administrative actions across user accounts, catalog books, and community comments.
      </p>

      <div className="mt-5">
        {activities === null ? (
          <p className={`p-5 text-red-700 ${card}`}>Could not load administrative activity.</p>
        ) : (
          <AdminActivityList
            activities={activities}
            initialActionFilter={action}
            initialSearch={q}
          />
        )}
      </div>

      <div className="mt-5 flex gap-4 text-sm font-semibold text-[#1E2E4F]">
        {page > 1 && <Link href={pageHref(page - 1)}>← Previous</Link>}
        {activities?.length === PAGE_SIZE && <Link href={pageHref(page + 1)}>Next →</Link>}
      </div>
    </section>
  );
}
