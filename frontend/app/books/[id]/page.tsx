import Link from "next/link";

import {
  getBookById,
  getBookReviews,
  getOptionalCurrentUser,
  getUserBookListsStatus,
} from "@/app/lib/books";
import BookDetailsCard from "@/components/books/book-details-card";
import ReviewForm from "@/components/books/review-form";
import ReviewList from "@/components/books/review-list";

type BookDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function BookDetailsPage({ params }: BookDetailsPageProps) {
  const { id } = await params;
  const bookId = Number(id);

  if (!Number.isInteger(bookId) || bookId <= 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-10 text-slate-900">
        <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
            LivrUSP
          </p>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Invalid book link</h1>
          <p className="mt-3 text-sm text-slate-600">
            The book identifier in the URL is not valid.
          </p>
          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            <Link className="font-semibold text-indigo-600 hover:text-indigo-700" href="/">
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
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-10 text-slate-900">
        <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
            LivrUSP
          </p>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Book not found</h1>
          <p className="mt-3 text-sm text-slate-600">
            This book does not exist or is no longer available in the public catalog.
          </p>
          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            <Link className="font-semibold text-indigo-600 hover:text-indigo-700" href="/books">
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
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-10 text-slate-900">
        <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
            LivrUSP
          </p>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Catalog unavailable</h1>
          <p className="mt-3 text-sm text-slate-600">{bookResult.detail}</p>
          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            <Link className="font-semibold text-indigo-600 hover:text-indigo-700" href="/">
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

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600 hover:text-indigo-700"
              href="/"
            >
              LivrUSP
            </Link>
            <span aria-hidden="true" className="text-slate-300">
              /
            </span>
            <Link
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
              href="/books"
            >
              Books
            </Link>
            <span aria-hidden="true" className="text-slate-300">
              /
            </span>
            <span className="max-w-xs truncate text-sm font-medium text-slate-900">
              {book.titulo}
            </span>
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
      </div>
    </main>
  );
}

