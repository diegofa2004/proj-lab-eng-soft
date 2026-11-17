import Image from "next/image";
import Link from "next/link";

import type {
  BookSearchResult,
  Review,
  SignedHomeData,
  SocialActivityItem,
} from "@/app/lib/books";
import { SIGNED_NAV_LINKS } from "@/app/lib/navigation";
import { getProfileRing } from "@/app/lib/profile-utils";
import { card, cardInteractive, pageBody, pageContainer } from "@/app/lib/ui";
import BookCoverCard from "@/components/books/book-cover-card";
import { StarRatingDisplay } from "@/components/books/star-rating";
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

function getInitials(username: string): string {
  const words = username.trim().split(/[\s._-]+/).filter(Boolean);
  if (words.length > 1) {
    return `${words[0][0]}${words.at(-1)?.[0] ?? ""}`.toLocaleUpperCase();
  }
  return (words[0]?.slice(0, 2) ?? "U").toLocaleUpperCase();
}

function ReviewerAvatar({ item }: { item: SocialActivityItem }) {
  const selectedRing = getProfileRing(item.profileRing);

  return (
    <span
      className={`relative grid h-12 w-12 shrink-0 place-items-center overflow-visible rounded-full bg-gradient-to-br from-[#D9E1F1] via-[#BECBE3] to-[#8EA5CB] p-0.5 shadow-sm ${
        selectedRing ? "" : "ring-2 ring-[#1E2E4F]/60 ring-offset-2 ring-offset-[#E6EBF5]"
      }`}
    >
      {selectedRing ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-1 z-10 block h-14 w-14 overflow-hidden rounded-full"
        >
          <Image
            alt=""
            className="h-full w-full scale-[1.08]"
            height={56}
            src={selectedRing.src}
            unoptimized
            width={56}
          />
        </span>
      ) : null}
      <span className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-[#F7F4EE] text-xs font-bold text-[#1E2E4F]">
        {item.avatarUrl ? (
          <Image
            alt={`${item.username}'s avatar`}
            className="h-full w-full object-cover"
            height={48}
            src={item.avatarUrl}
            unoptimized
            width={48}
          />
        ) : (
          <span aria-hidden="true">{getInitials(item.username)}</span>
        )}
      </span>
    </span>
  );
}

function BookShelfSection({
  id,
  title,
  books,
  emptyLabel,
  badgesByBookId,
  reviewsByBookId,
}: {
  id: string;
  title: string;
  books: BookSearchResult[];
  emptyLabel: string;
  badgesByBookId?: Map<number, string>;
  reviewsByBookId?: Map<number, Review>;
}) {
  return (
    <section className="py-10 sm:py-14" id={id}>
      <h2 className="font-serif text-4xl font-normal tracking-tight text-black sm:text-5xl md:text-6xl">
        {title}
      </h2>

      {books.length > 0 ? (
        <div className="mt-8 flex flex-wrap gap-6 sm:mt-10 sm:gap-8">
          {books.map((book) => {
            const review = reviewsByBookId?.get(book.id_livro);

            return (
              <BookCoverCard
                badgeText={badgesByBookId?.get(book.id_livro)}
                book={book}
                key={book.id_livro}
                review={
                  review ? { rating: review.nota, text: review.texto_revisao } : undefined
                }
              />
            );
          })}
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
  activeHref = "/library",
}: {
  currentUser: { id?: number; username: string; is_admin: boolean };
  data: SignedHomeData;
  activeHref?: string;
}) {
  const reviewBadges = new Map<number, string>();
  const reviewsByBookId = new Map<number, Review>();
  const reviewedBooks: BookSearchResult[] = [];
  const seenReviewBookIds = new Set<number>();

  for (const { book, review } of data.myReviews) {
    if (!seenReviewBookIds.has(book.id_livro)) {
      seenReviewBookIds.add(book.id_livro);
      reviewedBooks.push(book);
      reviewBadges.set(book.id_livro, `${review.nota}/5`);
      reviewsByBookId.set(book.id_livro, review);
    }
  }

  const friendSocials = data.socials.filter(
    (item) =>
      (currentUser.id === undefined || item.userId !== currentUser.id) &&
      item.username !== currentUser.username,
  );

  return (
    <div className={pageBody}>
      <div className={pageContainer}>
        <SiteHeader activeHref={activeHref} currentUser={currentUser} />

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
            reviewsByBookId={reviewsByBookId}
            title="My Reviews"
          />

          {/* Socials */}
          <section className="pt-10 pb-12 sm:pt-14 sm:pb-20" id="socials">
            <h2 className="font-serif text-4xl font-normal tracking-tight text-black sm:text-5xl md:text-6xl">
              Socials
            </h2>

            {friendSocials.length > 0 ? (
              <div className="mt-8 grid grid-cols-1 gap-6 sm:mt-10 sm:grid-cols-2 lg:grid-cols-3">
                {friendSocials.map((item) => (
                  <article
                    className={`flex flex-col ${card} ${cardInteractive} p-6`}
                    key={item.id}
                  >
                    <div className="mb-4">
                      <ReviewerAvatar item={item} />
                    </div>
                    <h3 className="font-serif text-lg font-normal text-black sm:text-xl">
                      {item.username}
                    </h3>
                    <div className="mt-3 space-y-2 text-xs leading-relaxed text-black/65 sm:text-sm">
                      <p>
                        <Link
                          className="font-semibold text-[#1E2E4F] transition hover:text-black hover:underline"
                          href={`/books/${item.bookId}`}
                        >
                          {item.bookTitle}
                          {item.authorName ? ` - ${item.authorName}` : ""}
                        </Link>
                      </p>
                      <div className="flex items-center gap-2">
                        <StarRatingDisplay rating={item.rating} size="sm" />
                        <span className="font-serif text-base leading-none font-bold text-[#1E2E4F]">
                          {item.rating}/5
                        </span>
                      </div>
                      {item.reviewText ? (
                        <p className="line-clamp-3 text-black/70">{item.reviewText}</p>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-8 grid grid-cols-1 gap-6 sm:mt-10 sm:grid-cols-3 sm:gap-8">
                <div className={`flex flex-col ${card} p-6`}>
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

