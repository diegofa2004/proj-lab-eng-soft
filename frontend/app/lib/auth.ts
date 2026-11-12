import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { accessTokenCookieName } from "@/app/lib/session";

type CurrentUser = {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  id_avatar?: number | null;
  id_icone?: number | null;
  profile_ring?: string | null;
  nivel?: string | null;
  pontos_leitura?: number;
  onboarding_generos_concluido?: boolean;
};

function getBackendUrl() {
  return process.env.BACKEND_URL ?? "http://localhost:8000";
}

export const requireCurrentUser = cache(async (): Promise<CurrentUser> => {
  const token = (await cookies()).get(accessTokenCookieName)?.value;

  if (!token) {
    redirect("/login");
  }

  try {
    const profileResponse = await fetch(`${getBackendUrl()}/v2/me/profile`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (profileResponse.ok) {
      const profile = (await profileResponse.json()) as {
        id_usuario: number;
        nome_perfil: string;
        email: string;
        is_admin: boolean;
        id_avatar: number | null;
        id_icone: number | null;
        profile_ring: string | null;
        nivel: string | null;
        pontos_leitura: number;
        onboarding_generos_concluido: boolean;
      };
      return {
        id: profile.id_usuario,
        username: profile.nome_perfil,
        email: profile.email,
        is_admin: profile.is_admin,
        id_avatar: profile.id_avatar,
        id_icone: profile.id_icone,
        profile_ring: profile.profile_ring,
        nivel: profile.nivel,
        pontos_leitura: profile.pontos_leitura,
        onboarding_generos_concluido: profile.onboarding_generos_concluido,
      };
    }

    const response = await fetch(`${getBackendUrl()}/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) redirect("/login");
    return (await response.json()) as CurrentUser;
  } catch {
    redirect("/login");
  }
});
