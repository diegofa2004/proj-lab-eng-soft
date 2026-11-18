import type { Metadata } from "next";
import Link from "next/link";

import { PUBLICATION_STATUS_LABELS } from "@/app/lib/book-presentation";
import { SIGNED_NAV_LINKS } from "@/app/lib/navigation";
import { requireUserProfile } from "@/app/lib/profile";
import {
  card,
  cardInteractive,
  pageBody,
  pageContainer,
  primaryCompact,
  secondaryCompact,
} from "@/app/lib/ui";
import { getOwnedBooks } from "@/app/lib/writing";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import NewStoryForm from "@/components/writing/new-story-form";

export const metadata: Metadata = {
  title: "Writing studio · LivrUSP",
};

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unknown"
    : new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date);
}

export default async function WritePage() {
  const profile = await requireUserProfile();
  const canWrite = Boolean(profile.is_admin || profile.pode_publicar || profile.is_premium);
  const owned = canWrite ? await getOwnedBooks() : null;
  const today = new Date().toISOString().slice(0, 10);

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

        <main className="space-y-8 pt-4 pb-16 sm:pt-8 sm:pb-20">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-[#556B45]">
              Writing studio
            </p>
            <h1 className="mt-3 font-serif text-5xl leading-[0.98] font-normal tracking-tight text-black sm:text-6xl md:text-7xl">
              Write it chapter by chapter.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-black/60 sm:text-base">
              Draft a story, autosave as you write, preview the generated EPUB, and publish when
              the manuscript is ready.
            </p>
          </div>

          {!canWrite ? (
            <section className={`p-6 sm:p-8 lg:p-10 ${card}`}>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#556B45]">
                Writing access
              </p>
              <h2 className="mt-3 font-serif text-4xl leading-[0.98] tracking-tight text-black sm:text-5xl">
                The writing room is locked.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-black/65 sm:text-base">
                Writing is available to premium subscribers and qualified publishers. Review the
                plans or keep reading to unlock publishing access.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link className={primaryCompact} href="/subscription">
                  See subscription plans
                </Link>
                <Link className={secondaryCompact} href="/profile">
                  View your profile
                </Link>
              </div>
            </section>
          ) : (
            <>
              <NewStoryForm today={today} />

              {owned?.status === "unavailable" ? (
                <p className={`p-5 text-sm text-red-700 ${card}`} role="alert">
                  {owned.detail}
                </p>
              ) : owned?.books.length === 0 ? (
                <p className={`p-6 text-sm text-black/60 ${card}`}>
                  No stories yet. Start with a working title above.
                </p>
              ) : (
                <section className="grid gap-4 sm:grid-cols-2">
                  {owned?.books.map((book) => (
                    <Link
                      className={`p-5 ${card} ${cardInteractive}`}
                      href={`/write/${book.id_livro}`}
                      key={book.id_livro}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-[#1E2E4F]/20 bg-[#D9E1F1] px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#1E2E4F]">
                          {PUBLICATION_STATUS_LABELS[book.status_publicacao]}
                        </span>
                        {book.tem_epub ? (
                          <span className="rounded-full border border-[#556B45]/30 bg-[#556B45]/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#3A4B2E]">
                            EPUB ready
                          </span>
                        ) : null}
                      </div>
                      <h2 className="mt-3 truncate text-2xl font-bold tracking-tight text-black">
                        {book.titulo}
                      </h2>
                      <p className="mt-2 text-sm text-black/55">
                        {book.total_capitulos} chapters · {book.total_palavras.toLocaleString()}{" "}
                        words
                      </p>
                      <p className="mt-1 text-xs text-black/45">
                        Updated {formatDate(book.atualizado_em)}
                      </p>
                    </Link>
                  ))}
                </section>
              )}
            </>
          )}
        </main>

        <SiteFooter links={SIGNED_NAV_LINKS} />
      </div>
    </div>
  );
}
