import Link from "next/link";

import { getAdminData, type AdminReview } from "@/app/lib/admin";
import AdminReviewList from "@/components/admin/admin-review-list";

type ReviewsPageProps = {
  searchParams: Promise<{ page?: string | string[] }>;
};

const PAGE_SIZE = 25;

export default async function AdminReviewsPage({ searchParams }: ReviewsPageProps) {
  const params = await searchParams;
  const requestedPage = Number(params.page);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const reviews = await getAdminData<AdminReview[]>(
    `/v2/admin/reviews/feed?limit=${PAGE_SIZE}&offset=${(page - 1) * PAGE_SIZE}`,
  );

  return (
    <section>
      <h2 className="text-xl font-semibold">Comments</h2>
      <p className="mt-1 text-sm text-slate-600">Review recent comments and remove those that violate the rules.</p>
      <div className="mt-5">
        {reviews === null
          ? <p className="rounded-xl bg-white p-5 text-red-700">Could not load comments.</p>
          : <AdminReviewList reviews={reviews} />}
      </div>
      <div className="mt-5 flex gap-4 text-sm font-semibold text-indigo-700">
        {page > 1 && <Link href={`/admin/reviews?page=${page - 1}`}>← Previous</Link>}
        {reviews?.length === PAGE_SIZE && <Link href={`/admin/reviews?page=${page + 1}`}>Next →</Link>}
      </div>
    </section>
  );
}
