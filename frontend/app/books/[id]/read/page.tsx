import Link from "next/link";

import { getBookById, getOptionalCurrentUser } from "@/app/lib/books";
import { card, pageBody } from "@/app/lib/ui";
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
      <main className={`${pageBody} flex items-center justify-center px-6`}>
        <div className={`${card} p-8`}>
          <h1 className="text-xl font-semibold">Book unavailable</h1>
          <p className="mt-2 text-slate-600">
            {bookResult.status === "unavailable"
              ? bookResult.detail
              : "This book is not available in the public catalog."}
          </p>
          <Link className="mt-5 inline-block text-[#1E2E4F] hover:underline" href="/books">
            Browse books
          </Link>
        </div>
      </main>
    );
  }

  const currentUser = await getOptionalCurrentUser();
  return (
    <main className={pageBody}>
      <EpubReader
        bookId={bookResult.book.id_livro}
        title={bookResult.book.titulo}
        totalPages={bookResult.book.total_paginas}
        userId={currentUser?.id ?? null}
      />
    </main>
  );
}
