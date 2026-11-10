import Link from "next/link";

import {
  getBookById,
  getBookReviews,
  getOptionalCurrentUser,
  getUserBookListsStatus,
} from "@/app/lib/books";
import { GUEST_NAV_LINKS, SIGNED_NAV_LINKS } from "@/app/lib/navigation";
import { card, pageBody, pageContainer } from "@/app/lib/ui";
import BookDetailsCard from "@/components/books/book-details-card";
import ReviewForm from "@/components/books/review-form";
import ReviewList from "@/components/books/review-list";
import { LivruspLogo } from "@/components/home/livrusp-logos";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";

type BookDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function BookDetailsPage({ params }: BookDetailsPageProps) {
  const { id } = await params;
  const bookId = Number(id);

  if (!Number.isInteger(bookId) || bookId <= 0) {
    return (
      <main className={`${pageBody} flex items-center justify-center px-6 py-10`}>
        <section className={`${card} w-full max-w-md p-8`}>
          <LivruspLogo className="block h-6 w-auto" />
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Invalid book link</h1>
          <p className="mt-3 text-sm text-slate-600">
            The book identifier in the URL is not valid.
          </p>
          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            <Link className="font-semibold text-[#1E2E4F] hover:text-[#15223B]" href="/">
              Back to home
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const [bookResult, reviews, currentUser, listStatus] = await Promise.all([
    getBookById(bookId),
    getBookReviews(bookId),
    getOptionalCurrentUser(),
    getUserBookListsStatus(bookId),
  ]);

  if (bookResult.status === "not_found") {
    return (
      <main className={`${pageBody} flex items-center justify-center px-6 py-10`}>
        <section className={`${card} w-full max-w-md p-8`}>
          <LivruspLogo className="block h-6 w-auto" />
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Book not found</h1>
          <p className="mt-3 text-sm text-slate-600">
            This book does not exist or is no longer available in the public catalog.
          </p>
          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            <Link className="font-semibold text-[#1E2E4F] hover:text-[#15223B]" href="/books">
              Browse books
            </Link>
            <Link className="font-semibold text-slate-600 hover:text-slate-900" href="/">
              Back to home
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (bookResult.status === "unavailable") {
    return (
      <main className={`${pageBody} flex items-center justify-center px-6 py-10`}>
        <section className={`${card} w-full max-w-md p-8`}>
          <LivruspLogo className="block h-6 w-auto" />
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Catalog unavailable</h1>
          <p className="mt-3 text-sm text-slate-600">{bookResult.detail}</p>
          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            <Link className="font-semibold text-[#1E2E4F] hover:text-[#15223B]" href="/">
              Back to home
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const { book } = bookResult;
  const existingUserReview = currentUser
    ? (reviews.find((review) => review.id_usuario === currentUser.id) ?? null)
    : null;

  const navLinks = currentUser ? SIGNED_NAV_LINKS : GUEST_NAV_LINKS;

  return (
    <div className={pageBody}>
      <div className={pageContainer}>
        <SiteHeader activeHref="/books" currentUser={currentUser} />

        <main className="space-y-8 pt-4 pb-16 sm:pt-8 sm:pb-20">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm">
            <Link className="font-medium text-black/60 hover:text-black" href="/books">
              Books
            </Link>
            <span aria-hidden="true" className="text-black/30">/</span>
            <span className="max-w-xs truncate font-medium text-black">{book.titulo}</span>
          </nav>

          <BookDetailsCard
            book={book}
            currentUser={currentUser}
            isFavorite={listStatus.isFavorite}
            isToRead={listStatus.isToRead}
            reviews={reviews}
          />

          <ReviewForm
            bookId={book.id_livro}
            currentUser={currentUser}
            existingUserReview={existingUserReview}
          />

          <ReviewList currentUser={currentUser} reviews={reviews} />
        </main>

        <SiteFooter links={navLinks} />
      </div>
    </div>
  );
}

