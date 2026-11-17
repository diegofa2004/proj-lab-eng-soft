import Link from "next/link";

import { requireUserProfile } from "@/app/lib/profile";
import { card, pageBody, secondaryCompact } from "@/app/lib/ui";
import { getOwnedBook } from "@/app/lib/writing";
import EpubReader from "@/components/books/epub-reader";

type PreviewPageProps = {
  params: Promise<{ id: string }>;
};

export default async function WritePreviewPage({ params }: PreviewPageProps) {
  const { id } = await params;
  const bookId = Number(id);
  const profile = await requireUserProfile();
  const result =
    Number.isSafeInteger(bookId) && bookId > 0 ? await getOwnedBook(bookId) : null;

  if (!result || result.status === "not_found") {
    return (
      <main className={`${pageBody} flex items-center justify-center px-6`}>
        <div className={`${card} p-8`}>
          <h1 className="font-serif text-3xl text-black">Draft not found.</h1>
          <p className="mt-2 text-sm text-black/60">
            This draft does not exist or belongs to another author.
          </p>
          <Link className={`${secondaryCompact} mt-5 inline-flex`} href="/write">
            Back to writing studio
          </Link>
        </div>
      </main>
    );
  }

  if (result.status === "unavailable") {
    return (
      <main className={`${pageBody} flex items-center justify-center px-6`}>
        <p className={`${card} p-8 text-red-700`} role="alert">
          {result.detail}
        </p>
      </main>
    );
  }

  return (
    <main className={pageBody}>
      <EpubReader
        backHref={`/write/${bookId}`}
        backLabel="← Back to editor"
        bookId={result.book.id_livro}
        title={result.book.titulo}
        totalPages={result.book.total_paginas}
        userId={profile.id_usuario}
      />
    </main>
  );
}
