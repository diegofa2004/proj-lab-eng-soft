import Link from "next/link";
import Image from "next/image";

import {
  getBookAverageRating,
  getBookPopularity,
  getBookReviewCount,
  type BookSearchResult,
} from "@/app/lib/books";
import { card, cardInteractive } from "@/app/lib/ui";
import { StarRatingDisplay } from "@/components/books/star-rating";
import { LivruspLogo } from "@/components/home/livrusp-logos";

type BookResultCardProps = {
  book: BookSearchResult;
};

const MAX_VISIBLE_GENRES = 3;

function getPublicationYear(dateString: string): string | null {
  const parsed = new Date(dateString);
  return Number.isNaN(parsed.getTime()) ? null : String(parsed.getUTCFullYear());
}

export default function BookResultCard({ book }: BookResultCardProps) {
  const authorNames = (book.autores ?? []).map((author) => author.nome).filter(Boolean);
  const genres = book.generos ?? [];
  const visibleGenres = genres.slice(0, MAX_VISIBLE_GENRES);
  const hiddenGenreCount = genres.length - visibleGenres.length;
  const publicationYear = getPublicationYear(book.data_publicacao);
  const sourceLabel = book.origem === "catalogo" ? "Official Catalog" : "Community Publication";

  const averageRating = getBookAverageRating(book);
  const reviewCount = getBookReviewCount(book);
  const popularityCount = getBookPopularity(book);
  const hasRating = averageRating > 0 || reviewCount > 0;

  return (
    <li>
      <Link
        className={`group flex h-full gap-5 p-5 ${card} ${cardInteractive}`}
        href={`/books/${book.id_livro}`}
      >
        {book.capa_url ? (
          <div className="relative h-36 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100 shadow">
            <Image
              alt={`Cover of ${book.titulo}`}
              className="object-cover"
              fill
              sizes="96px"
              src={`/api/books/${book.id_livro}/cover`}
              unoptimized
            />
          </div>
        ) : (
          <div
            aria-hidden="true"
            className="flex h-36 w-24 shrink-0 flex-col justify-between rounded-lg bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 p-2.5 text-white shadow"
          >
            <span className="inline-flex w-fit rounded bg-white/90 px-1 py-0.5">
              <LivruspLogo alt="" className="block h-2.5 w-auto" />
            </span>
            <p className="line-clamp-4 text-xs font-bold leading-snug">{book.titulo}</p>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex w-fit items-center rounded-full border border-[#1E2E4F]/15 bg-[#D9E1F1] px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#1E2E4F]">
              {sourceLabel}
            </span>
            <span
              aria-label={`${popularityCount} ${popularityCount === 1 ? "read" : "reads"}`}
              className="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-[#556B45]"
            >
              <svg
                aria-hidden="true"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {popularityCount} {popularityCount === 1 ? "read" : "reads"}
            </span>
          </div>

          <h3 className="mt-2 line-clamp-2 font-serif text-2xl leading-snug font-normal tracking-tight text-black transition group-hover:text-[#1E2E4F]">
            {book.titulo}
          </h3>

          {authorNames.length > 0 ? (
            <p className="mt-0.5 truncate text-xs font-medium text-black/65">
              by {authorNames.join(", ")}
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StarRatingDisplay rating={averageRating} size="sm" />
            <span className="font-mono text-xs font-semibold text-[#1E2E4F]">
              {hasRating ? averageRating.toFixed(1) : "No ratings"}
            </span>
            {reviewCount > 0 ? (
              <span className="font-mono text-[11px] text-black/55">
                ({reviewCount} {reviewCount === 1 ? "review" : "reviews"})
              </span>
            ) : null}
          </div>

          <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-black/65 sm:text-sm">
            {book.descricao.trim() || "No description provided for this book."}
          </p>

          {visibleGenres.length > 0 ? (
            <ul aria-label="Genres" className="mt-3 flex flex-wrap gap-1.5">
              {visibleGenres.map((genre) => (
                <li
                  className="rounded-full border border-black/10 bg-white/80 px-2.5 py-0.5 text-[11px] font-medium text-black/75"
                  key={genre.id_genero}
                >
                  {genre.nome}
                </li>
              ))}
              {hiddenGenreCount > 0 ? (
                <li className="rounded-full border border-black/10 bg-white/60 px-2 py-0.5 font-mono text-[10px] font-medium text-[#556B45]">
                  +{hiddenGenreCount}
                </li>
              ) : null}
            </ul>
          ) : null}

          <p className="mt-auto pt-3 font-mono text-[11px] text-[#556B45]">
            {publicationYear ? `${publicationYear} · ` : ""}
            {book.total_paginas} progress positions
          </p>
        </div>
      </Link>
    </li>
  );
}

