import Image from "next/image";
import Link from "next/link";

import type {
  BookRecommendation,
  ForYouHomeData,
} from "@/app/lib/books";
import { SIGNED_NAV_LINKS } from "@/app/lib/navigation";
import {
  card,
  cardInteractive,
  pageBody,
  pageContainer,
  primaryCompact,
  secondaryCompact,
} from "@/app/lib/ui";
import BookCoverCard from "@/components/books/book-cover-card";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";

function SectionHeading({
  eyebrow,
  title,
  description,
  href,
}: {
  eyebrow: string;
  title: string;
  description: string;
  href?: string;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#556B45]">
          {eyebrow}
        </p>
        <h2 className="mt-3 font-serif text-4xl font-normal tracking-tight text-black sm:text-5xl">
          {title}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-black/55">
          {description}
        </p>
      </div>
      {href ? (
        <Link className={secondaryCompact} href={href}>
          See all
        </Link>
      ) : null}
    </div>
  );
}

function RecommendationRail({ items }: { items: BookRecommendation[] }) {
  if (items.length === 0) {
    return (
      <div className={`${card} mt-8 p-6 sm:p-8`}>
        <p className="font-serif text-2xl">Your next read is waiting.</p>
        <p className="mt-2 text-sm text-black/55">
          Browse the catalog while we prepare recommendations for you.
        </p>
        <Link className={`${primaryCompact} mt-5`} href="/books">
          Explore books
        </Link>
      </div>
    );
  }

  return (
    <div className="-mx-6 mt-8 flex gap-4 overflow-x-auto px-6 pb-4 sm:-mx-10 sm:px-10 lg:-mx-12 lg:gap-6 lg:px-12">
      {items.map((item) => (
        <BookCoverCard
          book={item.book}
          key={item.book.id_livro}
          reason={item.reason}
        />
      ))}
    </div>
  );
}

export default function ForYouHomePage({
  currentUser,
  data,
}: {
  currentUser: { username: string; is_admin: boolean };
  data: ForYouHomeData;
}) {
  const featuredReading = data.continueReading[0];

  return (
    <div className={pageBody}>
      <div className={pageContainer}>
        <SiteHeader activeHref="/home" currentUser={currentUser} />

        <main className="pb-16">
          <section className="border-b border-black/10 py-10 sm:py-16">
            <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
              <div className="max-w-3xl">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#556B45]">
                  For you
                </p>
                <h1 className="mt-4 font-serif text-5xl leading-[0.95] font-normal tracking-tight text-black sm:text-7xl">
                  Welcome back, {currentUser.username}.
                </h1>
                <p className="mt-5 max-w-xl text-sm leading-relaxed text-black/60 sm:text-base">
                  A reading feed shaped by the genres and authors you explore.
                </p>
              </div>
              <Link className={secondaryCompact} href="/library">
                Open my library
              </Link>
            </div>
          </section>

          {featuredReading ? (
            <section className="border-b border-black/10 py-12 sm:py-16">
              <SectionHeading
                description="Pick up exactly where you stopped."
                eyebrow="In progress"
                title="Continue reading"
              />
              <Link
                className={`group mt-8 grid overflow-hidden ${card} ${cardInteractive} sm:grid-cols-[190px_1fr]`}
                href={`/books/${featuredReading.book.id_livro}/read`}
              >
                <div className="relative min-h-64 overflow-hidden bg-gradient-to-br from-indigo-600 to-slate-900 sm:min-h-72">
                  {featuredReading.book.capa_url ? (
                    <Image
                      alt={`Cover of ${featuredReading.book.titulo}`}
                      className="object-cover"
                      fill
                      sizes="(max-width: 640px) 100vw, 190px"
                      src={`/api/books/${featuredReading.book.id_livro}/cover`}
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center p-7 text-white">
                      <span className="font-serif text-3xl leading-tight">
                        {featuredReading.book.titulo}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-center p-7 sm:p-10">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#556B45]">
                    {featuredReading.progressPercent}% complete
                  </p>
                  <h3 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl">
                    {featuredReading.book.titulo}
                  </h3>
                  <p className="mt-2 text-sm text-black/55">
                    {featuredReading.pagesRead} of {featuredReading.book.total_paginas} reading positions
                  </p>
                  <div className="mt-6 h-2 overflow-hidden rounded-full bg-black/10">
                    <div
                      className="h-full rounded-full bg-[#1E2E4F]"
                      style={{ width: `${featuredReading.progressPercent}%` }}
                    />
                  </div>
                  <span className="mt-7 text-sm font-semibold text-[#1E2E4F] group-hover:underline">
                    Continue reading →
                  </span>
                </div>
              </Link>
            </section>
          ) : null}

          <section className="border-b border-black/10 py-12 sm:py-16">
            <SectionHeading
              description={
                data.isColdStart
                  ? "Start with reader favorites while we learn which genres and authors you enjoy."
                  : "Selected from the genres, authors, and books in your reading activity."
              }
              eyebrow={data.isColdStart ? "Start exploring" : "Made for you"}
              href="/books"
              title="Recommended for you"
            />
            <RecommendationRail items={data.recommendations} />
          </section>

          <section className="border-b border-black/10 py-12 sm:py-16">
            <SectionHeading
              description="The books getting the most attention from readers over the last seven days."
              eyebrow="This week"
              href="/books?sort=popularity"
              title="Trending now"
            />
            <RecommendationRail items={data.trending} />
          </section>

          {data.genreShelves.length > 0 ? (
            <section className="border-b border-black/10 py-12 sm:py-16">
              <SectionHeading
                description="Jump into a category and find a different kind of story."
                eyebrow="Browse your way"
                title="Explore by genre"
              />
              <div className="mt-10 space-y-12">
                {data.genreShelves.map((shelf) => (
                  <section key={shelf.genre.id_genero}>
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="font-serif text-2xl sm:text-3xl">{shelf.genre.nome}</h3>
                      <Link
                        className="text-xs font-semibold text-[#1E2E4F] hover:underline"
                        href={`/books?genre=${encodeURIComponent(shelf.genre.nome)}`}
                      >
                        View genre →
                      </Link>
                    </div>
                    <div className="mt-5 flex gap-4 overflow-x-auto pb-4 lg:gap-6">
                      {shelf.books.map((book) => (
                        <BookCoverCard book={book} key={book.id_livro} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </section>
          ) : null}

          <section className="py-12 sm:py-16">
            <SectionHeading
              description="Recent reviews from people discovering books across LivrUSP."
              eyebrow="Community"
              title="What readers are saying"
            />
            {data.socials.length > 0 ? (
              <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {data.socials.map((activity) => (
                  <Link
                    className={`${card} ${cardInteractive} p-6`}
                    href={`/books/${activity.bookId}`}
                    key={activity.id}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold">{activity.username}</span>
                      <span className="rounded-full bg-[#FBE251]/70 px-2.5 py-1 text-xs font-bold">
                        {activity.rating}/5
                      </span>
                    </div>
                    <h3 className="mt-5 font-serif text-2xl leading-tight">
                      {activity.bookTitle}
                    </h3>
                    {activity.authorName ? (
                      <p className="mt-1 text-xs text-black/50">{activity.authorName}</p>
                    ) : null}
                    <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-black/60">
                      {activity.reviewText ?? "Rated this book."}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className={`${card} mt-8 p-6 text-sm text-black/55`}>
                Reviews from the community will appear here as readers share them.
              </div>
            )}
          </section>
        </main>

        <SiteFooter links={SIGNED_NAV_LINKS} />
      </div>
    </div>
  );
}
