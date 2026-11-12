export type ProfileAssetType = "avatar" | "icone";

export const PROFILE_RINGS = [
  {
    id: "subscriber",
    label: "Subscriber",
    src: "/ring_assets/56px_decorativo/ring-assinante.png",
  },
  { id: "bronze", label: "Bronze", src: "/ring_assets/56px_decorativo/ring-bronze.png" },
  { id: "diamond", label: "Diamond", src: "/ring_assets/56px_decorativo/ring-diamante.png" },
  { id: "emerald", label: "Emerald", src: "/ring_assets/56px_decorativo/ring-esmeralda.png" },
  { id: "master", label: "Master", src: "/ring_assets/56px_decorativo/ring-mestre.png" },
  { id: "gold", label: "Gold", src: "/ring_assets/56px_decorativo/ring-ouro.png" },
  { id: "silver", label: "Silver", src: "/ring_assets/56px_decorativo/ring-prata.png" },
  { id: "publisher", label: "Publisher", src: "/ring_assets/56px_decorativo/ring-publicador.png" },
] as const;

export type ProfileRingId = (typeof PROFILE_RINGS)[number]["id"];

export function isProfileRing(value: unknown): value is ProfileRingId {
  return typeof value === "string" && PROFILE_RINGS.some((item) => item.id === value);
}

export function getProfileRing(ring?: string | null) {
  return PROFILE_RINGS.find((item) => item.id === ring) ?? null;
}

const BACKGROUND_ROOT = "/LivrUSP_Backgrounds_8_Temas/LivrUSP_backgrounds";

export const PROFILE_BACKGROUNDS = [
  { id: "editorial-paper", label: "Editorial Paper", src: `${BACKGROUND_ROOT}/01_papel_editorial.png` },
  { id: "abstract-pages", label: "Abstract Pages", src: `${BACKGROUND_ROOT}/02_paginas_abstratas.png` },
  { id: "dark-library", label: "Dark Library", src: `${BACKGROUND_ROOT}/03_biblioteca_azul_escura.png` },
  { id: "cosmic-library", label: "Cosmic Library", src: `${BACKGROUND_ROOT}/04_biblioteca_cosmica.png` },
  { id: "literary-watercolor", label: "Literary Watercolor", src: `${BACKGROUND_ROOT}/05_aquarela_literaria.png` },
  { id: "noir-detective", label: "Noir Detective", src: `${BACKGROUND_ROOT}/06_detetive_noir.png` },
  { id: "romance", label: "Romance", src: `${BACKGROUND_ROOT}/07_romance.png` },
  { id: "academic-education", label: "Academic Education", src: `${BACKGROUND_ROOT}/08_educacao_academia.png` },
] as const;

export type ProfileBackgroundId = (typeof PROFILE_BACKGROUNDS)[number]["id"];

export function isProfileBackground(value: unknown): value is ProfileBackgroundId {
  return typeof value === "string" && PROFILE_BACKGROUNDS.some((item) => item.id === value);
}

export function getProfileBackground(background?: string | null) {
  return PROFILE_BACKGROUNDS.find((item) => item.id === background) ?? null;
}

const AVATAR_ROOT = "/LivrUSP_avatares_humanoides_8/LivrUSP_avatares_humanoides/176px_retina";

export const PROFILE_AVATARS = [
  { id: "editorial-reader", label: "Editorial Reader", src: `${AVATAR_ROOT}/01_papel_editorial.png` },
  { id: "researcher", label: "Researcher", src: `${AVATAR_ROOT}/02_paginas_abstratas.png` },
  { id: "literary-guardian", label: "Literary Guardian", src: `${AVATAR_ROOT}/03_biblioteca_azul_escura.png` },
  { id: "astronomer", label: "Astronomer", src: `${AVATAR_ROOT}/04_biblioteca_cosmica.png` },
  { id: "explorer", label: "Explorer", src: `${AVATAR_ROOT}/05_aquarela_literaria.png` },
  { id: "detective", label: "Detective", src: `${AVATAR_ROOT}/06_detetive_noir.png` },
  { id: "romantic-reader", label: "Romantic Reader", src: `${AVATAR_ROOT}/07_romance.png` },
  { id: "academic", label: "Academic", src: `${AVATAR_ROOT}/08_educacao_academia.png` },
] as const;

export type ProfileAvatarId = (typeof PROFILE_AVATARS)[number]["id"];

export function isProfileAvatar(value: unknown): value is ProfileAvatarId {
  return typeof value === "string" && PROFILE_AVATARS.some((item) => item.id === value);
}

export function getProfileAvatar(avatar?: string | null) {
  return PROFILE_AVATARS.find((item) => item.id === avatar) ?? null;
}

export type ProfileAsset = {
  id_asset: number;
  tipo: ProfileAssetType;
  nome: string;
  arquivo: string;
  exige_premium: boolean;
  id_nivel_minimo: number | null;
};

export type ProfileLevel = {
  id_nivel: number;
  nome: string;
  pontos_minimos: number;
  permite_publicar: boolean;
};

export type UserProfile = {
  id_usuario: number;
  nome_perfil: string;
  email: string;
  biografia: string;
  id_avatar: number | null;
  id_icone: number | null;
  profile_ring: ProfileRingId | null;
  profile_background: ProfileBackgroundId | null;
  profile_avatar: ProfileAvatarId | null;
  is_admin: boolean;
  pontos_leitura: number;
  id_nivel: number | null;
  nivel: string | null;
  is_premium: boolean;
  pode_publicar: boolean;
  onboarding_generos_concluido?: boolean;
};

export type ProfileEditPayload = {
  biografia?: string;
  id_avatar?: number | null;
  id_icone?: number | null;
  profile_ring?: ProfileRingId | null;
  profile_background?: ProfileBackgroundId | null;
  profile_avatar?: ProfileAvatarId | null;
};

export type ProfileDashboardStats = {
  booksCompleted: number;
  pagesRead: number;
  activeSeconds: number;
  genresRead: number;
  authorsRead: number;
};

export type AssetLockState = {
  isLocked: boolean;
  requiresPremium: boolean;
  missingPremium: boolean;
  requiredLevel: ProfileLevel | null;
  missingLevel: boolean;
  reason: string | null;
};

export const MAX_BIOGRAPHY_LENGTH = 5000;

/** Translates legacy level names returned by the database for English UI copy. */
export function formatProfileLevel(level?: string | null): string {
  const normalized = level?.trim().toLocaleLowerCase();
  if (!normalized || normalized === "leitor") {
    return "Reader";
  }
  if (normalized === "autor") {
    return "Author";
  }
  return level?.trim() || "Reader";
}

/**
 * Resolves an asset file path into a browser-safe URL.
 * Relative backend paths (such as `/v2/demo/avatar.svg`) are routed through
 * `/api/profile/asset` so the browser never needs direct access to the internal
 * Docker `backend` hostname.
 */
export function resolveAssetImageUrl(arquivo: string): string {
  const trimmed = arquivo.trim();
  if (!trimmed) {
    return "";
  }

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }

  const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `/api/profile/asset?path=${encodeURIComponent(normalizedPath)}`;
}

/**
 * Computes whether a profile asset (avatar or icon) is unlocked for the given
 * user profile and level definitions.
 */
export function getAssetLockState(
  asset: ProfileAsset,
  profile: Pick<UserProfile, "is_premium" | "pontos_leitura">,
  levels: ProfileLevel[],
): AssetLockState {
  const requiredLevel =
    asset.id_nivel_minimo !== null
      ? (levels.find((level) => level.id_nivel === asset.id_nivel_minimo) ?? null)
      : null;

  const missingPremium = Boolean(asset.exige_premium && !profile.is_premium);
  const missingLevel = Boolean(
    requiredLevel && requiredLevel.pontos_minimos > profile.pontos_leitura,
  );
  const isLocked = missingPremium || missingLevel;

  let reason: string | null = null;
  if (missingPremium && missingLevel && requiredLevel) {
    reason = `Requires Premium and ${formatProfileLevel(requiredLevel.nome)} (${requiredLevel.pontos_minimos} pts)`;
  } else if (missingPremium) {
    reason = "Requires an active Premium subscription";
  } else if (missingLevel && requiredLevel) {
    reason = `Requires level ${formatProfileLevel(requiredLevel.nome)} (${requiredLevel.pontos_minimos} pts)`;
  }

  return {
    isLocked,
    requiresPremium: asset.exige_premium,
    missingPremium,
    requiredLevel,
    missingLevel,
    reason,
  };
}
