import type { Metadata } from "next";
import Link from "next/link";

import { SIGNED_NAV_LINKS } from "@/app/lib/navigation";
import { requireUserProfile } from "@/app/lib/profile";
import { card, pageBody, pageContainer, primaryCompact, secondaryCompact } from "@/app/lib/ui";
import { getOwnedBook } from "@/app/lib/writing";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import WritingStudio from "@/components/writing/writing-studio";

export const metadata: Metadata = {
  title: "Writing studio · LivrUSP",
};

type WriteBookPageProps = {
  params: Promise<{ id: string }>;
};

export default async function WriteBookPage({ params }: WriteBookPageProps) {
  const { id } = await params;
  const bookId = Number(id);
  const profile = await requireUserProfile();
  const canWrite = Boolean(profile.is_admin || profile.pode_publicar || profile.is_premium);
  const validId = Number.isSafeInteger(bookId) && bookId > 0;
  const result = canWrite && validId ? await getOwnedBook(bookId) : null;

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

        <main className="space-y-6 pt-4 pb-16 sm:pt-8 sm:pb-20">
          {!canWrite ? (
            <section className={`p-6 sm:p-8 ${card}`}>
              <h1 className="font-serif text-4xl text-black sm:text-5xl">
                The writing room is locked.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-black/65">
                Writing is available to premium subscribers and qualified publishers.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link className={primaryCompact} href="/subscription">
                  See subscription plans
                </Link>
                <Link className={secondaryCompact} href="/write">
                  Back to writing studio
                </Link>
              </div>
            </section>
          ) : !validId ? (
            <p className={`p-5 text-red-700 ${card}`}>Invalid book ID.</p>
          ) : !result || result.status === "not_found" ? (
            <section className={`p-6 ${card}`}>
              <h1 className="font-serif text-4xl text-black">Book not found.</h1>
              <p className="mt-3 text-sm text-black/60">
                This draft does not exist or belongs to another author.
              </p>
              <Link className={`${secondaryCompact} mt-6 inline-flex`} href="/write">
                Back to writing studio
              </Link>
            </section>
          ) : result.status === "unavailable" ? (
            <p className={`p-5 text-red-700 ${card}`} role="alert">
              {result.detail}
            </p>
          ) : (
            <WritingStudio book={result.book} />
          )}
        </main>

        <SiteFooter links={SIGNED_NAV_LINKS} />
      </div>
    </div>
  );
}
