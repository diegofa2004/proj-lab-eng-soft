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
    <header className="grid min-h-20 grid-cols-[1fr_auto_1fr] items-center gap-x-4 gap-y-3 py-4 sm:gap-x-6">
      <Link aria-label="LivrUSP Home" className="inline-flex justify-self-start" href="/">
        <LivruspHeaderLogo />
      </Link>

      <nav
        aria-label="Primary"
        className="col-span-3 row-start-2 flex flex-wrap items-center justify-center gap-4 rounded-full bg-[#E6EBF5]/90 px-5 py-3 text-sm font-semibold text-black shadow-xs backdrop-blur-xs lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:gap-7 lg:px-8"
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

      <div className="col-start-3 row-start-1 flex justify-self-end gap-2 sm:gap-3">
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
