import Link from "next/link";

import type { AdminReview } from "@/app/lib/admin";
import AdminActionButton from "@/components/admin/admin-action-button";

export default function AdminReviewList({ reviews }: { reviews: AdminReview[] }) {
  if (reviews.length === 0) {
    return <p className="rounded-xl bg-white p-5 text-slate-600">No comments found.</p>;
  }

  return (
    <ul className="divide-y divide-slate-200 rounded-xl bg-white shadow-sm">
      {reviews.map((review) => (
        <li className="flex flex-wrap items-start justify-between gap-4 p-5" key={review.id_avaliacao}>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-500">
              <Link className="font-semibold text-[#1E2E4F] hover:underline" href={`/admin/users/${review.id_usuario}`}>
                {review.nome_usuario}
              </Link>
              {" · "}{review.titulo_livro}{" · "}{review.nota}/5 stars
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
              {review.texto_revisao || "Rating without a written comment."}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {new Date(review.data_hora).toLocaleDateString("en-US")}
              {review.is_removida && <span className="ml-2 font-semibold text-red-700">Removed</span>}
            </p>
          </div>
          {!review.is_removida && (
            <AdminActionButton
              confirmText={`Remove ${review.nome_usuario}'s comment on “${review.titulo_livro}”?`}
              label="Remove comment"
              method="DELETE"
              path={`reviews/${review.id_avaliacao}`}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
