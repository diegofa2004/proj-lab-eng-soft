import type { Metadata } from "next";
import Link from "next/link";
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
import { LivruspLogo } from "@/components/home/livrusp-logos";

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
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              className="inline-flex items-center hover:opacity-70"
              href="/"
            >
              <LivruspLogo className="block h-5 w-auto" />
            </Link>
            <span aria-hidden="true" className="text-slate-300">
              /
            </span>
            <span className="text-sm font-medium text-slate-900">Books</span>
          </div>

          <nav className="flex items-center gap-4 text-sm">
            {currentUser ? (
              <Link
                className="font-semibold text-indigo-600 hover:text-indigo-700"
                href="/profile"
              >
                {currentUser.username}
              </Link>
            ) : (
              <>
                <Link
                  className="font-semibold text-slate-700 hover:text-slate-900"
                  href="/login"
                >
                  Sign in
                </Link>
                <Link
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 font-semibold text-white transition hover:bg-indigo-700"
                  href="/signup"
                >
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </header>

        <div>
          <h1 className="text-3xl font-bold tracking-tight">Browse books</h1>
          <p className="mt-2 text-slate-600">
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

