import type { Metadata } from "next";
import { Suspense } from "react";

import {
  getGenres,
  getOptionalCurrentUser,
  hasActiveBookFilters,
  parseBookSearchParams,
  type SearchParamsRecord,
} from "@/app/lib/books";
import BookResults, { BookResultsSkeleton } from "@/components/books/book-results";
import BookSearchForm from "@/components/books/book-search-form";
import SiteHeader from "@/components/layout/site-header";

export const metadata: Metadata = {
  title: "Browse books · LivrUSP",
};

type BooksPageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

export default async function BooksPage({ searchParams }: BooksPageProps) {
  const filters = parseBookSearchParams(await searchParams);
  const [genres, currentUser] = await Promise.all([getGenres(), getOptionalCurrentUser()]);

  return (
    <main className="min-h-screen bg-[#D9E1F1] px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-8">
        <SiteHeader activeHref="/books" currentUser={currentUser} />

        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-[#556B45]">
            Catalog
          </p>
          <h1 className="mt-3 font-serif text-5xl leading-[0.98] font-normal tracking-tight text-black sm:text-6xl md:text-7xl">
            Browse books.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-black/60 sm:text-base">
            Find your next read by title, author, genre, or source.
          </p>
        </div>

        <BookSearchForm
          filters={filters}
          genres={genres}
          hasActiveFilters={hasActiveBookFilters(filters)}
        />

        <Suspense fallback={<BookResultsSkeleton />} key={JSON.stringify(filters)}>
          <BookResults filters={filters} />
        </Suspense>
      </div>
    </main>
  );
}

