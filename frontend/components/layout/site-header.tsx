import Link from "next/link";

import {
  GUEST_NAV_LINKS,
  SIGNED_NAV_LINKS,
  type NavLink,
} from "@/app/lib/navigation";
import { getProfileAssets } from "@/app/lib/profile";
import { primaryPill, secondaryPill } from "@/app/lib/ui";
import { LivruspHeaderLogo } from "@/components/home/livrusp-logos";
import UserAvatarMenu from "@/components/layout/user-avatar-menu";

type SiteHeaderProps = {
  currentUser?: {
    username: string;
    is_admin: boolean;
    id_avatar?: number | null;
    id_icone?: number | null;
    nivel?: string | null;
  } | null;
  activeHref?: string;
  assets?: { id_asset: number; arquivo: string }[];
};

function isActive(link: NavLink, activeHref?: string): boolean {
  if (!activeHref) return false;
  return link.href === activeHref;
}

export default async function SiteHeader({
  currentUser = null,
  activeHref,
  assets = [],
}: SiteHeaderProps) {
  const links = currentUser ? SIGNED_NAV_LINKS : GUEST_NAV_LINKS;
  const profileAssets = currentUser && assets.length === 0 ? await getProfileAssets() : assets;

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 py-6">
      <Link aria-label="LivrUSP Home" className="inline-flex items-center" href="/">
        <LivruspHeaderLogo />
      </Link>

      <nav
        aria-label="Primary"
        className="order-3 flex w-full flex-wrap items-center justify-center gap-4 rounded-full bg-[#E6EBF5]/90 px-5 py-3 text-xs font-semibold text-black shadow-xs backdrop-blur-xs sm:order-2 sm:w-auto sm:gap-7 sm:px-8 sm:text-sm"
      >
        {links.map((item) => (
          <Link
            aria-current={isActive(item, activeHref) ? "page" : undefined}
            className={`transition hover:opacity-70 ${
              isActive(item, activeHref) ? "underline decoration-2 underline-offset-4" : ""
            }`}
            href={item.href}
            key={item.label}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="order-2 flex items-center gap-2 sm:order-3 sm:gap-3">
        {currentUser ? (
          <>
            <UserAvatarMenu
              avatarPath={
                profileAssets.find((asset) => asset.id_asset === currentUser.id_avatar)?.arquivo
              }
              iconPath={
                profileAssets.find((asset) => asset.id_asset === currentUser.id_icone)?.arquivo
              }
              isAdmin={currentUser.is_admin}
              level={currentUser.nivel}
              username={currentUser.username}
            />
          </>
        ) : (
          <>
            <Link className={secondaryPill} href="/login">
              Sign in
            </Link>
            <Link className={primaryPill} href="/signup">
              Sign up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
