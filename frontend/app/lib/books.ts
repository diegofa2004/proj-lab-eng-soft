import { cache } from "react";
import { cookies } from "next/headers";

import { accessTokenCookieName } from "@/app/lib/session";

export type OrigemLivro = "catalogo" | "usuario";
export type StatusPublicacao = "rascunho" | "publicado" | "arquivado";
export type ListItemType = "favorito" | "ler_depois";

export type Book = {
  id_livro: number;
  titulo: string;
  descricao: string;
  data_publicacao: string;
  arquivo_conteudo: string;
  total_paginas: number;
  origem: OrigemLivro;
  status_publicacao: StatusPublicacao;
  status_bloqueado: boolean;
  id_publicador: number | null;
  criado_em: string;
};

export type Review = {
  id_avaliacao: number;
  id_usuario: number;
  id_livro: number;
  nota: number;
  texto_revisao: string | null;
  data_hora: string;
  is_removida: boolean;
};

export type ListItem = {
  id_item: number;
  id_usuario: number;
  id_livro: number;
  tipo: ListItemType;
  data_adicao: string;
};

export type CurrentUser = {
  id: number;
  username: string;
  email: string;
  is_admin?: boolean;
};

export type FetchBookResult =
  | { status: "ok"; book: Book }
  | { status: "not_found" }
  | { status: "unavailable"; detail: string };

export function getBackendUrl() {
  return process.env.BACKEND_URL ?? "http://localhost:8000";
}

export const getOptionalCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(accessTokenCookieName)?.value;

  if (!token) {
    return null;
  }

  try {
    const response = await fetch(`${getBackendUrl()}/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as CurrentUser;
  } catch {
    return null;
  }
});

export async function getBookById(bookId: number): Promise<FetchBookResult> {
  try {
    const response = await fetch(`${getBackendUrl()}/books/${bookId}`, {
      cache: "no-store",
    });

    if (response.status === 404) {
      return { status: "not_found" };
    }

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { detail?: string } | null;
      return {
        status: "unavailable",
        detail: data?.detail ?? "Unable to load book details at this time.",
      };
    }

    const book = (await response.json()) as Book;
    return { status: "ok", book };
  } catch {
    return {
      status: "unavailable",
      detail: "Unable to reach the catalog service. Please try again later.",
    };
  }
}

export async function getBookReviews(bookId: number): Promise<Review[]> {
  try {
    const response = await fetch(`${getBackendUrl()}/books/${bookId}/reviews`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const reviews = (await response.json()) as Review[];
    return Array.isArray(reviews) ? reviews.filter((review) => !review.is_removida) : [];
  } catch {
    return [];
  }
}

export async function getUserBookListsStatus(bookId: number): Promise<{
  isFavorite: boolean;
  isToRead: boolean;
}> {
  const token = (await cookies()).get(accessTokenCookieName)?.value;

  if (!token) {
    return { isFavorite: false, isToRead: false };
  }

  try {
    const headers = { Authorization: `Bearer ${token}` };
    const [favoritesResponse, toReadResponse] = await Promise.all([
      fetch(`${getBackendUrl()}/users/me/favorites`, { headers, cache: "no-store" }),
      fetch(`${getBackendUrl()}/users/me/to-read`, { headers, cache: "no-store" }),
    ]);

    const favorites = favoritesResponse.ok
      ? ((await favoritesResponse.json()) as ListItem[])
      : [];
    const toRead = toReadResponse.ok ? ((await toReadResponse.json()) as ListItem[]) : [];

    return {
      isFavorite: Array.isArray(favorites) && favorites.some((item) => item.id_livro === bookId),
      isToRead: Array.isArray(toRead) && toRead.some((item) => item.id_livro === bookId),
    };
  } catch {
    return { isFavorite: false, isToRead: false };
  }
}

