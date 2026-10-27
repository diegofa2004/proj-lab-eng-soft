"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type SyntheticEvent, useState } from "react";

import type { CurrentUser, Review } from "@/app/lib/books";

type FormStatus = "idle" | "submitting" | "success" | "error";

type ReviewFormProps = {
  bookId: number;
  currentUser: CurrentUser | null;
  existingUserReview: Review | null;
};

const ratingLabels: Record<number, string> = {
  1: "1 - Poor",
  2: "2 - Fair",
  3: "3 - Good",
  4: "4 - Very Good",
  5: "5 - Excellent",
};

export default function ReviewForm({
  bookId,
  currentUser,
  existingUserReview,
}: ReviewFormProps) {
  const [rating, setRating] = useState<number>(5);
  const [reviewText, setReviewText] = useState("");
  const [formStatus, setFormStatus] = useState<FormStatus>("idle");
  const [message, setMessage] = useState("");
  const router = useRouter();

  if (!currentUser) {
    return (
      <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Write a review</h2>
        <p className="mt-2 text-sm text-slate-600">
          Share your thoughts on this book with other readers.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-xl bg-slate-50 p-4">
          <p className="text-sm text-slate-700">You must be signed in to post a review.</p>
          <Link
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            href="/login"
          >
            Sign in
          </Link>
        </div>
      </section>
    );
  }

  if (existingUserReview) {
    return (
      <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Your review</h2>
        <p className="mt-2 text-sm text-slate-600">
          You have already submitted a review for this book ({existingUserReview.nota} out of 5
          stars). To submit a new review, delete your existing review below first.
        </p>
      </section>
    );
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    if (rating < 1 || rating > 5) {
      setFormStatus("error");
      setMessage("Please select a rating between 1 and 5 stars.");
      return;
    }

    setFormStatus("submitting");
    setMessage("");

    try {
      const response = await fetch(`/api/books/${bookId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nota: rating,
          texto_revisao: reviewText.trim() || null,
        }),
      });
      const data = (await response.json().catch(() => null)) as { detail?: string } | null;

      if (!response.ok) {
        setFormStatus("error");
        setMessage(data?.detail ?? "Could not submit your review. Please try again.");
        return;
      }

      setReviewText("");
      setRating(5);
      setFormStatus("success");
      setMessage("Your review has been published.");
      router.refresh();
    } catch {
      setFormStatus("error");
      setMessage("Unable to reach the reviews service. Please try again.");
    }
  }

  const isSubmitting = formStatus === "submitting";

  return (
    <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-xl font-bold tracking-tight text-slate-900">Write a review</h2>
      <p className="mt-1 text-sm text-slate-600">
        Posting as <span className="font-semibold text-slate-800">{currentUser.username}</span>
      </p>

      <form className="mt-6 space-y-5" noValidate onSubmit={handleSubmit}>
        <fieldset>
          <legend className="block text-sm font-medium text-slate-700">Rating</legend>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => {
              const isSelected = star <= rating;
              return (
                <button
                  aria-label={`Rate ${star} out of 5 stars`}
                  aria-pressed={star === rating}
                  className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    isSelected
                      ? "border-amber-400 bg-amber-50 text-amber-700"
                      : "border-slate-300 bg-white text-slate-500 hover:bg-slate-50"
                  }`}
                  key={star}
                  onClick={() => setRating(star)}
                  type="button"
                >
                  <span aria-hidden="true">★</span>
                  <span>{star}</span>
                </button>
              );
            })}
            <span className="ml-2 text-sm font-medium text-slate-600">{ratingLabels[rating]}</span>
          </div>
        </fieldset>

        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="texto_revisao">
            Review comment <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200"
            id="texto_revisao"
            maxLength={2000}
            name="texto_revisao"
            onChange={(event) => setReviewText(event.target.value)}
            placeholder="What did you like or dislike about this book?"
            rows={4}
            value={reviewText}
          />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Submitting review..." : "Submit review"}
          </button>

          <p
            aria-live="polite"
            className={`text-sm ${formStatus === "error" ? "text-red-600" : "text-emerald-600"}`}
            role="status"
          >
            {message}
          </p>
        </div>
      </form>
    </section>
  );
}

