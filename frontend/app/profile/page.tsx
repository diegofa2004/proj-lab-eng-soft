import type { Metadata } from "next";

import {
  getProfileAssets,
  getProfileDashboardStats,
  getProfileLevels,
  requireUserProfile,
} from "@/app/lib/profile";
import { SIGNED_NAV_LINKS } from "@/app/lib/navigation";
import { pageBody, pageContainer } from "@/app/lib/ui";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import ProfileEditor from "@/components/profile/profile-editor";

export const metadata: Metadata = {
  title: "Profile & Editor · LivrUSP",
};

export default async function ProfilePage() {
  const [profile, assets, levels, stats] = await Promise.all([
    requireUserProfile(),
    getProfileAssets(),
    getProfileLevels(),
    getProfileDashboardStats(),
  ]);

  return (
    <div className={pageBody}>
      <div className={pageContainer}>
        <SiteHeader
          activeHref="/profile"
          assets={assets}
          currentUser={{
            username: profile.nome_perfil,
            is_admin: Boolean(profile.is_admin),
            id_avatar: profile.id_avatar,
            id_icone: profile.id_icone,
            nivel: profile.nivel,
          }}
        />

        <main className="space-y-10 pt-4 pb-16 sm:pt-8 sm:pb-20">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-[#556B45]">
              Account &amp; Customization
            </p>
            <h1 className="mt-3 font-serif text-5xl leading-[0.98] font-normal tracking-tight text-black sm:text-6xl md:text-7xl">
              Your profile.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-black/60 sm:text-base">
              Customize your reader card, update your biography, and equip avatars and badge icons unlocked along your reading journey.
            </p>
          </div>

          <ProfileEditor
            assets={assets}
            initialProfile={profile}
            levels={levels}
            stats={stats}
          />
        </main>

        <SiteFooter links={SIGNED_NAV_LINKS} />
      </div>
    </div>
  );
}
