import Form from "next/form";
import Link from "next/link";

import {
  BOOK_RATING_FILTER_OPTIONS,
  BOOK_SORT_OPTIONS,
  BOOK_SOURCE_OPTIONS,
  buildBookSearchHref,
  type BookSearchFilters,
  type Genre,
} from "@/app/lib/books";
import { card } from "@/app/lib/ui";

type BookSearchFormProps = {
  filters: BookSearchFilters;
  genres: Genre[];
  hasActiveFilters: boolean;
};

const labelClassName =
  "block font-mono text-[11px] font-semibold uppercase tracking-wider text-[#556B45]";
const fieldClassName =
  "mt-1.5 block w-full rounded-xl border border-black/15 bg-white px-3.5 py-2.5 text-sm text-black shadow-2xs outline-none transition placeholder:text-black/40 hover:border-[#1E2E4F]/50 focus:border-[#1E2E4F] focus:ring-2 focus:ring-[#82A7D5]/50";

export default function BookSearchForm({
  filters,
  genres,
  hasActiveFilters,
}: BookSearchFormProps) {
  const genreIsListed = genres.some((genre) => genre.nome === filters.genre);

  const quickFilters = [
    {
      label: "Most popular",
      isActive: filters.sort === "popularity",
      href: buildBookSearchHref(filters, {
        sort: filters.sort === "popularity" ? "relevance" : "popularity",
        page: 1,
      }),
    },
    {
      label: "Highest rated",
      isActive: filters.sort === "rating",
      href: buildBookSearchHref(filters, {
        sort: filters.sort === "rating" ? "relevance" : "rating",
        page: 1,
      }),
    },
    {
      label: "4★ and above",
      isActive: filters.minRating === "4",
      href: buildBookSearchHref(filters, {
        minRating: filters.minRating === "4" ? "all" : "4",
        page: 1,
      }),
    },
    {
      label: "3★ and above",
      isActive: filters.minRating === "3",
      href: buildBookSearchHref(filters, {
        minRating: filters.minRating === "3" ? "all" : "3",
        page: 1,
      }),
    },
  ];

  return (
    <section
      aria-label="Search books"
      className={`${card} p-6 sm:p-8`}
    >
      {/* The key remounts the form so the fields reflect the current URL after navigation. */}
      <Form
        action="/books"
        className="space-y-6"
        key={JSON.stringify({ ...filters, page: 1 })}
        role="search"
      >
        <div>
          <label className={labelClassName} htmlFor="book-search-query">
            Search
          </label>
          <div className="relative mt-1.5">
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#1E2E4F]/60"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 110-15 7.5 7.5 0 010 15z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <input
              autoComplete="off"
              className={`${fieldClassName} mt-0 py-3 pl-11 text-base`}
              defaultValue={filters.query}
              id="book-search-query"
              maxLength={200}
              name="q"
              placeholder="Search by title"
              type="search"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className={labelClassName} htmlFor="book-search-author">
              Author
            </label>
            <input
              autoComplete="off"
              className={fieldClassName}
              defaultValue={filters.author}
              id="book-search-author"
              maxLength={200}
              name="author"
              placeholder="Any author"
              type="text"
            />
          </div>

          <div>
            <label className={labelClassName} htmlFor="book-search-genre">
              Genre
            </label>
            {genres.length > 0 ? (
              <select
                className={fieldClassName}
                defaultValue={filters.genre}
                id="book-search-genre"
                name="genre"
              >
                <option value="">All genres</option>
                {genres.map((genre) => (
                  <option key={genre.id_genero} value={genre.nome}>
                    {genre.nome}
                  </option>
                ))}
                {filters.genre && !genreIsListed ? (
                  <option value={filters.genre}>{filters.genre}</option>
                ) : null}
              </select>
            ) : (
              <input
                autoComplete="off"
                className={fieldClassName}
                defaultValue={filters.genre}
                id="book-search-genre"
                maxLength={200}
                name="genre"
                placeholder="Any genre"
                type="text"
              />
            )}
          </div>

          <div>
            <label className={labelClassName} htmlFor="book-search-source">
              Source
            </label>
            <select
              className={fieldClassName}
              defaultValue={filters.source}
              id="book-search-source"
              name="source"
            >
              {BOOK_SOURCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClassName} htmlFor="book-search-min-rating">
              Minimum rating
            </label>
            <select
              className={fieldClassName}
              defaultValue={filters.minRating}
              id="book-search-min-rating"
              name="min_rating"
            >
              {BOOK_RATING_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClassName} htmlFor="book-search-sort">
              Sort by
            </label>
            <select
              className={fieldClassName}
              defaultValue={filters.sort}
              id="book-search-sort"
              name="sort"
            >
              {BOOK_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-black/10 pt-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 font-mono text-[11px] uppercase tracking-wider text-[#556B45]">
              Quick filters:
            </span>
            {quickFilters.map((pill) => (
              <Link
                aria-current={pill.isActive ? "true" : undefined}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  pill.isActive
                    ? "bg-[#1E2E4F] text-white shadow-2xs"
                    : "border border-black/15 bg-white/80 text-[#1E2E4F] hover:border-[#1E2E4F] hover:bg-white"
                }`}
                href={pill.href}
                key={pill.label}
              >
                {pill.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {hasActiveFilters ? (
              <Link
                className="rounded-full border border-black/15 bg-white/75 px-5 py-2.5 text-xs font-semibold text-[#1E2E4F] transition hover:border-[#1E2E4F] hover:bg-white sm:text-sm"
                href="/books"
              >
                Clear filters
              </Link>
            ) : null}
            <button
              className="rounded-full bg-[#1E2E4F] px-7 py-2.5 text-xs font-semibold text-white transition hover:bg-[#15223B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E2E4F] focus-visible:ring-offset-2 sm:text-sm"
              type="submit"
            >
              Search
            </button>
          </div>
        </div>
      </Form>
    </section>
  );
}

