import Link from "next/link";

import {
  buildBookSearchHref,
  hasActiveBookFilters,
  searchBooks,
  type BookSearchFilters,
} from "@/app/lib/books";
import BookResultCard from "@/components/books/book-result-card";

type BookResultsProps = {
  filters: BookSearchFilters;
};

function ResultsMessage({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  return (
    <section className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">{description}</p>
      {action ? (
        <Link
          className="mt-5 inline-flex text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          href={action.href}
        >
          {action.label}
        </Link>
      ) : null}
    </section>
  );
}

function describeFilters(filters: BookSearchFilters): string {
  const parts: string[] = [];

  if (filters.query) parts.push(`“${filters.query}”`);
  if (filters.author) parts.push(`author “${filters.author}”`);
  if (filters.genre) parts.push(`genre “${filters.genre}”`);

  return parts.join(", ");
}

export default async function BookResults({ filters }: BookResultsProps) {
  const result = await searchBooks(filters);
  const isFiltered = hasActiveBookFilters(filters);

  if (result.status === "unavailable") {
    return (
      <ResultsMessage
        action={{ href: buildBookSearchHref(filters), label: "Try again" }}
        description={result.detail}
        title="Search unavailable"
      />
    );
  }

  const { books, total, page, pageSize } = result;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (total === 0) {
    return isFiltered ? (
      <ResultsMessage
        action={{ href: "/books", label: "Clear filters" }}
        description="Try different keywords or remove some filters."
        title="No books match your search"
      />
    ) : (
      <ResultsMessage
        description="There are no books available in the catalog yet. Check back soon."
        title="No books yet"
      />
    );
  }

  if (books.length === 0) {
    return (
      <ResultsMessage
        action={{ href: buildBookSearchHref(filters, { page: 1 }), label: "Go to first page" }}
        description={`This search has only ${totalPages} ${totalPages === 1 ? "page" : "pages"}.`}
        title="Page not found"
      />
    );
  }

  const firstIndex = (page - 1) * pageSize + 1;
  const lastIndex = firstIndex + books.length - 1;
  const filterDescription = describeFilters(filters);

  return (
    <section aria-labelledby="book-results-heading" className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900" id="book-results-heading">
          {filterDescription ? `Results for ${filterDescription}` : "All books"}
        </h2>
        <p aria-live="polite" className="text-sm text-slate-500">
          Showing {firstIndex}–{lastIndex} of {total} {total === 1 ? "book" : "books"}
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2">
        {books.map((book) => (
          <BookResultCard book={book} key={book.id_livro} />
        ))}
      </ul>

      {totalPages > 1 ? (
        <nav
          aria-label="Search results pages"
          className="flex items-center justify-between gap-4 pt-2 text-sm"
        >
          {page > 1 ? (
            <Link
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50"
              href={buildBookSearchHref(filters, { page: page - 1 })}
              rel="prev"
            >
              ← Previous
            </Link>
          ) : (
            <span aria-hidden="true" />
          )}

          <span className="text-slate-600">
            Page {page} of {totalPages}
          </span>

          {page < totalPages ? (
            <Link
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50"
              href={buildBookSearchHref(filters, { page: page + 1 })}
              rel="next"
            >
              Next →
            </Link>
          ) : (
            <span aria-hidden="true" />
          )}
        </nav>
      ) : null}
    </section>
  );
}

export function BookResultsSkeleton() {
  return (
    <section aria-busy="true" aria-label="Loading results" className="space-y-5">
      <div className="h-7 w-48 animate-pulse rounded bg-slate-200" />
      <ul className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <li
            className="flex gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
            key={index}
          >
            <div className="h-36 w-24 shrink-0 animate-pulse rounded-lg bg-slate-200" />
            <div className="flex-1 space-y-3 pt-1">
              <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
              <div className="h-5 w-3/4 animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

