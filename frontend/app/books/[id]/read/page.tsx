import Link from "next/link";

import { getBookById, getOptionalCurrentUser } from "@/app/lib/books";
import EpubReader from "@/components/books/epub-reader";

type ReaderPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReaderPage({ params }: ReaderPageProps) {
  const { id } = await params;
  const bookId = Number(id);
  const bookResult = Number.isSafeInteger(bookId) && bookId > 0
    ? await getBookById(bookId)
    : { status: "not_found" as const };

  if (bookResult.status !== "ok") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6 text-slate-900">
        <div className="rounded-xl bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold">Book unavailable</h1>
          <p className="mt-2 text-slate-600">
            {bookResult.status === "unavailable"
              ? bookResult.detail
              : "This book is not available in the public catalog."}
          </p>
          <Link className="mt-5 inline-block text-indigo-700 hover:underline" href="/books">
            Browse books
          </Link>
        </div>
      </main>
    );
  }

  const currentUser = await getOptionalCurrentUser();
  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <EpubReader
        bookId={bookResult.book.id_livro}
        title={bookResult.book.titulo}
        userId={currentUser?.id ?? null}
      />
    </main>
  );
}
