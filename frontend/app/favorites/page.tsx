import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getFavoriteBooks, getOptionalCurrentUser } from "@/app/lib/books";
import { GUEST_NAV_LINKS, SIGNED_NAV_LINKS } from "@/app/lib/navigation";
import { card, pageBody, pageContainer } from "@/app/lib/ui";
import BookResultCard from "@/components/books/book-result-card";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";

export const metadata: Metadata = {
  title: "Favorites · LivrUSP",
};

export default async function FavoritesPage() {
  const currentUser = await getOptionalCurrentUser();
  if (!currentUser) redirect("/login");

  const result = await getFavoriteBooks();
  const navLinks = currentUser ? SIGNED_NAV_LINKS : GUEST_NAV_LINKS;

  return (
    <div className={pageBody}>
      <div className={pageContainer}>
        <SiteHeader activeHref="/favorites" currentUser={currentUser} />

        <main className="space-y-8 pt-4 pb-16 sm:pt-8 sm:pb-20">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-[#556B45]">
              Your shelf
            </p>
            <h1 className="mt-3 font-serif text-5xl leading-[0.98] font-normal tracking-tight text-black sm:text-6xl md:text-7xl">
              Favorites.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-black/60 sm:text-base">
              Books you saved to revisit, recommend, or read next.
            </p>
          </div>

          {result.status === "unavailable" ? (
            <section className={`${card} p-8`} role="alert">
              <h2 className="font-serif text-3xl font-normal tracking-tight text-black">
                Favorites could not load
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-black/65">{result.detail}</p>
            </section>
          ) : result.books.length > 0 ? (
            <section aria-labelledby="favorites-heading" className="space-y-6">
              <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-black/10 pb-4">
                <h2
                  className="font-serif text-3xl font-normal tracking-tight text-black sm:text-4xl"
                  id="favorites-heading"
                >
                  Saved books
                </h2>
                <p aria-live="polite" className="font-mono text-xs text-[#556B45]">
                  {result.books.length} {result.books.length === 1 ? "favorite" : "favorites"}
                </p>
              </div>

              <ul className="grid gap-5 sm:grid-cols-2">
                {result.books.map((book) => (
                  <BookResultCard
                    book={book}
                    isFavorite
                    key={book.id_livro}
                    showFavoriteButton
                  />
                ))}
              </ul>
            </section>
          ) : (
            <section className={`${card} p-10 text-center`}>
              <h2 className="font-serif text-3xl font-normal tracking-tight text-black">
                No favorites yet
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-black/65">
                Use the star control on any book card or detail page to save it here.
              </p>
              <Link
                className="mt-6 inline-flex items-center justify-center rounded-full bg-[#1E2E4F] px-6 py-2.5 text-xs font-semibold text-white transition hover:bg-[#15223B] sm:text-sm"
                href="/books"
              >
                Browse books
              </Link>
            </section>
          )}
        </main>

        <SiteFooter links={navLinks} />
      </div>
    </div>
  );
}
