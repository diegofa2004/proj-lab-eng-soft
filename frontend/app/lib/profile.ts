import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getBackendUrl } from "@/app/lib/books";
import { accessTokenCookieName } from "@/app/lib/session";

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

type LegacyUserResponse = {
  id: number;
  username: string;
  email: string;
  is_admin?: boolean;
};

type LegacyPointsResponse = {
  points?: number;
  level?: string | null;
  publisher?: boolean;
};

type RawDashboardResponse = {
  livros_concluidos?: number;
  paginas_lidas?: number;
  tempo_ativo_segundos?: number;
  generos_lidos?: number;
  autores_lidos?: number;
  books_read?: number;
  pages_read?: number;
  active_seconds?: number;
};

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

/**
 * Fetches the authenticated user's full profile on the server.
 * Redirects to `/login` when the session cookie is missing or invalid.
 */
export const requireUserProfile = cache(async (): Promise<UserProfile> => {
  const token = (await cookies()).get(accessTokenCookieName)?.value;

  if (!token) {
    redirect("/login");
  }

  const backendUrl = getBackendUrl();
  const headers = { Authorization: `Bearer ${token}` };

  try {
    const v2Response = await fetch(`${backendUrl}/v2/me/profile`, {
      headers,
      cache: "no-store",
    });

    if (v2Response.status === 401 || v2Response.status === 403) {
      redirect("/login");
    }

    if (v2Response.ok) {
      return (await v2Response.json()) as UserProfile;
    }

    // Fallback for environments where only `/me` is mounted
    const [meResponse, pointsResponse] = await Promise.all([
      fetch(`${backendUrl}/me`, { headers, cache: "no-store" }),
      fetch(`${backendUrl}/users/me/points`, { headers, cache: "no-store" }).catch(() => null),
    ]);

    if (!meResponse.ok) {
      redirect("/login");
    }

    const me = (await meResponse.json()) as LegacyUserResponse;
    const pointsData =
      pointsResponse && pointsResponse.ok
        ? ((await pointsResponse.json().catch(() => null)) as LegacyPointsResponse | null)
        : null;

    return {
      id_usuario: me.id,
      nome_perfil: me.username,
      email: me.email,
      biografia: "",
      id_avatar: null,
      id_icone: null,
      is_admin: Boolean(me.is_admin),
      pontos_leitura: typeof pointsData?.points === "number" ? pointsData.points : 0,
      id_nivel: null,
      nivel: pointsData?.level ?? "Leitor",
      is_premium: false,
      pode_publicar: Boolean(pointsData?.publisher),
    };
  } catch {
    redirect("/login");
  }
});

/** Lists all profile assets (avatars and icons) available in the platform. */
export async function getProfileAssets(): Promise<ProfileAsset[]> {
  const backendUrl = getBackendUrl();

  for (const endpoint of [`${backendUrl}/v2/assets`, `${backendUrl}/assets`]) {
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) {
        continue;
      }

      const data = (await response.json()) as ProfileAsset[];
      if (Array.isArray(data)) {
        return [...data].sort((a, b) => a.id_asset - b.id_asset);
      }
    } catch {
      // Try next endpoint fallback
    }
  }

  return [];
}

/** Lists all reading levels configured in the platform, sorted by minimum points. */
export async function getProfileLevels(): Promise<ProfileLevel[]> {
  const backendUrl = getBackendUrl();

  for (const endpoint of [`${backendUrl}/v2/levels`, `${backendUrl}/levels`]) {
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) {
        continue;
      }

      const data = (await response.json()) as ProfileLevel[];
      if (Array.isArray(data)) {
        return [...data].sort(
          (a, b) => a.pontos_minimos - b.pontos_minimos || a.id_nivel - b.id_nivel,
        );
      }
    } catch {
      // Try next endpoint fallback
    }
  }

  return [];
}

/** Fetches reading statistics for the current user's profile summary. */
export async function getProfileDashboardStats(): Promise<ProfileDashboardStats> {
  const defaultStats: ProfileDashboardStats = {
    booksCompleted: 0,
    pagesRead: 0,
    activeSeconds: 0,
    genresRead: 0,
    authorsRead: 0,
  };

  const token = (await cookies()).get(accessTokenCookieName)?.value;
  if (!token) {
    return defaultStats;
  }

  const backendUrl = getBackendUrl();
  const headers = { Authorization: `Bearer ${token}` };

  for (const endpoint of [`${backendUrl}/v2/me/dashboard`, `${backendUrl}/users/me/dashboard`]) {
    try {
      const response = await fetch(endpoint, { headers, cache: "no-store" });
      if (!response.ok) {
        continue;
      }

      const data = (await response.json()) as RawDashboardResponse;
      if (data && typeof data === "object") {
        return {
          booksCompleted:
            typeof data.livros_concluidos === "number"
              ? data.livros_concluidos
              : typeof data.books_read === "number"
                ? data.books_read
                : 0,
          pagesRead:
            typeof data.paginas_lidas === "number"
              ? data.paginas_lidas
              : typeof data.pages_read === "number"
                ? data.pages_read
                : 0,
          activeSeconds:
            typeof data.tempo_ativo_segundos === "number"
              ? data.tempo_ativo_segundos
              : typeof data.active_seconds === "number"
                ? data.active_seconds
                : 0,
          genresRead: typeof data.generos_lidos === "number" ? data.generos_lidos : 0,
          authorsRead: typeof data.autores_lidos === "number" ? data.autores_lidos : 0,
        };
      }
    } catch {
      // Try next fallback
    }
  }

  return defaultStats;
}
