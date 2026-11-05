import Link from "next/link";

import {
  getBookAverageRating,
  getBookPopularity,
  getBookReviewCount,
  type BookSearchResult,
} from "@/app/lib/books";
import { StarRatingDisplay } from "@/components/books/star-rating";

type BookResultCardProps = {
  book: BookSearchResult;
};

const MAX_VISIBLE_GENRES = 3;

const COVER_THEMES = [
  {
    bg: "bg-[#FBF9F5]",
    text: "text-[#171717]",
    accent: "text-[#B81D13]",
    border: "border-black/15",
  },
  {
    bg: "bg-[#1B1C1E]",
    text: "text-[#F5F5F5]",
    accent: "text-[#A3B8D7]",
    border: "border-black/30",
  },
  {
    bg: "bg-[#F7F3E8]",
    text: "text-[#1E2E4F]",
    accent: "text-[#556B45]",
    border: "border-black/15",
  },
  {
    bg: "bg-[#D93829]",
    text: "text-white",
    accent: "text-[#FBE251]",
    border: "border-black/20",
  },
  {
    bg: "bg-[#0B1546]",
    text: "text-white",
    accent: "text-[#35D430]",
    border: "border-black/25",
  },
] as const;

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
  const theme = COVER_THEMES[Math.abs(book.id_livro) % COVER_THEMES.length];

  const averageRating = getBookAverageRating(book);
  const reviewCount = getBookReviewCount(book);
  const popularityCount = getBookPopularity(book);
  const hasRating = averageRating > 0 || reviewCount > 0;

  return (
    <li>
      <Link
        className="group flex h-full gap-5 rounded-[24px] border border-black/10 bg-[#E6EBF5]/90 p-5 shadow-2xs transition duration-200 hover:-translate-y-0.5 hover:border-[#1E2E4F]/40 hover:bg-white/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E2E4F]"
        href={`/books/${book.id_livro}`}
      >
        {/* Book Cover */}
        <div
          aria-hidden="true"
          className={`relative flex h-44 w-28 shrink-0 flex-col justify-between overflow-hidden border ${theme.border} ${theme.bg} ${theme.text} p-3 shadow-xs transition duration-200 group-hover:shadow-md`}
        >
          <div className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/15 to-transparent" />
          <div className="relative z-10 flex items-start justify-between gap-1">
            <span className="line-clamp-1 font-mono text-[8px] font-medium uppercase tracking-[0.14em] opacity-75">
              {authorNames.length > 0 ? authorNames[0] : "LivrUSP"}
            </span>
            {hasRating ? (
              <span className={`shrink-0 font-mono text-[9px] font-bold ${theme.accent}`}>
                {averageRating.toFixed(1)}★
              </span>
            ) : null}
          </div>
          <p className="relative z-10 my-auto line-clamp-4 font-serif text-base leading-[1.1] font-normal tracking-tight">
            {book.titulo}
          </p>
          <div className="relative z-10 flex items-center justify-between border-t border-current/15 pt-1.5 font-mono text-[8px] opacity-70">
            <span>{book.origem === "usuario" ? "Story" : "Catalog"}</span>
            <span>{book.total_paginas}p</span>
          </div>
        </div>

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
            {book.total_paginas} pages
          </p>
        </div>
      </Link>
    </li>
  );
}

