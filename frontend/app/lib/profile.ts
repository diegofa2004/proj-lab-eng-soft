import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getBackendUrl } from "@/app/lib/books";
import {
  type ProfileAsset,
  type ProfileDashboardStats,
  type ProfileLevel,
  type UserProfile,
} from "@/app/lib/profile-utils";
import { accessTokenCookieName } from "@/app/lib/session";

export {
  MAX_BIOGRAPHY_LENGTH,
  PROFILE_AVATARS,
  PROFILE_BACKGROUNDS,
  PROFILE_RINGS,
  getAssetLockState,
  resolveAssetImageUrl,
} from "@/app/lib/profile-utils";
export type {
  AssetLockState,
  ProfileAsset,
  ProfileAssetType,
  ProfileDashboardStats,
  ProfileEditPayload,
  ProfileLevel,
  UserProfile,
} from "@/app/lib/profile-utils";

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
  paginas_padrao_lidas?: number;
  tempo_ativo_segundos?: number;
  generos_lidos?: number;
  autores_lidos?: number;
  books_read?: number;
  standard_pages_read?: number;
  active_seconds?: number;
};

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
      profile_ring: null,
      profile_background: null,
      profile_avatar: null,
      is_admin: Boolean(me.is_admin),
      pontos_leitura: typeof pointsData?.points === "number" ? pointsData.points : 0,
      id_nivel: null,
      nivel: pointsData?.level ?? "Reader",
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
            typeof data.paginas_padrao_lidas === "number"
              ? data.paginas_padrao_lidas
              : typeof data.standard_pages_read === "number"
                ? data.standard_pages_read
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
