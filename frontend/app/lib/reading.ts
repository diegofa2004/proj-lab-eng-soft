import { cookies } from "next/headers";

import { getBackendUrl } from "@/app/lib/books";
import { accessTokenCookieName } from "@/app/lib/session";

export type ReadingDashboard = {
  livros_concluidos: number;
  paginas_lidas: number;
  tempo_ativo_segundos: number;
  generos_lidos: number;
  autores_lidos: number;
};

export type ReadingDashboardResult =
  | { status: "ok"; dashboard: ReadingDashboard }
  | { status: "error"; detail: string };

type RawDashboardResponse = {
  livros_concluidos?: unknown;
  paginas_lidas?: unknown;
  tempo_ativo_segundos?: unknown;
  generos_lidos?: unknown;
  autores_lidos?: unknown;
};

function toCount(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

function normalizeDashboard(raw: RawDashboardResponse): ReadingDashboard {
  return {
    livros_concluidos: toCount(raw.livros_concluidos),
    paginas_lidas: toCount(raw.paginas_lidas),
    tempo_ativo_segundos: toCount(raw.tempo_ativo_segundos),
    generos_lidos: toCount(raw.generos_lidos),
    autores_lidos: toCount(raw.autores_lidos),
  };
}

export async function getReadingDashboard(): Promise<ReadingDashboardResult> {
  const token = (await cookies()).get(accessTokenCookieName)?.value;

  if (!token) {
    return { status: "error", detail: "Please sign in to view your reading dashboard." };
  }

  try {
    const response = await fetch(`${getBackendUrl()}/v2/me/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        status: "error",
        detail:
          response.status === 401
            ? "Your session expired. Please sign in again to view your dashboard."
            : "Unable to load your reading dashboard right now. Please try again later.",
      };
    }

    const raw = (await response.json()) as RawDashboardResponse;
    return { status: "ok", dashboard: normalizeDashboard(raw) };
  } catch {
    return {
      status: "error",
      detail: "Unable to reach the reading service. Please try again later.",
    };
  }
}

export function formatActiveTime(totalSeconds: number): string {
  const safeSeconds = Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.floor(totalSeconds) : 0;
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}
