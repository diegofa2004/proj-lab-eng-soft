import Link from "next/link";

import {
  enrichAdminBooks,
  getAdminAuthors,
  getAdminData,
  getAdminGenres,
  type AdminBook,
} from "@/app/lib/admin";
import { card, primaryCompact } from "@/app/lib/ui";
import AdminBookMetadataEditor from "@/components/admin/admin-book-metadata-editor";

type BooksPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    page?: string | string[];
    edit?: string | string[];
  }>;
};

const PAGE_SIZE = 25;

export default async function AdminBooksPage({ searchParams }: BooksPageProps) {
  const params = await searchParams;
  const q = (typeof params.q === "string" ? params.q : "").trim().slice(0, 200);
  const requestedPage = Number(params.page);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const editBookId = typeof params.edit === "string" ? Number(params.edit) : null;
  const query = new URLSearchParams({
    q,
    limit: String(PAGE_SIZE),
    offset: String((page - 1) * PAGE_SIZE),
  });

  const [rawBooks, authors, genres] = await Promise.all([
    getAdminData<AdminBook[]>(`/v2/admin/books?${query}`),
    getAdminAuthors(),
    getAdminGenres(),
  ]);

  const books = rawBooks ? await enrichAdminBooks(rawBooks) : null;
  const pageHref = (number: number) =>
    `/admin/books?${new URLSearchParams({ q, page: String(number) })}`;

  return (
    <section>
      <h2 className="text-xl font-semibold">Books</h2>
      <p className="mt-1 text-sm text-slate-600">
        Edit book metadata, manage publication status, or remove books from the public catalog and restore them later.
      </p>
      <form action="/admin/books" className="mt-5 flex max-w-xl gap-2" method="get">
        <input
          aria-label="Search books"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2"
          defaultValue={q}
          maxLength={200}
          name="q"
          placeholder="Book title"
          type="search"
        />
        <button className={primaryCompact} type="submit">
          Search
        </button>
      </form>
      {books === null ? (
        <p className={`mt-6 p-5 text-red-700 ${card}`}>Could not load books.</p>
      ) : books.length === 0 ? (
        <p className={`mt-6 p-5 text-slate-600 ${card}`}>No books found.</p>
      ) : (
        <ul className={`mt-6 divide-y divide-slate-200 ${card}`}>
          {books.map((book) => (
            <AdminBookMetadataEditor
              availableAuthors={authors}
              availableGenres={genres}
              book={book}
              defaultOpen={editBookId === book.id_livro}
              key={`${book.id_livro}-${book.titulo}-${book.data_publicacao}-${book.total_paginas}-${book.status_publicacao}-${book.status_bloqueado}`}
              mode="inline"
            />
          ))}
        </ul>
      )}
      <div className="mt-5 flex gap-4 text-sm font-semibold text-[#1E2E4F]">
        {page > 1 && <Link href={pageHref(page - 1)}>← Previous</Link>}
        {books?.length === PAGE_SIZE && <Link href={pageHref(page + 1)}>Next →</Link>}
      </div>
    </section>
  );
}
