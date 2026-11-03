import Form from "next/form";
import Link from "next/link";

import {
  BOOK_SORT_OPTIONS,
  BOOK_SOURCE_OPTIONS,
  type BookSearchFilters,
  type Genre,
} from "@/app/lib/books";

type BookSearchFormProps = {
  filters: BookSearchFilters;
  genres: Genre[];
  hasActiveFilters: boolean;
};

const labelClassName = "block text-sm font-medium text-slate-700";
const fieldClassName =
  "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";

export default function BookSearchForm({ filters, genres, hasActiveFilters }: BookSearchFormProps) {
  const genreIsListed = genres.some((genre) => genre.nome === filters.genre);

  return (
    <section
      aria-label="Search books"
      className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
    >
      {/* The key remounts the form so the fields reflect the current URL after navigation. */}
      <Form
        action="/books"
        className="space-y-5"
        key={JSON.stringify({ ...filters, page: 1 })}
        role="search"
      >
        <div>
          <label className={labelClassName} htmlFor="book-search-query">
            Search
          </label>
          <div className="relative mt-1">
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
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
              className={`${fieldClassName} mt-0 py-2.5 pl-10 text-base`}
              defaultValue={filters.query}
              id="book-search-query"
              maxLength={200}
              name="q"
              placeholder="Search by title"
              type="search"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

        <div className="flex flex-wrap items-center gap-4">
          <button
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            type="submit"
          >
            Search
          </button>
          {hasActiveFilters ? (
            <Link
              className="text-sm font-semibold text-slate-600 hover:text-slate-900"
              href="/books"
            >
              Clear filters
            </Link>
          ) : null}
        </div>
      </Form>
    </section>
  );
}

