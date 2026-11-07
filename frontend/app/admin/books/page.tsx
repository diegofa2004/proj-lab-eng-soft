import Link from "next/link";

import { getAdminData, type AdminBook } from "@/app/lib/admin";
import AdminActionButton from "@/components/admin/admin-action-button";

type BooksPageProps = {
  searchParams: Promise<{ q?: string | string[]; page?: string | string[] }>;
};

const PAGE_SIZE = 25;

export default async function AdminBooksPage({ searchParams }: BooksPageProps) {
  const params = await searchParams;
  const q = (typeof params.q === "string" ? params.q : "").trim().slice(0, 200);
  const requestedPage = Number(params.page);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const query = new URLSearchParams({ q, limit: String(PAGE_SIZE), offset: String((page - 1) * PAGE_SIZE) });
  const books = await getAdminData<AdminBook[]>(`/v2/admin/books?${query}`);
  const pageHref = (number: number) => `/admin/books?${new URLSearchParams({ q, page: String(number) })}`;

  return (
    <section>
      <h2 className="text-xl font-semibold">Books</h2>
      <p className="mt-1 text-sm text-slate-600">Remove books from the public catalog or restore them later.</p>
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
        <button className="rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white hover:bg-indigo-800" type="submit">Search</button>
      </form>
      {books === null ? (
        <p className="mt-6 rounded-xl bg-white p-5 text-red-700">Could not load books.</p>
      ) : books.length === 0 ? (
        <p className="mt-6 rounded-xl bg-white p-5 text-slate-600">No books found.</p>
      ) : (
        <ul className="mt-6 divide-y divide-slate-200 rounded-xl bg-white shadow-sm">
          {books.map((book) => (
            <li className="flex flex-wrap items-center justify-between gap-4 p-4" key={book.id_livro}>
              <div className="min-w-0">
                <p className="font-semibold">{book.titulo}</p>
                <p className="text-sm text-slate-500">
                  #{book.id_livro} · {book.origem === "usuario" ? "Community book" : "Catalog book"} · {book.status_bloqueado ? "Removed" : book.status_publicacao}
                </p>
                {!book.status_bloqueado && book.status_publicacao === "publicado" && (
                  <Link className="text-sm text-indigo-700 hover:underline" href={`/books/${book.id_livro}`}>
                    View public page
                  </Link>
                )}
              </div>
              <AdminActionButton
                confirmText={book.status_bloqueado ? undefined : `Remove “${book.titulo}” from the public catalog?`}
                label={book.status_bloqueado ? "Restore" : "Remove from catalog"}
                method="POST"
                path={`books/${book.id_livro}/${book.status_bloqueado ? "unblock" : "block"}`}
                tone={book.status_bloqueado ? "neutral" : "danger"}
              />
            </li>
          ))}
        </ul>
      )}
      <div className="mt-5 flex gap-4 text-sm font-semibold text-indigo-700">
        {page > 1 && <Link href={pageHref(page - 1)}>← Previous</Link>}
        {books?.length === PAGE_SIZE && <Link href={pageHref(page + 1)}>Next →</Link>}
      </div>
    </section>
  );
}
