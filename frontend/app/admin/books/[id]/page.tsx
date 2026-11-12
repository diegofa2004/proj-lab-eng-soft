import Link from "next/link";

import {
  getAdminAuthors,
  getAdminBookById,
  getAdminGenres,
} from "@/app/lib/admin";
import { PUBLICATION_STATUS_LABELS } from "@/app/lib/books";
import { card, secondaryCompact } from "@/app/lib/ui";
import AdminActionButton from "@/components/admin/admin-action-button";
import AdminBookMetadataEditor from "@/components/admin/admin-book-metadata-editor";

type AdminBookDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminBookDetailPage({ params }: AdminBookDetailPageProps) {
  const { id } = await params;
  const bookId = Number(id);

  if (!Number.isSafeInteger(bookId) || bookId <= 0) {
    return <p className={`p-5 text-red-700 ${card}`}>Invalid book ID.</p>;
  }

  const [book, authors, genres] = await Promise.all([
    getAdminBookById(bookId),
    getAdminAuthors(),
    getAdminGenres(),
  ]);

  if (!book) {
    return (
      <section className="space-y-4">
        <Link className="text-sm font-semibold text-[#1E2E4F] hover:underline" href="/admin/books">
          ← Back to books
        </Link>
        <p className={`p-5 text-red-700 ${card}`}>Book not found or unavailable.</p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link className="text-sm font-semibold text-[#1E2E4F] hover:underline" href="/admin/books">
          ← Back to books
        </Link>
        {!book.status_bloqueado && book.status_publicacao === "publicado" && (
          <Link className={secondaryCompact} href={`/books/${book.id_livro}`}>
            View public page
          </Link>
        )}
      </div>

      <div className={`flex flex-wrap items-start justify-between gap-5 p-6 ${card}`}>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#1E2E4F]/20 bg-[#D9E1F1] px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#1E2E4F]">
              Book #{book.id_livro}
            </span>
            <span className="rounded-full border border-black/10 bg-white/80 px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-black/70">
              {book.origem === "usuario" ? "Community book" : "Catalog book"}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${
                book.status_bloqueado
                  ? "border border-red-300 bg-red-100 text-red-800"
                  : book.status_publicacao === "publicado"
                    ? "border border-[#556B45]/30 bg-[#556B45]/15 text-[#3A4B2E]"
                    : "border border-amber-500/30 bg-amber-100 text-amber-900"
              }`}
            >
              {book.status_bloqueado ? "Removed" : PUBLICATION_STATUS_LABELS[book.status_publicacao]}
            </span>
          </div>

          <h2 className="mt-3 text-2xl font-bold text-black sm:text-3xl">{book.titulo}</h2>

          {book.autores && book.autores.length > 0 && (
            <p className="mt-1 text-sm text-slate-600">
              By {book.autores.map((author) => author.nome).join(", ")}
            </p>
          )}
        </div>

        <AdminActionButton
          confirmText={
            book.status_bloqueado
              ? undefined
              : `Remove “${book.titulo}” from the public catalog?`
          }
          label={book.status_bloqueado ? "Restore" : "Remove from catalog"}
          method="POST"
          path={`books/${book.id_livro}/${book.status_bloqueado ? "unblock" : "block"}`}
          tone={book.status_bloqueado ? "neutral" : "danger"}
        />
      </div>

      <AdminBookMetadataEditor
        availableAuthors={authors}
        availableGenres={genres}
        book={book}
        key={`${book.id_livro}-${book.titulo}-${book.data_publicacao}-${book.total_paginas}-${book.status_publicacao}-${book.status_bloqueado}`}
        mode="standalone"
      />
    </section>
  );
}
