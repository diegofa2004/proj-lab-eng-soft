import Image from "next/image";
import Link from "next/link";

import type { BookSearchResult } from "@/app/lib/books";
import { card, cardInteractive } from "@/app/lib/ui";

export default function BookCoverCard({
  book,
  badgeText,
  reason,
}: {
  book: BookSearchResult;
  badgeText?: string;
  reason?: string;
}) {
  const authorNames = (book.autores ?? []).map((author) => author.nome).filter(Boolean);

  return (
    <Link
      className={`group flex w-[182px] shrink-0 flex-col ${card} ${cardInteractive} p-3 sm:w-[210px] sm:p-4`}
      href={`/books/${book.id_livro}`}
    >
      <div className="relative flex aspect-[2/3] w-full shrink-0 flex-col justify-between overflow-hidden rounded-xl border border-black/20 bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 p-4 text-white shadow-sm">
        {book.capa_url ? (
          <>
            <Image
              alt={`Cover of ${book.titulo}`}
              className="object-cover transition duration-300 group-hover:scale-[1.02]"
              fill
              sizes="(max-width: 640px) 158px, 178px"
              src={`/api/books/${book.id_livro}/cover`}
              unoptimized
            />
            {badgeText ? (
              <span className="relative z-10 self-end rounded-full bg-white/90 px-2 py-1 text-[10px] font-bold text-slate-900">
                {badgeText}
              </span>
            ) : null}
          </>
        ) : (
          <>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/15 to-transparent"
            />
            <div className="relative z-10 flex items-start justify-between gap-2">
              <span className="line-clamp-2 font-mono text-[9px] uppercase tracking-[0.14em] opacity-75">
                {authorNames.length > 0 ? authorNames.join(", ") : "LivrUSP"}
              </span>
              {badgeText ? (
                <span className="shrink-0 font-mono text-[10px] font-bold text-[#FBE251]">
                  {badgeText}
                </span>
              ) : null}
            </div>
            <h3 className="relative z-10 my-auto line-clamp-4 font-serif text-2xl leading-[1.08] font-normal tracking-tight">
              {book.titulo}
            </h3>
            <div className="relative z-10 flex items-center justify-between gap-2 border-t border-current/15 pt-2 text-[10px] opacity-70">
              <span className="truncate">
                {book.origem === "usuario" ? "Original Story" : "Catalog"}
              </span>
              <span className="shrink-0 font-mono">{book.total_paginas} pos.</span>
            </div>
          </>
        )}
      </div>

      <div className="min-h-20 px-1 pt-3">
        <h3 className="line-clamp-2 font-serif text-lg leading-tight text-black">
          {book.titulo}
        </h3>
        <p className="mt-1 line-clamp-1 text-xs text-black/55">
          {authorNames.length > 0 ? authorNames.join(", ") : "Unknown author"}
        </p>
        {reason ? (
          <p className="mt-2 line-clamp-2 text-[11px] font-medium leading-snug text-[#556B45]">
            {reason}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
