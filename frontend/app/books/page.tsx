import type { Metadata } from "next";
import { Suspense } from "react";

import {
  getGenres,
  getOptionalCurrentUser,
  hasActiveBookFilters,
  parseBookSearchParams,
  type SearchParamsRecord,
} from "@/app/lib/books";
import { GUEST_NAV_LINKS, SIGNED_NAV_LINKS } from "@/app/lib/navigation";
import { pageBody, pageContainer } from "@/app/lib/ui";
import BookResults, { BookResultsSkeleton } from "@/components/books/book-results";
import BookSearchForm from "@/components/books/book-search-form";
import SiteFooter from "@/components/layout/site-footer";
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

  const navLinks = currentUser ? SIGNED_NAV_LINKS : GUEST_NAV_LINKS;

  return (
    <div className={pageBody}>
      <div className={pageContainer}>
        <SiteHeader activeHref="/books" currentUser={currentUser} />

        <main className="space-y-8 pt-4 pb-16 sm:pt-8 sm:pb-20">
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
        </main>

        <SiteFooter links={navLinks} />
      </div>
    </div>
  );
}

