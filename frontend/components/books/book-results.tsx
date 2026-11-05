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
    <section className="rounded-[28px] border border-black/10 bg-[#E6EBF5]/90 p-10 text-center shadow-xs backdrop-blur-xs">
      <h2 className="font-serif text-3xl font-normal tracking-tight text-black">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-black/65">{description}</p>
      {action ? (
        <Link
          className="mt-6 inline-flex items-center justify-center rounded-full bg-[#1E2E4F] px-6 py-2.5 text-xs font-semibold text-white transition hover:bg-[#15223B] sm:text-sm"
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
  if (filters.source === "catalogo") parts.push("Official Catalog");
  if (filters.source === "usuario") parts.push("Community Publication");
  if (filters.minRating !== "all") parts.push(`${filters.minRating}★+ rating`);
  if (filters.sort === "popularity") parts.push("sorted by popularity");
  if (filters.sort === "rating") parts.push("sorted by highest rating");

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
        description="Try different keywords or adjust your popularity and rating filters."
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
    <section aria-labelledby="book-results-heading" className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-black/10 pb-4">
        <h2
          className="font-serif text-3xl font-normal tracking-tight text-black sm:text-4xl"
          id="book-results-heading"
        >
          {filterDescription ? `Results for ${filterDescription}` : "All books"}
        </h2>
        <p aria-live="polite" className="font-mono text-xs text-[#556B45]">
          Showing {firstIndex}–{lastIndex} of {total} {total === 1 ? "book" : "books"}
        </p>
      </div>

      <ul className="grid gap-5 sm:grid-cols-2">
        {books.map((book) => (
          <BookResultCard book={book} key={book.id_livro} />
        ))}
      </ul>

      {totalPages > 1 ? (
        <nav
          aria-label="Search results pages"
          className="flex items-center justify-between gap-4 border-t border-black/10 pt-6 text-sm"
        >
          {page > 1 ? (
            <Link
              className="rounded-full border border-black/15 bg-[#E6EBF5]/90 px-5 py-2.5 text-xs font-semibold text-[#1E2E4F] transition hover:bg-[#1E2E4F] hover:text-white sm:text-sm"
              href={buildBookSearchHref(filters, { page: page - 1 })}
              rel="prev"
            >
              ← Previous
            </Link>
          ) : (
            <span aria-hidden="true" />
          )}

          <span className="font-mono text-xs text-[#556B45]">
            Page {page} of {totalPages}
          </span>

          {page < totalPages ? (
            <Link
              className="rounded-full border border-black/15 bg-[#E6EBF5]/90 px-5 py-2.5 text-xs font-semibold text-[#1E2E4F] transition hover:bg-[#1E2E4F] hover:text-white sm:text-sm"
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
    <section aria-busy="true" aria-label="Loading results" className="space-y-6">
      <div className="h-9 w-56 animate-pulse rounded-lg bg-[#E6EBF5]" />
      <ul className="grid gap-5 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <li
            className="flex gap-5 rounded-[24px] border border-black/10 bg-[#E6EBF5]/90 p-5 shadow-2xs"
            key={index}
          >
            <div className="h-44 w-28 shrink-0 animate-pulse rounded bg-[#D9E1F1]" />
            <div className="flex-1 space-y-3 pt-1">
              <div className="h-4 w-28 animate-pulse rounded bg-[#D9E1F1]" />
              <div className="h-6 w-3/4 animate-pulse rounded bg-[#D9E1F1]" />
              <div className="h-4 w-32 animate-pulse rounded bg-[#D9E1F1]" />
              <div className="h-4 w-full animate-pulse rounded bg-[#D9E1F1]" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-[#D9E1F1]" />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

