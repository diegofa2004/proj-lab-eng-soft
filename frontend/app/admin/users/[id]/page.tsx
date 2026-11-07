import Link from "next/link";

import { getAdminData, type AdminReview, type AdminUser } from "@/app/lib/admin";
import AdminActionButton from "@/components/admin/admin-action-button";
import AdminReviewList from "@/components/admin/admin-review-list";

type UserDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
};

const PAGE_SIZE = 25;

export default async function AdminUserDetailPage({ params, searchParams }: UserDetailPageProps) {
  const { id } = await params;
  const userId = Number(id);
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return <p className="rounded-xl bg-white p-5 text-red-700">Invalid user ID.</p>;
  }
  const query = await searchParams;
  const requestedPage = Number(query.page);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [user, reviews] = await Promise.all([
    getAdminData<AdminUser>(`/v2/admin/users/${userId}`),
    getAdminData<AdminReview[]>(
      `/v2/admin/users/${userId}/reviews?limit=${PAGE_SIZE}&offset=${(page - 1) * PAGE_SIZE}`,
    ),
  ]);

  if (!user) {
    return <p className="rounded-xl bg-white p-5 text-red-700">User not found or unavailable.</p>;
  }

  return (
    <section>
      <Link className="text-sm font-semibold text-indigo-700 hover:underline" href="/admin/users">← Back to users</Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-5 rounded-xl bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold">{user.username}</h2>
          <p className="mt-1 text-sm text-slate-600">{user.email}</p>
          <p className="mt-2 text-sm font-medium">
            {user.is_admin ? "Administrator" : user.is_blocked ? "Suspended" : "Active user"}
            {" · "}Joined {new Date(user.created_at).toLocaleDateString("en-US")}
          </p>
          {user.biography && <p className="mt-4 whitespace-pre-wrap text-sm text-slate-700">{user.biography}</p>}
        </div>
        {!user.is_admin && (
          <AdminActionButton
            confirmText={user.is_blocked ? undefined : `Suspend ${user.username}? They will no longer be able to sign in or use their session.`}
            label={user.is_blocked ? "Restore account" : "Suspend account"}
            method="POST"
            path={`users/${user.id}/${user.is_blocked ? "unblock" : "block"}`}
            tone={user.is_blocked ? "neutral" : "danger"}
          />
        )}
      </div>
      <h3 className="mb-4 mt-8 text-xl font-semibold">Comments by {user.username}</h3>
      {reviews === null
        ? <p className="rounded-xl bg-white p-5 text-red-700">Could not load comments.</p>
        : <AdminReviewList reviews={reviews} />}
      <div className="mt-5 flex gap-4 text-sm font-semibold text-indigo-700">
        {page > 1 && <Link href={`/admin/users/${user.id}?page=${page - 1}`}>← Previous</Link>}
        {reviews?.length === PAGE_SIZE && <Link href={`/admin/users/${user.id}?page=${page + 1}`}>Next →</Link>}
      </div>
    </section>
  );
}
