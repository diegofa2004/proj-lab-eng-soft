export type ProfileAssetType = "avatar" | "icone";

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
    reason = `Requires Premium and ${requiredLevel.nome} (${requiredLevel.pontos_minimos} pts)`;
  } else if (missingPremium) {
    reason = "Requires an active Premium subscription";
  } else if (missingLevel && requiredLevel) {
    reason = `Requires level ${requiredLevel.nome} (${requiredLevel.pontos_minimos} pts)`;
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
