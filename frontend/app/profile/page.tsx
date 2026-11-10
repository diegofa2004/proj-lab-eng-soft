import type { Metadata } from "next";
import Link from "next/link";

import {
  getProfileAssets,
  getProfileDashboardStats,
  getProfileLevels,
  requireUserProfile,
} from "@/app/lib/profile";
import LogoutButton from "@/components/auth/logout-button";
import { LivruspFooterLogo, LivruspHeaderLogo } from "@/components/home/livrusp-logos";
import ProfileEditor from "@/components/profile/profile-editor";

export const metadata: Metadata = {
  title: "Profile & Editor · LivrUSP",
};

const NAV_LINKS = [
  { label: "Home", href: "/home" },
  { label: "Catalog", href: "/books" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Popular", href: "/books?sort=popularity" },
  { label: "Top Rated", href: "/books?sort=rating" },
] as const;

export default async function ProfilePage() {
  const [profile, assets, levels, stats] = await Promise.all([
    requireUserProfile(),
    getProfileAssets(),
    getProfileLevels(),
    getProfileDashboardStats(),
  ]);

  return (
    <div className="min-h-screen bg-[#D9E1F1] font-sans text-black selection:bg-[#1E2E4F] selection:text-white">
      <div className="mx-auto max-w-[1280px] px-6 sm:px-10 lg:px-12">
        {/* Top Navbar */}
        <header className="flex flex-wrap items-center justify-between gap-4 py-6">
          <Link aria-label="LivrUSP Home" className="inline-flex items-center" href="/">
            <LivruspHeaderLogo />
          </Link>

          <nav
            aria-label="Primary"
            className="order-3 flex w-full flex-wrap items-center justify-center gap-4 rounded-full bg-[#E6EBF5]/90 px-6 py-3 text-xs font-semibold text-black shadow-xs backdrop-blur-xs sm:order-2 sm:w-auto sm:gap-7 sm:px-8 sm:text-sm"
          >
            {NAV_LINKS.map((item) => (
              <Link
                className="transition hover:opacity-70"
                href={item.href}
                key={item.label}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="order-2 flex items-center gap-3 sm:order-3">
            <span className="inline-flex items-center justify-center rounded-full bg-[#24324F] px-6 py-2.5 text-xs font-semibold text-white sm:px-7 sm:py-3 sm:text-sm">
              {profile.nome_perfil}
            </span>
            <LogoutButton />
          </div>
        </header>

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

        {/* Footer */}
        <footer className="border-t border-black/10 pt-10 pb-10">
          <div>
            <nav
              aria-label="Footer"
              className="inline-flex flex-wrap items-center gap-4 rounded-full bg-[#E6EBF5]/90 px-5 py-3 text-xs font-semibold text-black shadow-xs backdrop-blur-xs sm:gap-7 sm:px-8 sm:text-sm"
            >
              {NAV_LINKS.map((item) => (
                <Link
                  className="transition hover:opacity-70"
                  href={item.href}
                  key={item.label}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="mt-12 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div className="flex flex-wrap items-baseline gap-6 sm:gap-10">
              <Link aria-label="LivrUSP Home" href="/">
                <LivruspFooterLogo />
              </Link>
              <span className="font-mono text-[11px] text-[#556B45]">
                © livrUSP. &nbsp; {new Date().getFullYear()}
              </span>
            </div>

            <p className="font-mono text-[11px] text-[#556B45]">
              All Rights Reserved
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
