import type { Metadata } from "next";
import Link from "next/link";

import { getAdminAuthors, getAdminGenres } from "@/app/lib/admin";
import { SIGNED_NAV_LINKS } from "@/app/lib/navigation";
import { requireUserProfile } from "@/app/lib/profile";
import { card, pageBody, pageContainer, primaryCompact, secondaryCompact } from "@/app/lib/ui";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import PublicationForm from "@/components/publishing/publication-form";

export const metadata: Metadata = {
  title: "Publish a book · LivrUSP",
};

export default async function PublishPage() {
  const [profile, authors, genres] = await Promise.all([
    requireUserProfile(),
    getAdminAuthors(),
    getAdminGenres(),
  ]);
  const canPublish = Boolean(profile.is_admin || profile.pode_publicar);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className={pageBody}>
      <div className={pageContainer}>
        <SiteHeader
          activeHref="/publish"
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
              Publishing
            </p>
            <h1 className="mt-3 font-serif text-5xl leading-[0.98] font-normal tracking-tight text-black sm:text-6xl md:text-7xl">
              Bring a story to the catalog.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-black/60 sm:text-base">
              Publish an EPUB3 book for the LivrUSP community. You can save a draft, upload a file,
              and make it available when the metadata is ready.
            </p>
          </div>

          {canPublish ? (
            <PublicationForm authors={authors} genres={genres} today={today} />
          ) : (
            <section className={`p-6 sm:p-8 lg:p-10 ${card}`}>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#556B45]">
                Publishing access
              </p>
              <h2 className="mt-3 font-serif text-4xl leading-[0.98] tracking-tight text-black sm:text-5xl">
                This shelf is still locked.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-black/65 sm:text-base">
                Publishing is available to qualified publishers. Keep reading to reach the
                required level, or review the subscription plans for additional access.
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
          )}
        </main>

        <SiteFooter links={SIGNED_NAV_LINKS} />
      </div>
    </div>
  );
}
