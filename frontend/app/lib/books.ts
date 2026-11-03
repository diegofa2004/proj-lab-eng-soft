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

export type Author = {
  id_autor: number;
  nome: string;
};

export type Genre = {
  id_genero: number;
  nome: string;
};

/**
 * A book returned by the catalog search. Authors and genres are optional
 * because the backend may or may not embed them in search results.
 */
export type BookSearchResult = Book & {
  autores?: Author[];
  generos?: Genre[];
};

export const BOOK_SORT_OPTIONS = [
  { value: "relevance", label: "Most relevant" },
  { value: "title", label: "Title (A-Z)" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
] as const;

export type BookSortOption = (typeof BOOK_SORT_OPTIONS)[number]["value"];

export const BOOK_SOURCE_OPTIONS = [
  { value: "all", label: "All sources" },
  { value: "catalogo", label: "Official Catalog" },
  { value: "usuario", label: "Community Publication" },
] as const;

export type BookSourceFilter = (typeof BOOK_SOURCE_OPTIONS)[number]["value"];

export type BookSearchFilters = {
  query: string;
  author: string;
  genre: string;
  source: BookSourceFilter;
  sort: BookSortOption;
  page: number;
};

export type BookSearchResponse =
  | {
      status: "ok";
      books: BookSearchResult[];
      total: number;
      page: number;
      pageSize: number;
    }
  | { status: "unavailable"; detail: string };

export type SearchParamsRecord = Record<string, string | string[] | undefined>;

export const BOOK_SEARCH_PAGE_SIZE = 12;
const MAX_SEARCH_FIELD_LENGTH = 200;

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


function firstSearchParamValue(value: string | string[] | undefined): string {
  const rawValue = Array.isArray(value) ? value[0] : value;
  return (rawValue ?? "").trim().slice(0, MAX_SEARCH_FIELD_LENGTH);
}

function isBookSortOption(value: string): value is BookSortOption {
  return BOOK_SORT_OPTIONS.some((option) => option.value === value);
}

function isBookSourceFilter(value: string): value is BookSourceFilter {
  return BOOK_SOURCE_OPTIONS.some((option) => option.value === value);
}

/** Converts the page URL search params into normalized search filters. */
export function parseBookSearchParams(searchParams: SearchParamsRecord): BookSearchFilters {
  const source = firstSearchParamValue(searchParams.source);
  const sort = firstSearchParamValue(searchParams.sort);
  const page = Number(firstSearchParamValue(searchParams.page));

  return {
    query: firstSearchParamValue(searchParams.q),
    author: firstSearchParamValue(searchParams.author),
    genre: firstSearchParamValue(searchParams.genre),
    source: isBookSourceFilter(source) ? source : "all",
    sort: isBookSortOption(sort) ? sort : "relevance",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

export function hasActiveBookFilters(filters: BookSearchFilters): boolean {
  return Boolean(
    filters.query || filters.author || filters.genre || filters.source !== "all",
  );
}

/** Builds the query string shared by the page URL and the backend request. */
export function buildBookSearchQuery(filters: BookSearchFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.query) params.set("q", filters.query);
  if (filters.author) params.set("author", filters.author);
  if (filters.genre) params.set("genre", filters.genre);
  if (filters.source !== "all") params.set("source", filters.source);
  if (filters.sort !== "relevance") params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));

  return params;
}

export function buildBookSearchHref(
  filters: BookSearchFilters,
  overrides: Partial<BookSearchFilters> = {},
): string {
  const queryString = buildBookSearchQuery({ ...filters, ...overrides }).toString();
  return queryString ? `/books?${queryString}` : "/books";
}

type PaginatedBooksResponse = {
  items?: BookSearchResult[];
  total?: number;
  page?: number;
  page_size?: number;
};

/**
 * Searches the public catalog through `GET /books`.
 *
 * Expected backend contract: `{ items, total, page, page_size }`. A plain
 * array is also accepted and treated as the complete result set, which is
 * then paginated locally.
 */
export async function searchBooks(filters: BookSearchFilters): Promise<BookSearchResponse> {
  const params = buildBookSearchQuery(filters);
  params.set("page", String(filters.page));
  params.set("page_size", String(BOOK_SEARCH_PAGE_SIZE));

  try {
    const response = await fetch(`${getBackendUrl()}/books?${params.toString()}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { detail?: unknown } | null;
      return {
        status: "unavailable",
        detail:
          typeof data?.detail === "string"
            ? data.detail
            : "Unable to search the catalog at this time.",
      };
    }

    const data = (await response.json()) as BookSearchResult[] | PaginatedBooksResponse;

    if (Array.isArray(data)) {
      const start = (filters.page - 1) * BOOK_SEARCH_PAGE_SIZE;
      return {
        status: "ok",
        books: data.slice(start, start + BOOK_SEARCH_PAGE_SIZE),
        total: data.length,
        page: filters.page,
        pageSize: BOOK_SEARCH_PAGE_SIZE,
      };
    }

    if (data && Array.isArray(data.items)) {
      return {
        status: "ok",
        books: data.items,
        total: typeof data.total === "number" ? data.total : data.items.length,
        page: typeof data.page === "number" ? data.page : filters.page,
        pageSize:
          typeof data.page_size === "number" && data.page_size > 0
            ? data.page_size
            : BOOK_SEARCH_PAGE_SIZE,
      };
    }

    return {
      status: "unavailable",
      detail: "The catalog service returned an invalid response.",
    };
  } catch {
    return {
      status: "unavailable",
      detail: "Unable to reach the catalog service. Please try again later.",
    };
  }
}

/** Lists the genres used by the search filters. Returns an empty list on failure. */
export async function getGenres(): Promise<Genre[]> {
  try {
    const response = await fetch(`${getBackendUrl()}/genres`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const genres = (await response.json()) as Genre[];
    return Array.isArray(genres)
      ? [...genres].sort((a, b) => a.nome.localeCompare(b.nome))
      : [];
  } catch {
    return [];
  }
}
