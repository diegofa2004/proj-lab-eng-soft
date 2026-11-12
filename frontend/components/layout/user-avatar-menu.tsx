"use client";

import Image from "next/image";
import Link from "next/link";
import { useId } from "react";

import {
  formatProfileLevel,
  getProfileAvatar,
  getProfileRing,
  resolveAssetImageUrl,
} from "@/app/lib/profile-utils";
import LogoutButton from "@/components/auth/logout-button";

type UserAvatarMenuProps = {
  username: string;
  isAdmin: boolean;
  level?: string | null;
  profileRing?: string | null;
  profileAvatar?: string | null;
  avatarPath?: string | null;
  iconPath?: string | null;
};

type LevelStyle = {
  shell: string;
  ring: string;
  badge: string;
};

function levelStyle(level?: string | null): LevelStyle {
  const value = level?.toLocaleLowerCase() ?? "";
  if (value.includes("diamond") || value.includes("diamante")) {
    return {
      shell: "bg-gradient-to-br from-cyan-100 via-blue-100 to-violet-200",
      ring: "ring-cyan-500/75",
      badge: "border-cyan-200 bg-cyan-50",
    };
  }
  if (value.includes("platinum") || value.includes("platina")) {
    return {
      shell: "bg-gradient-to-br from-slate-100 via-slate-300 to-sky-200",
      ring: "ring-slate-500/75",
      badge: "border-slate-200 bg-slate-50",
    };
  }
  if (value.includes("gold") || value.includes("ouro")) {
    return {
      shell: "bg-gradient-to-br from-amber-100 via-yellow-200 to-orange-200",
      ring: "ring-amber-500/80",
      badge: "border-amber-200 bg-amber-50",
    };
  }
  if (value.includes("silver") || value.includes("prata")) {
    return {
      shell: "bg-gradient-to-br from-slate-100 via-slate-200 to-zinc-300",
      ring: "ring-slate-400/80",
      badge: "border-slate-200 bg-white",
    };
  }
  if (value.includes("bronze") || value.includes("bronze")) {
    return {
      shell: "bg-gradient-to-br from-orange-100 via-amber-200 to-orange-300",
      ring: "ring-orange-600/75",
      badge: "border-orange-200 bg-orange-50",
    };
  }
  if (value.includes("author") || value.includes("autor")) {
    return {
      shell: "bg-gradient-to-br from-emerald-100 via-teal-200 to-cyan-300",
      ring: "ring-teal-600/75",
      badge: "border-teal-200 bg-teal-50",
    };
  }
  return {
    shell: "bg-gradient-to-br from-[#D9E1F1] via-[#BECBE3] to-[#8EA5CB]",
    ring: "ring-[#1E2E4F]/60",
    badge: "border-[#A9B9D7] bg-[#EDF1F8]",
  };
}

function initials(username: string): string {
  const words = username.trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? `${words[0][0]}${words.at(-1)?.[0] ?? ""}` : words[0]?.slice(0, 2) ?? "U")
    .toLocaleUpperCase();
}

export default function UserAvatarMenu({
  username,
  isAdmin,
  level,
  profileRing,
  profileAvatar,
  avatarPath,
  iconPath,
}: UserAvatarMenuProps) {
  const menuId = useId();
  const style = levelStyle(level);
  const selectedRing = getProfileRing(profileRing);
  const selectedAvatar = getProfileAvatar(profileAvatar);
  const avatarUrl = avatarPath ? resolveAssetImageUrl(avatarPath) : "";
  const iconUrl = iconPath ? resolveAssetImageUrl(iconPath) : "";

  return (
    <details className="group relative">
      <summary
        aria-controls={menuId}
        className="flex cursor-pointer list-none items-center gap-2.5 rounded-full p-1 outline-none transition hover:bg-white/65 focus-visible:ring-2 focus-visible:ring-[#1E2E4F] focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden"
      >
        <span
          aria-label={`Open ${username}'s menu`}
          className={`relative grid h-12 w-12 place-items-center overflow-visible rounded-full p-0.5 shadow-sm ${
            selectedRing ? "" : `ring-2 ring-offset-2 ring-offset-[#FBFAF7] ${style.ring}`
          } ${style.shell}`}
        >
          {selectedRing ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -inset-1 z-10 block h-14 w-14 overflow-hidden rounded-full"
            >
              <Image
                alt=""
                className="h-full w-full scale-[1.08]"
                height={56}
                src={selectedRing.src}
                unoptimized
                width={56}
              />
            </span>
          ) : null}
          <span className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-[#F7F4EE] text-sm font-bold text-[#1E2E4F]">
            {selectedAvatar ? (
              <Image
                alt=""
                className="h-full w-full object-cover"
                height={176}
                src={selectedAvatar.src}
                unoptimized
                width={176}
              />
            ) : avatarUrl ? (
              // The asset proxy validates backend-owned image paths.
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="" className="h-full w-full object-cover" src={avatarUrl} />
            ) : (
              initials(username)
            )}
          </span>
          {iconUrl ? (
            <span
              className={`absolute -right-2 -bottom-1 z-20 grid h-5 w-5 place-items-center overflow-hidden rounded-full border shadow-sm ${style.badge}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" className="h-3.5 w-3.5 object-contain" src={iconUrl} />
            </span>
          ) : null}
        </span>
        <span className="hidden max-w-32 truncate text-sm font-semibold text-[#1E2E4F] sm:block">
          {username}
        </span>
      </summary>

      <div
        className="absolute right-0 z-50 mt-3 w-64 overflow-hidden rounded-2xl border border-black/10 bg-[#FFFEFC] p-2 shadow-xl"
        id={menuId}
      >
        <div className="border-b border-black/8 px-3 py-2.5">
          <p className="truncate text-sm font-semibold text-black">{username}</p>
          <p className="mt-0.5 text-xs text-black/55">{formatProfileLevel(level)}</p>
        </div>
        <nav aria-label="User menu" className="py-1">
          <Link className="block rounded-xl px-3 py-2 text-sm text-black/75 hover:bg-[#E6EBF5]" href="/profile">
            Profile
          </Link>
          <Link className="block rounded-xl px-3 py-2 text-sm text-black/75 hover:bg-[#E6EBF5]" href="/library">
            Library
          </Link>
          <Link className="block rounded-xl px-3 py-2 text-sm text-black/75 hover:bg-[#E6EBF5]" href="/dashboard">
            Dashboard
          </Link>
          {isAdmin ? (
            <Link className="block rounded-xl px-3 py-2 text-sm font-semibold text-[#1E2E4F] hover:bg-[#E6EBF5]" href="/admin">
              Administration
            </Link>
          ) : null}
        </nav>
        <div className="border-t border-black/8 px-1 pt-2">
          <LogoutButton className="w-full rounded-xl border-0 px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50" />
        </div>
      </div>
    </details>
  );
}
