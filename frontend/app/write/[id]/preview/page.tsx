import Link from "next/link";

import { getOwnedBook } from "@/app/lib/writing";
import { SIGNED_NAV_LINKS } from "@/app/lib/navigation";
import { requireUserProfile } from "@/app/lib/profile";
import { card, pageBody, pageContainer, secondaryCompact } from "@/app/lib/ui";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";

type PreviewPageProps = {
  params: Promise<{ id: string }>;
};

export default async function WritePreviewPage({ params }: PreviewPageProps) {
  const { id } = await params;
  const bookId = Number(id);
  const profile = await requireUserProfile();
  const result =
    Number.isSafeInteger(bookId) && bookId > 0 ? await getOwnedBook(bookId) : null;

  if (!result || result.status !== "ok") {
    return (
      <main className={`${pageBody} flex min-h-screen items-center justify-center px-6`}>
        <section className={`${card} p-8`}>
          <h1 className="font-serif text-3xl text-black">Draft preview unavailable.</h1>
          <p className="mt-2 text-sm text-black/60">
            {result?.status === "unavailable"
              ? result.detail
              : "This draft does not exist or belongs to another author."}
          </p>
          <Link className={`${secondaryCompact} mt-5 inline-flex`} href={`/write/${id}`}>
            Back to editor
          </Link>
        </section>
      </main>
    );
  }

  const book = result.book;
  return (
    <div className={pageBody}>
      <div className={pageContainer}>
        <SiteHeader
          activeHref="/write"
          currentUser={{
            username: profile.nome_perfil,
            is_admin: Boolean(profile.is_admin),
            id_avatar: profile.id_avatar,
            id_icone: profile.id_icone,
            profile_ring: profile.profile_ring,
            profile_avatar: profile.profile_avatar,
            nivel: profile.nivel,
          }}
        />
        <main className="mx-auto max-w-3xl space-y-8 py-8 sm:py-12">
          <header className={`p-6 sm:p-8 ${card}`}>
            <Link className="text-sm font-semibold text-[#1E2E4F] hover:underline" href={`/write/${bookId}`}>
              ← Back to editor
            </Link>
            <p className="mt-6 font-mono text-[11px] uppercase tracking-wider text-[#556B45]">
              Draft preview · {book.total_palavras.toLocaleString()} words
            </p>
            <h1 className="mt-3 font-serif text-4xl leading-tight text-black sm:text-5xl">
              {book.titulo}
            </h1>
            {book.descricao ? <p className="mt-4 text-black/65">{book.descricao}</p> : null}
          </header>

          {book.capitulos.map((chapter) => (
            <article className={`p-6 sm:p-8 ${card}`} key={chapter.id_capitulo}>
              <h2 className="font-serif text-3xl text-black">{chapter.titulo}</h2>
              <div className="mt-6 whitespace-pre-wrap font-serif text-base leading-8 text-black/85">
                {chapter.conteudo}
              </div>
            </article>
          ))}
        </main>
        <SiteFooter links={SIGNED_NAV_LINKS} />
      </div>
    </div>
  );
}
