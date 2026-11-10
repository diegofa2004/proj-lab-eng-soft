"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type SyntheticEvent, useMemo, useState } from "react";

import {
  getAssetLockState,
  MAX_BIOGRAPHY_LENGTH,
  resolveAssetImageUrl,
  type ProfileAsset,
  type ProfileDashboardStats,
  type ProfileLevel,
  type UserProfile,
} from "@/app/lib/profile-utils";
import LogoutButton from "@/components/auth/logout-button";

type FormStatus = "idle" | "submitting" | "success" | "error";

type ProfileEditorProps = {
  initialProfile: UserProfile;
  assets: ProfileAsset[];
  levels: ProfileLevel[];
  stats: ProfileDashboardStats;
};

const labelClassName =
  "block font-mono text-[11px] font-semibold uppercase tracking-wider text-[#556B45]";
const fieldClassName =
  "mt-1.5 block w-full rounded-xl border border-black/15 bg-white px-3.5 py-2.5 text-sm text-black shadow-2xs outline-none transition placeholder:text-black/40 hover:border-[#1E2E4F]/50 focus:border-[#1E2E4F] focus:ring-2 focus:ring-[#82A7D5]/50";

function getInitials(name: string): string {
  const cleaned = name.trim();
  if (!cleaned) {
    return "LU";
  }

  const parts = cleaned.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
}

function formatReadingTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0m";
  }
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function AssetGraphic({
  asset,
  fallbackText,
  sizeClassName = "h-14 w-14",
}: {
  asset: ProfileAsset | null;
  fallbackText: string;
  sizeClassName?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const resolvedUrl = asset ? resolveAssetImageUrl(asset.arquivo) : "";
  const showImage = Boolean(asset && resolvedUrl && failedSrc !== resolvedUrl);

  if (showImage && asset) {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl border border-black/10 bg-[#1E2E4F]/10 ${sizeClassName}`}
      >
        <Image
          alt={asset.nome}
          className="h-full w-full object-cover"
          height={96}
          onError={() => setFailedSrc(resolvedUrl)}
          src={resolvedUrl}
          unoptimized
          width={96}
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`flex items-center justify-center rounded-2xl border border-black/15 bg-[#1E2E4F] font-serif text-xl font-normal tracking-tight text-[#F7F3E8] shadow-xs ${sizeClassName}`}
    >
      {fallbackText}
    </div>
  );
}

export default function ProfileEditor({
  initialProfile,
  assets,
  levels,
  stats,
}: ProfileEditorProps) {
  const router = useRouter();
  const [savedProfile, setSavedProfile] = useState<UserProfile>(initialProfile);
  const [biografia, setBiografia] = useState<string>(initialProfile.biografia ?? "");
  const [selectedAvatarId, setSelectedAvatarId] = useState<number | null>(
    initialProfile.id_avatar ?? null,
  );
  const [selectedIconId, setSelectedIconId] = useState<number | null>(
    initialProfile.id_icone ?? null,
  );
  const [formStatus, setFormStatus] = useState<FormStatus>("idle");
  const [message, setMessage] = useState<string>("");

  const avatarAssets = useMemo(
    () => assets.filter((asset) => asset.tipo === "avatar"),
    [assets],
  );
  const iconAssets = useMemo(
    () => assets.filter((asset) => asset.tipo === "icone"),
    [assets],
  );

  const selectedAvatarAsset = useMemo(
    () => avatarAssets.find((item) => item.id_asset === selectedAvatarId) ?? null,
    [avatarAssets, selectedAvatarId],
  );
  const selectedIconAsset = useMemo(
    () => iconAssets.find((item) => item.id_asset === selectedIconId) ?? null,
    [iconAssets, selectedIconId],
  );

  const nextLevel = useMemo(() => {
    const sorted = [...levels].sort((a, b) => a.pontos_minimos - b.pontos_minimos);
    return (
      sorted.find((level) => level.pontos_minimos > savedProfile.pontos_leitura) ?? null
    );
  }, [levels, savedProfile.pontos_leitura]);

  const hasChanges =
    biografia !== (savedProfile.biografia ?? "") ||
    selectedAvatarId !== (savedProfile.id_avatar ?? null) ||
    selectedIconId !== (savedProfile.id_icone ?? null);

  const isSubmitting = formStatus === "submitting";
  const remainingChars = MAX_BIOGRAPHY_LENGTH - biografia.length;
  const userInitials = getInitials(savedProfile.nome_perfil);

  function handleReset() {
    setBiografia(savedProfile.biografia ?? "");
    setSelectedAvatarId(savedProfile.id_avatar ?? null);
    setSelectedIconId(savedProfile.id_icone ?? null);
    setFormStatus("idle");
    setMessage("");
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    if (biografia.length > MAX_BIOGRAPHY_LENGTH) {
      setFormStatus("error");
      setMessage(`Biography must be at most ${MAX_BIOGRAPHY_LENGTH} characters long.`);
      return;
    }

    setFormStatus("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          biografia,
          id_avatar: selectedAvatarId,
          id_icone: selectedIconId,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | (UserProfile & { detail?: unknown })
        | { detail?: unknown }
        | null;

      if (!response.ok) {
        const errorDetail =
          data && typeof data.detail === "string"
            ? data.detail
            : "Could not save your profile changes. Please try again.";
        setFormStatus("error");
        setMessage(errorDetail);
        return;
      }

      if (data && "id_usuario" in data) {
        setSavedProfile(data);
        setBiografia(data.biografia ?? "");
        setSelectedAvatarId(data.id_avatar ?? null);
        setSelectedIconId(data.id_icone ?? null);
      } else {
        setSavedProfile((prev) => ({
          ...prev,
          biografia,
          id_avatar: selectedAvatarId,
          id_icone: selectedIconId,
        }));
      }

      setFormStatus("success");
      setMessage("Your profile has been updated.");
      router.refresh();
    } catch {
      setFormStatus("error");
      setMessage("Unable to reach the profile service. Please try again.");
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
      {/* Left Column: Live Reader Card & Account Overview */}
      <aside aria-label="Reader profile preview" className="space-y-6 lg:col-span-5">
        <section className="rounded-[28px] border border-black/10 bg-[#E6EBF5]/90 p-6 shadow-xs backdrop-blur-xs sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#556B45]">
              Reader Card Preview
            </span>
            {hasChanges ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-700/25 bg-amber-100/80 px-3 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-900">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                Unsaved preview
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-[#556B45]/25 bg-white/70 px-3 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#556B45]">
                Synced
              </span>
            )}
          </div>

          {/* Avatar + Identity */}
          <div className="mt-6 flex items-start gap-5">
            <div className="relative shrink-0">
              <AssetGraphic
                asset={selectedAvatarAsset}
                fallbackText={userInitials}
                sizeClassName="h-20 w-20 sm:h-24 sm:w-24 text-2xl sm:text-3xl"
              />
              {selectedIconAsset ? (
                <div
                  className=" -bottom-2 -right-2 absolute flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-[#E6EBF5] bg-white shadow-sm"
                  title={`Icon: ${selectedIconAsset.nome}`}
                >
                  <AssetGraphic
                    asset={selectedIconAsset}
                    fallbackText="★"
                    sizeClassName="h-full w-full rounded-full border-0 text-xs"
                  />
                </div>
              ) : null}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate font-serif text-3xl leading-tight font-normal tracking-tight text-black sm:text-4xl">
                  {savedProfile.nome_perfil}
                </h2>
              </div>
              <p className="mt-1 truncate font-mono text-xs text-black/60">
                {savedProfile.email}
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center rounded-full border border-[#1E2E4F]/20 bg-[#D9E1F1] px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#1E2E4F]">
                  Level · {savedProfile.nivel ?? "Leitor"}
                </span>
                {savedProfile.is_premium ? (
                  <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-100/90 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-900">
                    ★ Premium
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full border border-black/10 bg-white/80 px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-black/65">
                    Standard Plan
                  </span>
                )}
                {savedProfile.pode_publicar ? (
                  <span className="inline-flex items-center rounded-full border border-[#556B45]/30 bg-[#556B45]/15 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#3A4B2E]">
                    Publisher
                  </span>
                ) : null}
                {savedProfile.is_admin ? (
                  <span className="inline-flex items-center rounded-full border border-[#1E2E4F] bg-[#1E2E4F] px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-white">
                    Admin
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Equipped cosmetics summary */}
          <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl border border-black/10 bg-white/70 p-3.5 text-xs">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#556B45]">
                Avatar
              </span>
              <p className="mt-0.5 truncate font-semibold text-[#1E2E4F]">
                {selectedAvatarAsset ? selectedAvatarAsset.nome : "Default monogram"}
              </p>
            </div>
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#556B45]">
                Badge Icon
              </span>
              <p className="mt-0.5 truncate font-semibold text-[#1E2E4F]">
                {selectedIconAsset ? selectedIconAsset.nome : "No icon equipped"}
              </p>
            </div>
          </div>

          {/* Live Biography Preview */}
          <div className="mt-6 border-t border-black/10 pt-5">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#556B45]">
              Biography
            </span>
            {biografia.trim().length > 0 ? (
              <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-black/80">
                {biografia}
              </p>
            ) : (
              <p className="mt-2 italic text-sm leading-relaxed text-black/45">
                No biography written yet. Share your favorite books, genres, or reading goals in the editor.
              </p>
            )}
          </div>

          {/* Reading Progress & Points Summary */}
          <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-black/10 pt-5 text-center">
            <div className="rounded-2xl border border-black/10 bg-white/75 px-3 py-3">
              <dt className="font-mono text-[10px] uppercase tracking-wider text-[#556B45]">
                Points
              </dt>
              <dd className="mt-1 font-serif text-2xl leading-none text-black">
                {savedProfile.pontos_leitura}
              </dd>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white/75 px-3 py-3">
              <dt className="font-mono text-[10px] uppercase tracking-wider text-[#556B45]">
                Books Read
              </dt>
              <dd className="mt-1 font-serif text-2xl leading-none text-black">
                {stats.booksCompleted}
              </dd>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white/75 px-3 py-3">
              <dt className="font-mono text-[10px] uppercase tracking-wider text-[#556B45]">
                Pages
              </dt>
              <dd className="mt-1 font-serif text-2xl leading-none text-black">
                {stats.pagesRead}
              </dd>
            </div>
          </dl>

          {nextLevel ? (
            <div className="mt-4 rounded-2xl border border-black/10 bg-[#D9E1F1]/75 px-4 py-3 text-xs text-black/75">
              <div className="flex items-center justify-between gap-2 font-mono text-[11px]">
                <span className="font-semibold text-[#1E2E4F]">
                  Next level: {nextLevel.nome}
                </span>
                <span className="text-[#556B45]">
                  {Math.max(0, savedProfile.pontos_leitura)} / {nextLevel.pontos_minimos} pts
                </span>
              </div>
              <div
                aria-hidden="true"
                className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/80"
              >
                <div
                  className="h-full rounded-full bg-[#1E2E4F] transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        0,
                        Math.round(
                          (Math.max(0, savedProfile.pontos_leitura) /
                            Math.max(1, nextLevel.pontos_minimos)) *
                            100,
                        ),
                      ),
                    )}%`,
                  }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-black/60">
                Earn {Math.max(0, nextLevel.pontos_minimos - savedProfile.pontos_leitura)} more{" "}
                {nextLevel.pontos_minimos - savedProfile.pontos_leitura === 1
                  ? "point"
                  : "points"}{" "}
                by completing books to unlock {nextLevel.nome}
                {nextLevel.permite_publicar ? " and book publishing" : ""}.
              </p>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-5">
            <Link
              className="text-xs font-semibold text-[#1E2E4F] transition hover:underline sm:text-sm"
              href="/home"
            >
              ← Back to my shelves
            </Link>
            <LogoutButton />
          </div>
        </section>
      </aside>

      {/* Right Column: Profile Editor Form */}
      <section
        aria-labelledby="profile-editor-heading"
        className="rounded-[28px] border border-black/10 bg-[#E6EBF5]/90 p-6 shadow-xs backdrop-blur-xs sm:p-8 lg:col-span-7"
      >
        <div className="border-b border-black/10 pb-5">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#556B45]">
            Profile Editor
          </p>
          <h2
            className="mt-2 font-serif text-3xl font-normal tracking-tight text-black sm:text-4xl"
            id="profile-editor-heading"
          >
            Edit your reader profile
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-black/65">
            Update your public biography and choose how your profile appears across reviews and community shelves.
          </p>
        </div>

        <form className="mt-6 space-y-8" noValidate onSubmit={handleSubmit}>
          {/* Read-only Account Credentials */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClassName} htmlFor="profile-username">
                Username
              </label>
              <input
                className={`${fieldClassName} cursor-not-allowed bg-white/60 text-black/70`}
                disabled
                id="profile-username"
                readOnly
                type="text"
                value={savedProfile.nome_perfil}
              />
              <p className="mt-1 font-mono text-[11px] text-black/50">
                Unique public handle (#{savedProfile.id_usuario})
              </p>
            </div>

            <div>
              <label className={labelClassName} htmlFor="profile-email">
                Email address
              </label>
              <input
                className={`${fieldClassName} cursor-not-allowed bg-white/60 text-black/70`}
                disabled
                id="profile-email"
                readOnly
                type="email"
                value={savedProfile.email}
              />
              <p className="mt-1 font-mono text-[11px] text-black/50">
                Private · never shown on public profiles
              </p>
            </div>
          </div>

          {/* Biography Input */}
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <label className={labelClassName} htmlFor="profile-biography">
                Biography
              </label>
              <span
                className={`font-mono text-[11px] ${
                  remainingChars < 200 ? "font-semibold text-amber-800" : "text-[#556B45]"
                }`}
              >
                {biografia.length} / {MAX_BIOGRAPHY_LENGTH} characters
              </span>
            </div>

            <textarea
              className={`${fieldClassName} min-h-[140px] resize-y leading-relaxed`}
              id="profile-biography"
              maxLength={MAX_BIOGRAPHY_LENGTH}
              name="biografia"
              onChange={(event) => {
                setBiografia(event.target.value);
                if (formStatus !== "idle") {
                  setFormStatus("idle");
                  setMessage("");
                }
              }}
              placeholder="Tell fellow readers about your favorite genres, authors, or what you are currently reading..."
              rows={5}
              value={biografia}
            />

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-black/60">
                Shown on your public reader profile. Leave blank if you prefer not to display a bio.
              </p>
              {biografia.length > 0 ? (
                <button
                  className="font-mono text-[11px] font-semibold text-[#1E2E4F] transition hover:underline"
                  onClick={() => {
                    setBiografia("");
                    if (formStatus !== "idle") {
                      setFormStatus("idle");
                      setMessage("");
                    }
                  }}
                  type="button"
                >
                  Clear biography
                </button>
              ) : null}
            </div>
          </div>

          {/* Avatar Selector */}
          <fieldset className="border-t border-black/10 pt-6">
            <legend className={labelClassName}>Profile Avatar</legend>
            <p className="mt-1 text-xs leading-relaxed text-black/60">
              Choose an avatar for your profile card. Some avatars unlock at higher reading levels or with a Premium subscription.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {/* Default Monogram Option */}
              <button
                aria-pressed={selectedAvatarId === null}
                className={`flex items-center gap-3.5 rounded-2xl border p-3.5 text-left transition ${
                  selectedAvatarId === null
                    ? "border-[#1E2E4F] bg-white ring-2 ring-[#1E2E4F]/20 shadow-xs"
                    : "border-black/15 bg-white/70 hover:border-[#1E2E4F]/50 hover:bg-white"
                }`}
                onClick={() => {
                  setSelectedAvatarId(null);
                  if (formStatus !== "idle") {
                    setFormStatus("idle");
                    setMessage("");
                  }
                }}
                type="button"
              >
                <AssetGraphic
                  asset={null}
                  fallbackText={userInitials}
                  sizeClassName="h-14 w-14 shrink-0 text-lg"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-serif text-lg text-black">
                      Default monogram
                    </span>
                    {selectedAvatarId === null ? (
                      <span className="shrink-0 rounded-full bg-[#1E2E4F] px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-white">
                        Selected
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] text-[#556B45]">
                    Classic LivrUSP initials
                  </p>
                </div>
              </button>

              {/* Platform Avatar Assets */}
              {avatarAssets.map((asset) => {
                const lockState = getAssetLockState(asset, savedProfile, levels);
                const isSelected = selectedAvatarId === asset.id_asset;
                const isDisabled = lockState.isLocked && !isSelected;

                return (
                  <button
                    aria-pressed={isSelected}
                    className={`flex items-center gap-3.5 rounded-2xl border p-3.5 text-left transition ${
                      isSelected
                        ? "border-[#1E2E4F] bg-white ring-2 ring-[#1E2E4F]/20 shadow-xs"
                        : isDisabled
                          ? "cursor-not-allowed border-black/10 bg-white/40 opacity-65"
                          : "border-black/15 bg-white/70 hover:border-[#1E2E4F]/50 hover:bg-white"
                    }`}
                    disabled={isDisabled}
                    key={asset.id_asset}
                    onClick={() => {
                      if (isDisabled) return;
                      setSelectedAvatarId(asset.id_asset);
                      if (formStatus !== "idle") {
                        setFormStatus("idle");
                        setMessage("");
                      }
                    }}
                    type="button"
                  >
                    <AssetGraphic
                      asset={asset}
                      fallbackText={getInitials(asset.nome)}
                      sizeClassName="h-14 w-14 shrink-0 text-lg"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-serif text-lg text-black">
                          {asset.nome}
                        </span>
                        {isSelected ? (
                          <span className="shrink-0 rounded-full bg-[#1E2E4F] px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-white">
                            Selected
                          </span>
                        ) : lockState.isLocked ? (
                          <span className="shrink-0 rounded-full border border-black/15 bg-black/5 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-black/60">
                            Locked
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {asset.exige_premium ? (
                          <span className="rounded-full border border-amber-500/30 bg-amber-100/80 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-900">
                            Premium
                          </span>
                        ) : null}
                        {lockState.requiredLevel ? (
                          <span className="rounded-full border border-[#1E2E4F]/20 bg-[#D9E1F1] px-2 py-0.5 font-mono text-[10px] font-medium text-[#1E2E4F]">
                            Level: {lockState.requiredLevel.nome} ({lockState.requiredLevel.pontos_minimos} pts)
                          </span>
                        ) : null}
                        {!asset.exige_premium && !lockState.requiredLevel ? (
                          <span className="font-mono text-[11px] text-[#556B45]">
                            Available to all readers
                          </span>
                        ) : null}
                      </div>

                      {lockState.reason ? (
                        <p className="mt-1 text-[11px] text-amber-900/90">
                          {lockState.reason}
                        </p>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Profile Icon Selector */}
          <fieldset className="border-t border-black/10 pt-6">
            <legend className={labelClassName}>Profile Badge Icon</legend>
            <p className="mt-1 text-xs leading-relaxed text-black/60">
              Select a companion badge icon displayed alongside your avatar and username.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {/* No Icon Option */}
              <button
                aria-pressed={selectedIconId === null}
                className={`flex items-center gap-3.5 rounded-2xl border p-3.5 text-left transition ${
                  selectedIconId === null
                    ? "border-[#1E2E4F] bg-white ring-2 ring-[#1E2E4F]/20 shadow-xs"
                    : "border-black/15 bg-white/70 hover:border-[#1E2E4F]/50 hover:bg-white"
                }`}
                onClick={() => {
                  setSelectedIconId(null);
                  if (formStatus !== "idle") {
                    setFormStatus("idle");
                    setMessage("");
                  }
                }}
                type="button"
              >
                <div
                  aria-hidden="true"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-dashed border-black/25 bg-[#D9E1F1]/60 font-mono text-xs font-semibold text-[#1E2E4F]"
                >
                  —
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-serif text-lg text-black">
                      No badge icon
                    </span>
                    {selectedIconId === null ? (
                      <span className="shrink-0 rounded-full bg-[#1E2E4F] px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-white">
                        Selected
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] text-[#556B45]">
                    Display avatar only
                  </p>
                </div>
              </button>

              {/* Platform Icon Assets */}
              {iconAssets.map((asset) => {
                const lockState = getAssetLockState(asset, savedProfile, levels);
                const isSelected = selectedIconId === asset.id_asset;
                const isDisabled = lockState.isLocked && !isSelected;

                return (
                  <button
                    aria-pressed={isSelected}
                    className={`flex items-center gap-3.5 rounded-2xl border p-3.5 text-left transition ${
                      isSelected
                        ? "border-[#1E2E4F] bg-white ring-2 ring-[#1E2E4F]/20 shadow-xs"
                        : isDisabled
                          ? "cursor-not-allowed border-black/10 bg-white/40 opacity-65"
                          : "border-black/15 bg-white/70 hover:border-[#1E2E4F]/50 hover:bg-white"
                    }`}
                    disabled={isDisabled}
                    key={asset.id_asset}
                    onClick={() => {
                      if (isDisabled) return;
                      setSelectedIconId(asset.id_asset);
                      if (formStatus !== "idle") {
                        setFormStatus("idle");
                        setMessage("");
                      }
                    }}
                    type="button"
                  >
                    <AssetGraphic
                      asset={asset}
                      fallbackText="★"
                      sizeClassName="h-12 w-12 shrink-0 text-base"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-serif text-lg text-black">
                          {asset.nome}
                        </span>
                        {isSelected ? (
                          <span className="shrink-0 rounded-full bg-[#1E2E4F] px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-white">
                            Selected
                          </span>
                        ) : lockState.isLocked ? (
                          <span className="shrink-0 rounded-full border border-black/15 bg-black/5 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-black/60">
                            Locked
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {asset.exige_premium ? (
                          <span className="rounded-full border border-amber-500/30 bg-amber-100/80 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-900">
                            Premium
                          </span>
                        ) : null}
                        {lockState.requiredLevel ? (
                          <span className="rounded-full border border-[#1E2E4F]/20 bg-[#D9E1F1] px-2 py-0.5 font-mono text-[10px] font-medium text-[#1E2E4F]">
                            Level: {lockState.requiredLevel.nome} ({lockState.requiredLevel.pontos_minimos} pts)
                          </span>
                        ) : null}
                        {!asset.exige_premium && !lockState.requiredLevel ? (
                          <span className="font-mono text-[11px] text-[#556B45]">
                            Available to all readers
                          </span>
                        ) : null}
                      </div>

                      {lockState.reason ? (
                        <p className="mt-1 text-[11px] text-amber-900/90">
                          {lockState.reason}
                        </p>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>

            {iconAssets.length === 0 ? (
              <p className="mt-3 font-mono text-[11px] text-black/55">
                Additional badge icons will appear here as new level and seasonal rewards are added.
              </p>
            ) : null}
          </fieldset>

          {/* Additional Reading Metadata Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white/60 px-4 py-3 text-xs text-black/65">
            <span>
              Active reading time:{" "}
              <strong className="font-semibold text-black">
                {formatReadingTime(stats.activeSeconds)}
              </strong>
            </span>
            <span>
              Genres explored:{" "}
              <strong className="font-semibold text-black">{stats.genresRead}</strong> · Authors read:{" "}
              <strong className="font-semibold text-black">{stats.authorsRead}</strong>
            </span>
          </div>

          {/* Submit & Reset Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-black/10 pt-6">
            <div className="flex flex-wrap items-center gap-3">
              <button
                className="rounded-full bg-[#1E2E4F] px-7 py-2.5 text-xs font-semibold text-white transition hover:bg-[#15223B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E2E4F] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? "Saving changes..." : "Save profile"}
              </button>

              {hasChanges ? (
                <button
                  className="rounded-full border border-black/15 bg-white/75 px-5 py-2.5 text-xs font-semibold text-[#1E2E4F] transition hover:border-[#1E2E4F] hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
                  disabled={isSubmitting}
                  onClick={handleReset}
                  type="button"
                >
                  Discard changes
                </button>
              ) : null}
            </div>

            <p
              aria-live="polite"
              className={`text-sm font-medium ${
                formStatus === "error" ? "text-red-700" : "text-[#3A4B2E]"
              }`}
              role={formStatus === "error" ? "alert" : "status"}
            >
              {message}
            </p>
          </div>
        </form>
      </section>
    </div>
  );
}
