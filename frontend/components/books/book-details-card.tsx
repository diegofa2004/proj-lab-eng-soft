import Link from "next/link";
import Image from "next/image";

import type { Book, CurrentUser, Review } from "@/app/lib/books";
import { card, cardInset, primaryCompact, secondaryCompact } from "@/app/lib/ui";
import BookListActions from "@/components/books/book-list-actions";
import { StarRatingDisplay } from "@/components/books/star-rating";
import { LivruspLogo } from "@/components/home/livrusp-logos";

type BookDetailsCardProps = {
  book: Book;
  reviews: Review[];
  currentUser: CurrentUser | null;
  isFavorite: boolean;
  isToRead: boolean;
};

function formatDate(dateString: string): string {
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return dateString;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

export default function BookDetailsCard({
  book,
  reviews,
  currentUser,
  isFavorite,
  isToRead,
}: BookDetailsCardProps) {
  const reviewCount = reviews.length;
  const averageRating =
    reviewCount > 0
      ? reviews.reduce((sum, review) => sum + review.nota, 0) / reviewCount
      : 0;

  const sourceLabel = book.origem === "catalogo" ? "Official Catalog" : "Community Publication";
  const synopsis = book.descricao.startsWith("Fonte: Project Gutenberg ebook #")
    ? ""
    : book.descricao.trim();

  return (
    <section className={`${card} p-8`}>
      <div className="flex flex-col gap-8 md:flex-row md:items-start">
        {book.capa_url ? (
          <div className="relative h-64 w-44 shrink-0 overflow-hidden rounded-xl bg-slate-100 shadow-md">
            <Image
              alt={`Cover of ${book.titulo}`}
              className="object-cover"
              fill
              sizes="176px"
              src={`/api/books/${book.id_livro}/cover`}
              unoptimized
            />
          </div>
        ) : (
          <div className="flex h-64 w-44 shrink-0 flex-col justify-between rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 p-5 text-white shadow-md">
            <span className="inline-flex w-fit rounded bg-white/90 px-1.5 py-1">
              <LivruspLogo alt="" className="block h-3 w-auto" />
            </span>
            <div>
              <p className="line-clamp-4 text-lg font-bold leading-snug">{book.titulo}</p>
              <p className="mt-2 text-xs text-indigo-200">{book.total_paginas} progress positions</p>
            </div>
          </div>
        )}

        {/* Book Metadata and Actions */}
        <div className="flex-1 space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-[#1E2E4F]/15 bg-[#D9E1F1] px-3 py-1 text-xs font-semibold text-[#1E2E4F]">
                {sourceLabel}
              </span>
              <span className="inline-flex items-center rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs font-medium text-black/65">
                Book #{book.id_livro}
              </span>
            </div>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {book.titulo}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <StarRatingDisplay rating={averageRating} size="md" />
              <span className="text-sm font-semibold text-slate-800">
                {reviewCount > 0 ? averageRating.toFixed(1) : "No ratings yet"}
              </span>
              <span className="text-sm text-slate-500">
                ({reviewCount} {reviewCount === 1 ? "review" : "reviews"})
              </span>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Synopsis
            </h2>
            <p className="mt-2 whitespace-pre-line leading-relaxed text-slate-700">
              {synopsis || "No synopsis available for this book."}
            </p>
          </div>

          <dl className={`grid grid-cols-2 gap-4 p-4 text-sm sm:grid-cols-3 ${cardInset}`}>
            <div>
              <dt className="font-medium text-slate-500">Publication date</dt>
              <dd className="mt-1 font-semibold text-slate-900">
                {formatDate(book.data_publicacao)}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Length</dt>
              <dd className="mt-1 font-semibold text-slate-900">
                {book.total_paginas} progress positions
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Source</dt>
              <dd className="mt-1 font-semibold text-slate-900">{sourceLabel}</dd>
            </div>
          </dl>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              className={primaryCompact}
              href={`/books/${book.id_livro}/read`}
            >
              Read online
            </Link>
            <a
              className={secondaryCompact}
              href={`/api/books/${book.id_livro}/content`}
            >
              Download EPUB
            </a>
            {currentUser?.is_admin ? (
              <Link
                className={secondaryCompact}
                href={`/admin/books/${book.id_livro}`}
              >
                Edit metadata
              </Link>
            ) : null}

            {currentUser ? (
              <BookListActions
                bookId={book.id_livro}
                initialIsFavorite={isFavorite}
                initialIsToRead={isToRead}
              />
            ) : (
              <p className="text-sm text-slate-600">
                <Link className="font-semibold text-[#1E2E4F] hover:text-[#15223B]" href="/login">
                  Sign in
                </Link>{" "}
                to save this book to your reading lists.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

