import { cache } from "react";
import { cookies } from "next/headers";

import { type Author, type Genre, getBackendUrl, type OrigemLivro, type StatusPublicacao } from "@/app/lib/books";
import { accessTokenCookieName } from "@/app/lib/session";

export type Chapter = {
  id_capitulo: number;
  id_livro: number;
  ordem: number;
  titulo: string;
  conteudo: string;
  versao: number;
  criado_em: string;
  atualizado_em: string;
};

export type OwnedBookSummary = {
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
  atualizado_em: string;
  total_capitulos: number;
  total_palavras: number;
  tem_epub: boolean;
  pode_publicar: boolean;
};

export type OwnedBookDetail = OwnedBookSummary & {
  autores: Author[];
  generos: Genre[];
  capitulos: Chapter[];
};

export type OwnedBooksResult =
  | { status: "ok"; books: OwnedBookSummary[] }
  | { status: "unavailable"; detail: string };

export type OwnedBookResult =
  | { status: "ok"; book: OwnedBookDetail }
  | { status: "not_found" }
  | { status: "unavailable"; detail: string };

async function writingFetch<T>(path: string): Promise<
  { status: "ok"; data: T } | { status: "not_found" } | { status: "unavailable"; detail: string }
> {
  const token = (await cookies()).get(accessTokenCookieName)?.value;
  if (!token) {
    return { status: "not_found" };
  }

  try {
    const response = await fetch(`${getBackendUrl()}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (response.status === 404) {
      return { status: "not_found" };
    }
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
      return {
        status: "unavailable",
        detail: payload?.detail ?? "The writing service is unavailable.",
      };
    }
    return { status: "ok", data: (await response.json()) as T };
  } catch {
    return { status: "unavailable", detail: "The writing service is unavailable." };
  }
}

export const getOwnedBooks = cache(async (): Promise<OwnedBooksResult> => {
  const result = await writingFetch<OwnedBookSummary[]>("/v2/me/books");
  if (result.status === "ok") {
    return { status: "ok", books: result.data };
  }
  return {
    status: "unavailable",
    detail: result.status === "unavailable" ? result.detail : "Sign in to view your books.",
  };
});

export const getOwnedBook = cache(async (bookId: number): Promise<OwnedBookResult> => {
  const result = await writingFetch<OwnedBookDetail>(`/v2/me/books/${bookId}`);
  if (result.status === "ok") {
    return { status: "ok", book: result.data };
  }
  return result;
});
