import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";

import type { BookSearchResult, SignedHomeData } from "@/app/lib/books";
import { SIGNED_NAV_LINKS } from "@/app/lib/navigation";
import { card, cardInteractive, pageBody, pageContainer } from "@/app/lib/ui";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";

const SHELF_LINKS = [
  { label: "My readings", href: "#my-readings" },
  { label: "Favorites", href: "#favorites" },
  { label: "My stories", href: "#my-stories" },
  { label: "To-be-read", href: "#to-be-read" },
  { label: "My Reviews", href: "#my-reviews" },
  { label: "Socials", href: "#socials" },
] as const;

const SOCIAL_ICONS: ReactNode[] = [
  // Chain link icon
  <svg
    aria-hidden="true"
    className="h-5 w-5 text-black"
    fill="none"
    key="link"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
  >
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>,
  // Globe icon
  <svg
    aria-hidden="true"
    className="h-5 w-5 text-black"
    fill="none"
    key="globe"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>,
  // Users icon
  <svg
    aria-hidden="true"
    className="h-5 w-5 text-black"
    fill="none"
    key="users"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
  >
    <circle cx="9" cy="7" r="4" />
    <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    <path d="M21 21v-2a4 4 0 0 0-3-3.85" />
  </svg>,
];

function BookCoverItem({
  book,
  badgeText,
}: {
  book: BookSearchResult;
  badgeText?: string;
}) {
  const authorNames = (book.autores ?? []).map((author) => author.nome).filter(Boolean);

  return (
    <Link
      className={`group flex w-fit shrink-0 ${card} ${cardInteractive} p-5`}
      href={`/books/${book.id_livro}`}
    >
      <div
        className="relative flex aspect-[2/3] w-[150px] shrink-0 flex-col justify-between overflow-hidden rounded-lg border border-black/20 bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 p-4 text-white shadow-sm sm:w-[185px] sm:p-5"
      >
        {book.capa_url ? (
          <>
            <Image
              alt={`Cover of ${book.titulo}`}
              className="object-cover"
              fill
              sizes="(max-width: 640px) 150px, 185px"
              src={`/api/books/${book.id_livro}/cover`}
              unoptimized
            />
            <span className="sr-only">{book.titulo}</span>
            {badgeText ? (
              <span className="relative z-10 self-end rounded bg-white/90 px-2 py-1 text-xs font-bold text-slate-900">
                {badgeText}
              </span>
            ) : null}
          </>
        ) : (
          <>
            {/* Subtle book spine crease */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/15 to-transparent"
            />

            <div className="relative z-10 flex items-start justify-between gap-2">
              <span className="line-clamp-1 font-mono text-[9px] font-medium uppercase tracking-[0.16em] opacity-75 sm:text-[10px]">
                {authorNames.length > 0 ? authorNames.join(", ") : "LivrUSP"}
              </span>
              {badgeText ? (
                <span className="shrink-0 font-mono text-[10px] font-bold text-[#FBE251]">
                  {badgeText}
                </span>
              ) : null}
            </div>

            <div className="relative z-10 my-auto py-2">
              <h3 className="line-clamp-4 font-serif text-2xl leading-[1.08] font-normal tracking-tight sm:text-3xl">
                {book.titulo}
              </h3>
            </div>

            <div className="relative z-10 flex items-center justify-between gap-2 border-t border-current/15 pt-2 text-[10px] opacity-70">
              <span className="truncate">
                {book.origem === "usuario" ? "Original Story" : "Catalog"}
              </span>
              <span className="shrink-0 font-mono">{book.total_paginas}p</span>
            </div>
          </>
        )}
      </div>
    </Link>
  );
}

function BookShelfSection({
  id,
  title,
  books,
  emptyLabel,
  badgesByBookId,
}: {
  id: string;
  title: string;
  books: BookSearchResult[];
  emptyLabel: string;
  badgesByBookId?: Map<number, string>;
}) {
  return (
    <section className="py-10 sm:py-14" id={id}>
      <h2 className="font-serif text-4xl font-normal tracking-tight text-black sm:text-5xl md:text-6xl">
        {title}
      </h2>

      {books.length > 0 ? (
        <div className="mt-8 flex flex-wrap gap-6 sm:mt-10 sm:gap-8">
          {books.map((book) => (
            <BookCoverItem
              badgeText={badgesByBookId?.get(book.id_livro)}
              book={book}
              key={book.id_livro}
            />
          ))}
        </div>
      ) : (
        <div className="mt-8 sm:mt-10">
          <Link
            className={`group flex w-fit ${card} ${cardInteractive} p-5`}
            href="/books"
          >
            <div className="flex aspect-[2/3] w-[150px] flex-col justify-between rounded-lg border border-dashed border-black/25 bg-white/60 p-4 text-left sm:w-[185px] sm:p-5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#556B45]">
                Empty shelf
              </span>
              <p className="font-serif text-lg leading-snug text-black/75">
                {emptyLabel}
              </p>
              <span className="text-xs font-semibold text-[#1E2E4F] group-hover:underline">
                Browse books →
              </span>
            </div>
          </Link>
        </div>
      )}
    </section>
  );
}

export default function SignedHomePage({
  currentUser,
  data,
}: {
  currentUser: { username: string; is_admin: boolean };
  data: SignedHomeData;
}) {
  const reviewBadges = new Map<number, string>();
  const reviewedBooks: BookSearchResult[] = [];
  const seenReviewBookIds = new Set<number>();

  for (const { book, review } of data.myReviews) {
    if (!seenReviewBookIds.has(book.id_livro)) {
      seenReviewBookIds.add(book.id_livro);
      reviewedBooks.push(book);
      reviewBadges.set(book.id_livro, `${review.nota}/5`);
    }
  }

  return (
    <div className={pageBody}>
      <div className={pageContainer}>
        <SiteHeader activeHref="/home" currentUser={currentUser} />

        <nav aria-label="Home sections" className="flex flex-wrap gap-2 pb-2">
          {SHELF_LINKS.map((item) => (
            <Link
              className="rounded-full border border-black/10 bg-white/60 px-3 py-1.5 text-xs font-semibold text-[#1E2E4F] transition hover:bg-white"
              href={item.href}
              key={item.label}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="pt-4 pb-12 sm:pt-8 sm:pb-16">
          {/* My readings */}
          <BookShelfSection
            books={data.myReadings}
            emptyLabel="No readings started yet."
            id="my-readings"
            title="My readings"
          />

          {/* Favorites */}
          <BookShelfSection
            books={data.favorites}
            emptyLabel="No favorite books yet."
            id="favorites"
            title="Favorites"
          />

          {/* My stories */}
          <BookShelfSection
            books={data.myStories}
            emptyLabel="No stories published by you yet."
            id="my-stories"
            title="My stories"
          />

          {/* To-be-read */}
          <BookShelfSection
            books={data.toBeRead}
            emptyLabel="Your to-be-read list is empty."
            id="to-be-read"
            title="To-be-read"
          />

          {/* My Reviews */}
          <BookShelfSection
            badgesByBookId={reviewBadges}
            books={reviewedBooks}
            emptyLabel="You haven’t reviewed any books yet."
            id="my-reviews"
            title="My Reviews"
          />

          {/* Socials */}
          <section className="pt-10 pb-12 sm:pt-14 sm:pb-20" id="socials">
            <h2 className="font-serif text-4xl font-normal tracking-tight text-black sm:text-5xl md:text-6xl">
              Socials
            </h2>

            {data.socials.length > 0 ? (
              <div className="mt-12 grid grid-cols-1 gap-10 sm:mt-16 sm:grid-cols-3 sm:gap-8">
                {data.socials.map((item, index) => (
                  <div className="flex flex-col" key={item.id}>
                    <div className="mb-5">
                      {SOCIAL_ICONS[index % SOCIAL_ICONS.length]}
                    </div>
                    <h3 className="font-serif text-lg font-normal text-black sm:text-xl">
                      {item.username}
                    </h3>
                    <div className="mt-3 space-y-0.5 text-xs leading-relaxed text-black/55 sm:text-sm">
                      <p>
                        <Link
                          className="transition hover:text-black hover:underline"
                          href={`/books/${item.bookId}`}
                        >
                          {item.bookTitle}
                          {item.authorName ? ` - ${item.authorName}` : ""}
                        </Link>
                      </p>
                      <p>{item.rating}/5</p>
                      {item.reviewText ? (
                        <p className="line-clamp-3">{item.reviewText}</p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-12 grid grid-cols-1 gap-10 sm:mt-16 sm:grid-cols-3 sm:gap-8">
                <div className="flex flex-col">
                  <div className="mb-5">{SOCIAL_ICONS[0]}</div>
                  <h3 className="font-serif text-lg font-normal text-black sm:text-xl">
                    No recent activity
                  </h3>
                  <p className="mt-3 text-xs leading-relaxed text-black/55 sm:text-sm">
                    Community reviews and activity will appear here once books are reviewed.
                  </p>
                </div>
              </div>
            )}
          </section>
        </main>

        <SiteFooter links={SIGNED_NAV_LINKS} />
      </div>
    </div>
  );
}

