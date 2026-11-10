import Link from "next/link";

import { getAdminData, type AdminUser } from "@/app/lib/admin";
import { card, primaryCompact } from "@/app/lib/ui";

type UsersPageProps = {
  searchParams: Promise<{ q?: string | string[]; page?: string | string[] }>;
};

const PAGE_SIZE = 25;

export default async function AdminUsersPage({ searchParams }: UsersPageProps) {
  const params = await searchParams;
  const q = (typeof params.q === "string" ? params.q : "").trim().slice(0, 200);
  const requestedPage = Number(params.page);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const query = new URLSearchParams({ q, limit: String(PAGE_SIZE), offset: String((page - 1) * PAGE_SIZE) });
  const users = await getAdminData<AdminUser[]>(`/v2/admin/users?${query}`);
  const pageHref = (number: number) => `/admin/users?${new URLSearchParams({ q, page: String(number) })}`;

  return (
    <section>
      <h2 className="text-xl font-semibold">Users</h2>
      <p className="mt-1 text-sm text-slate-600">Search by username or email, then open a profile to review comments or suspend it.</p>
      <form action="/admin/users" className="mt-5 flex max-w-xl gap-2" method="get">
        <input
          aria-label="Search users"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2"
          defaultValue={q}
          maxLength={200}
          name="q"
          placeholder="Username or email"
          type="search"
        />
        <button className={primaryCompact} type="submit">Search</button>
      </form>

      {users === null ? (
        <p className={`mt-6 p-5 text-red-700 ${card}`}>Could not load users.</p>
      ) : users.length === 0 ? (
        <p className={`mt-6 p-5 text-slate-600 ${card}`}>No users found.</p>
      ) : (
        <ul className={`mt-6 divide-y divide-slate-200 ${card}`}>
          {users.map((user) => (
            <li className="flex flex-wrap items-center justify-between gap-3 p-4" key={user.id}>
              <div className="min-w-0">
                <Link className="font-semibold text-[#1E2E4F] hover:underline" href={`/admin/users/${user.id}`}>
                  {user.username}
                </Link>
                <p className="truncate text-sm text-slate-500">{user.email}</p>
              </div>
              <span className={user.is_blocked ? "text-sm font-semibold text-red-700" : "text-sm text-slate-600"}>
                {user.is_admin ? "Administrator" : user.is_blocked ? "Suspended" : "Active"}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-5 flex gap-4 text-sm font-semibold text-[#1E2E4F]">
        {page > 1 && <Link href={pageHref(page - 1)}>← Previous</Link>}
        {users?.length === PAGE_SIZE && <Link href={pageHref(page + 1)}>Next →</Link>}
      </div>
    </section>
  );
}
