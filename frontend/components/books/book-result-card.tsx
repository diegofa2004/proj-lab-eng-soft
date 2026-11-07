import Link from "next/link";
import Image from "next/image";

import type { BookSearchResult } from "@/app/lib/books";
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

  return (
    <li>
      <Link
        className="group flex h-full gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md hover:ring-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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
          <span className="inline-flex w-fit items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
            {sourceLabel}
          </span>

          <h3 className="mt-2 line-clamp-2 font-semibold leading-snug text-slate-900 group-hover:text-indigo-700">
            {book.titulo}
          </h3>

          {authorNames.length > 0 ? (
            <p className="mt-0.5 truncate text-sm text-slate-600">by {authorNames.join(", ")}</p>
          ) : null}

          <p className="mt-2 line-clamp-2 text-sm text-slate-600">
            {book.descricao.trim() || "No description provided for this book."}
          </p>

          {visibleGenres.length > 0 ? (
            <ul aria-label="Genres" className="mt-3 flex flex-wrap gap-1.5">
              {visibleGenres.map((genre) => (
                <li
                  className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                  key={genre.id_genero}
                >
                  {genre.nome}
                </li>
              ))}
              {hiddenGenreCount > 0 ? (
                <li className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                  +{hiddenGenreCount}
                </li>
              ) : null}
            </ul>
          ) : null}

          <p className="mt-auto pt-3 text-xs text-slate-500">
            {publicationYear ? `${publicationYear} · ` : ""}
            {book.total_paginas} progress positions
          </p>
        </div>
      </Link>
    </li>
  );
}

