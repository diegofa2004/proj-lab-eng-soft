import Link from "next/link";

import { getAdminData, type AdminAccessReport } from "@/app/lib/admin";
import { card, cardInset } from "@/app/lib/ui";

const numberFormat = new Intl.NumberFormat("en-US");

export default async function AdminInsightsPage() {
  const report = await getAdminData<AdminAccessReport>("/v2/admin/dashboard");

  if (!report) {
    return (
      <section>
        <h2 className="text-xl font-semibold">Insights</h2>
        <p className={`mt-4 p-5 text-red-700 ${card}`}>
          Access analytics are unavailable right now.
        </p>
      </section>
    );
  }

  const books = [...report.books].sort(
    (a, b) => b.acessos - a.acessos || a.titulo.localeCompare(b.titulo),
  );
  const totalAccesses = books.reduce((total, book) => total + book.acessos, 0);
  const booksWithAccess = books.filter((book) => book.acessos > 0).length;
  const topBook = books[0] ?? null;
  const maxAccesses = Math.max(1, ...books.map((book) => book.acessos));

  return (
    <section className="space-y-8">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-wider text-[#556B45]">
          Analytics
        </p>
        <h2 className="mt-2 font-serif text-4xl font-normal tracking-tight text-black">
          Reading insights.
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-black/60">
          See which books readers open most often. Counts include anonymous and signed-in
          readers who load a book&apos;s EPUB content.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className={`p-5 ${card}`}>
          <span className="text-sm text-slate-500">Total accesses</span>
          <strong className="mt-2 block text-3xl">{numberFormat.format(totalAccesses)}</strong>
        </div>
        <div className={`p-5 ${card}`}>
          <span className="text-sm text-slate-500">Books tracked</span>
          <strong className="mt-2 block text-3xl">{numberFormat.format(books.length)}</strong>
        </div>
        <div className={`p-5 ${card}`}>
          <span className="text-sm text-slate-500">Books with accesses</span>
          <strong className="mt-2 block text-3xl">{numberFormat.format(booksWithAccess)}</strong>
        </div>
        <div className={`p-5 ${card}`}>
          <span className="text-sm text-slate-500">Top book</span>
          <strong className="mt-2 block truncate text-lg" title={topBook?.titulo}>
            {topBook ? topBook.titulo : "No data yet"}
          </strong>
          {topBook ? (
            <span className="mt-1 block font-mono text-xs text-[#556B45]">
              {numberFormat.format(topBook.acessos)} accesses
            </span>
          ) : null}
        </div>
      </div>

      <div className={`p-5 sm:p-6 ${card}`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-black/10 pb-4">
          <div>
            <h3 className="text-lg font-semibold text-black">Accesses per book</h3>
            <p className="mt-1 text-sm text-slate-600">
              Ranked from most accessed to least accessed.
            </p>
          </div>
          <p className="font-mono text-xs text-slate-500">
            {numberFormat.format(totalAccesses)} total
          </p>
        </div>

        {books.length > 0 ? (
          <ul className="mt-5 space-y-4">
            {books.map((book) => {
              const width = Math.max(0, (book.acessos / maxAccesses) * 100);
              return (
                <li className={`p-4 ${cardInset}`} key={book.id_livro}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Link
                      className="font-semibold text-[#1E2E4F] hover:underline"
                      href={`/admin/books/${book.id_livro}`}
                    >
                      {book.titulo}
                    </Link>
                    <span className="font-mono text-sm font-semibold text-[#1E2E4F]">
                      {numberFormat.format(book.acessos)}
                    </span>
                  </div>
                  <div
                    aria-label={`${book.titulo}: ${book.acessos} accesses`}
                    className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#D9E1F1]"
                    role="img"
                  >
                    <div
                      className="h-full rounded-full bg-[#1E2E4F]"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-5 text-sm text-slate-600">
            No book access data is available yet.
          </p>
        )}
      </div>
    </section>
  );
}
