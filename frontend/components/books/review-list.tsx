"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { CurrentUser, Review } from "@/app/lib/books";
import { StarRatingDisplay } from "@/components/books/star-rating";

type ReviewListProps = {
  reviews: Review[];
  currentUser: CurrentUser | null;
};

function formatReviewDate(dateString: string): string {
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return dateString;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

export default function ReviewList({ reviews, currentUser }: ReviewListProps) {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();

  const sortedReviews = [...reviews].sort(
    (a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime(),
  );

  async function handleDelete(reviewId: number) {
    setDeletingId(reviewId);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { detail?: string } | null;
        setErrorMessage(data?.detail ?? "Unable to delete this review. Please try again.");
        return;
      }

      router.refresh();
    } catch {
      setErrorMessage("Unable to reach the reviews service. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Reader reviews</h2>
          <p className="mt-1 text-sm text-slate-600">
            {sortedReviews.length === 0
              ? "No reviews have been submitted for this book yet."
              : `Showing ${sortedReviews.length} ${
                  sortedReviews.length === 1 ? "review" : "reviews"
                }`}
          </p>
        </div>
      </div>

      {errorMessage && (
        <p
          aria-live="polite"
          className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600"
          role="status"
        >
          {errorMessage}
        </p>
      )}

      {sortedReviews.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="text-sm font-medium text-slate-700">
            No reviews yet. Be the first to share your thoughts!
          </p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-slate-200">
          {sortedReviews.map((review) => {
            const isOwnReview = currentUser?.id === review.id_usuario;
            const canDelete = Boolean(isOwnReview || currentUser?.is_admin);
            const isDeleting = deletingId === review.id_avaliacao;

            return (
              <li className="py-6 first:pt-0 last:pb-0" key={review.id_avaliacao}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {isOwnReview ? `${currentUser.username} (You)` : `Reader #${review.id_usuario}`}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <time className="text-xs text-slate-500" dateTime={review.data_hora}>
                        {formatReviewDate(review.data_hora)}
                      </time>
                    </div>
                    <div className="flex items-center gap-2">
                      <StarRatingDisplay rating={review.nota} size="sm" />
                      <span className="text-xs font-medium text-slate-600">
                        {review.nota} / 5
                      </span>
                    </div>
                  </div>

                  {canDelete && (
                    <button
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isDeleting}
                      onClick={() => handleDelete(review.id_avaliacao)}
                      type="button"
                    >
                      {isDeleting ? "Deleting..." : "Delete review"}
                    </button>
                  )}
                </div>

                {review.texto_revisao ? (
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                    {review.texto_revisao}
                  </p>
                ) : (
                  <p className="mt-3 text-sm italic text-slate-400">
                    Rated without a written comment.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

