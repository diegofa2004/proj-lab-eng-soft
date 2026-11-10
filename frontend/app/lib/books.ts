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
  capa_url?: string | null;
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
  is_admin: boolean;
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
  nota_media?: number;
  total_avaliacoes?: number;
  total_acessos?: number;
  rating?: number;
};

export const BOOK_SORT_OPTIONS = [
  { value: "relevance", label: "Default order" },
  { value: "popularity", label: "Most popular" },
  { value: "rating", label: "Highest rated" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "title", label: "Title (A-Z)" },
] as const;

export type BookSortOption = (typeof BOOK_SORT_OPTIONS)[number]["value"];

export const BOOK_SOURCE_OPTIONS = [
  { value: "all", label: "All sources" },
  { value: "catalogo", label: "Official Catalog" },
  { value: "usuario", label: "Community Publication" },
] as const;

export type BookSourceFilter = (typeof BOOK_SOURCE_OPTIONS)[number]["value"];

export const BOOK_RATING_FILTER_OPTIONS = [
  { value: "all", label: "Any rating", minRating: 0 },
  { value: "4", label: "4★ and above", minRating: 4 },
  { value: "3", label: "3★ and above", minRating: 3 },
  { value: "2", label: "2★ and above", minRating: 2 },
  { value: "1", label: "1★ and above", minRating: 1 },
] as const;

export type BookRatingFilter = (typeof BOOK_RATING_FILTER_OPTIONS)[number]["value"];

export type BookSearchFilters = {
  query: string;
  author: string;
  genre: string;
  source: BookSourceFilter;
  minRating: BookRatingFilter;
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

function isBookRatingFilter(value: string): value is BookRatingFilter {
  return BOOK_RATING_FILTER_OPTIONS.some((option) => option.value === value);
}

export function getBookAverageRating(book: BookSearchResult): number {
  if (typeof book.nota_media === "number" && Number.isFinite(book.nota_media)) {
    return book.nota_media;
  }
  if (typeof book.rating === "number" && Number.isFinite(book.rating)) {
    return book.rating;
  }
  return 0;
}

export function getBookReviewCount(book: BookSearchResult): number {
  return typeof book.total_avaliacoes === "number" && Number.isFinite(book.total_avaliacoes)
    ? book.total_avaliacoes
    : 0;
}

export function getBookPopularity(book: BookSearchResult): number {
  return typeof book.total_acessos === "number" && Number.isFinite(book.total_acessos)
    ? book.total_acessos
    : 0;
}

/** Converts the page URL search params into normalized search filters. */
export function parseBookSearchParams(searchParams: SearchParamsRecord): BookSearchFilters {
  const source = firstSearchParamValue(searchParams.source);
  const sort = firstSearchParamValue(searchParams.sort);
  const minRating =
    firstSearchParamValue(searchParams.min_rating) ||
    firstSearchParamValue(searchParams.rating);
  const page = Number(firstSearchParamValue(searchParams.page));

  return {
    query: firstSearchParamValue(searchParams.q) || firstSearchParamValue(searchParams.title),
    author: firstSearchParamValue(searchParams.author),
    genre: firstSearchParamValue(searchParams.genre),
    source: isBookSourceFilter(source) ? source : "all",
    minRating: isBookRatingFilter(minRating) ? minRating : "all",
    sort: isBookSortOption(sort) ? sort : "relevance",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

export function hasActiveBookFilters(filters: BookSearchFilters): boolean {
  return Boolean(
    filters.query ||
      filters.author ||
      filters.genre ||
      filters.source !== "all" ||
      filters.minRating !== "all" ||
      filters.sort !== "relevance",
  );
}

/** Builds the query string shared by the page URL and the backend request. */
export function buildBookSearchQuery(filters: BookSearchFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.query) params.set("q", filters.query);
  if (filters.author) params.set("author", filters.author);
  if (filters.genre) params.set("genre", filters.genre);
  if (filters.source !== "all") params.set("source", filters.source);
  if (filters.minRating !== "all") params.set("min_rating", filters.minRating);
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

async function enrichBooksWithMetrics(
  books: BookSearchResult[],
  v2BooksMap: Map<number, BookSearchResult>,
): Promise<BookSearchResult[]> {
  const merged = books.map((book) => {
    const v2Book = v2BooksMap.get(book.id_livro);
    if (!v2Book) return book;
    return {
      ...v2Book,
      ...book,
      nota_media:
        typeof book.nota_media === "number" ? book.nota_media : v2Book.nota_media,
      total_avaliacoes:
        typeof book.total_avaliacoes === "number"
          ? book.total_avaliacoes
          : v2Book.total_avaliacoes,
      total_acessos:
        typeof book.total_acessos === "number" ? book.total_acessos : v2Book.total_acessos,
      autores: book.autores?.length ? book.autores : v2Book.autores,
      generos: book.generos?.length ? book.generos : v2Book.generos,
    };
  });

  const booksMissingRatings = merged.filter(
    (book) => typeof book.nota_media !== "number" && typeof book.rating !== "number",
  );

  if (booksMissingRatings.length > 0 && booksMissingRatings.length <= 36) {
    const reviewsEntries = await Promise.all(
      booksMissingRatings.map(async (book) => {
        const reviews = await getBookReviews(book.id_livro);
        const count = reviews.length;
        const avg =
          count > 0
            ? Number((reviews.reduce((sum, r) => sum + r.nota, 0) / count).toFixed(2))
            : 0;
        return [book.id_livro, { nota_media: avg, total_avaliacoes: count }] as const;
      }),
    );
    const reviewsMap = new Map(reviewsEntries);

    return merged.map((book) => {
      const fallback = reviewsMap.get(book.id_livro);
      if (!fallback) return book;
      return {
        ...book,
        nota_media: fallback.nota_media,
        total_avaliacoes: fallback.total_avaliacoes,
      };
    });
  }

  return merged;
}

function applyClientFiltersAndSort(
  books: BookSearchResult[],
  filters: BookSearchFilters,
): BookSearchResult[] {
  const minRatingValue = filters.minRating === "all" ? 0 : Number(filters.minRating);

  const filtered = books.filter((book) => {
    if (filters.source !== "all" && book.origem !== filters.source) {
      return false;
    }
    if (minRatingValue > 0 && getBookAverageRating(book) < minRatingValue) {
      return false;
    }
    return true;
  });

  if (filters.sort === "popularity") {
    filtered.sort(
      (a, b) =>
        getBookPopularity(b) - getBookPopularity(a) ||
        getBookAverageRating(b) - getBookAverageRating(a),
    );
  } else if (filters.sort === "rating") {
    filtered.sort(
      (a, b) =>
        getBookAverageRating(b) - getBookAverageRating(a) ||
        getBookReviewCount(b) - getBookReviewCount(a) ||
        getBookPopularity(b) - getBookPopularity(a),
    );
  } else if (filters.sort === "title") {
    filtered.sort((a, b) => a.titulo.localeCompare(b.titulo) || a.id_livro - b.id_livro);
  } else if (filters.sort === "newest" || filters.sort === "oldest") {
    const direction = filters.sort === "newest" ? -1 : 1;
    filtered.sort(
      (a, b) =>
        direction * (Date.parse(a.data_publicacao) - Date.parse(b.data_publicacao)) ||
        a.id_livro - b.id_livro,
    );
  } else if (filters.query) {
    const query = filters.query.toLocaleLowerCase();
    filtered.sort((a, b) => {
      const aStarts = a.titulo.toLocaleLowerCase().startsWith(query) ? 0 : 1;
      const bStarts = b.titulo.toLocaleLowerCase().startsWith(query) ? 0 : 1;
      return aStarts - bStarts;
    });
  }

  return filtered;
}

/**
 * Searches the public catalog through `GET /books` and enriches results with
 * popularity and rating metrics from `/v2/books` or book reviews when available.
 */
export async function searchBooks(filters: BookSearchFilters): Promise<BookSearchResponse> {
  const backendUrl = getBackendUrl();
  const params = new URLSearchParams();

  if (filters.query) params.set("q", filters.query);
  if (filters.author) params.set("author", filters.author);
  if (filters.genre) params.set("genre", filters.genre);
  if (filters.source !== "all") params.set("source", filters.source);
  if (filters.minRating !== "all") params.set("min_rating", filters.minRating);
  if (filters.sort === "popularity" || filters.sort === "rating") {
    params.set("sort", filters.sort);
  }

  try {
    const queryString = params.toString();
    const [response, v2CatalogRes] = await Promise.all([
      fetch(`${backendUrl}/books${queryString ? `?${queryString}` : ""}`, {
        cache: "no-store",
      }),
      fetchJsonOrNull<BookSearchResult[] | PaginatedBooksResponse>(
        `${backendUrl}/v2/books?limit=100`,
      ),
    ]);

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

    const v2BooksMap = new Map<number, BookSearchResult>();
    if (v2CatalogRes.ok) {
      for (const item of extractBookList(v2CatalogRes.data)) {
        if (item && typeof item.id_livro === "number") {
          v2BooksMap.set(item.id_livro, item);
        }
      }
    }

    const data = (await response.json()) as BookSearchResult[] | PaginatedBooksResponse;

    if (Array.isArray(data)) {
      const enriched = await enrichBooksWithMetrics(data, v2BooksMap);
      const filteredBooks = applyClientFiltersAndSort(enriched, filters);
      const start = (filters.page - 1) * BOOK_SEARCH_PAGE_SIZE;

      return {
        status: "ok",
        books: filteredBooks.slice(start, start + BOOK_SEARCH_PAGE_SIZE),
        total: filteredBooks.length,
        page: filters.page,
        pageSize: BOOK_SEARCH_PAGE_SIZE,
      };
    }

    if (data && Array.isArray(data.items)) {
      const enriched = await enrichBooksWithMetrics(data.items, v2BooksMap);
      const filteredBooks = applyClientFiltersAndSort(enriched, filters);

      return {
        status: "ok",
        books: filteredBooks,
        total:
          filters.minRating !== "all" || filters.source !== "all"
            ? filteredBooks.length
            : typeof data.total === "number"
              ? data.total
              : filteredBooks.length,
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
  const backendUrl = getBackendUrl();

  for (const endpoint of [`${backendUrl}/v2/genres`, `${backendUrl}/genres`]) {
    try {
      const response = await fetch(endpoint, {
        cache: "no-store",
      });

      if (!response.ok) {
        continue;
      }

      const genres = (await response.json()) as Genre[];
      if (Array.isArray(genres)) {
        return [...genres].sort((a, b) => a.nome.localeCompare(b.nome));
      }
    } catch {
      // Try next endpoint fallback
    }
  }

  return [];
}

export type ReadingProgressItem = {
  id_progresso?: number;
  id_usuario: number;
  id_livro: number;
  ultima_posicao?: string | null;
  paginas_distintas_lidas: number;
  concluido_em?: string | null;
};

export type ReadingSessionItem = {
  id_sessao: number;
  id_usuario: number;
  id_livro: number;
  inicio: string;
  fim?: string | null;
  tempo_ativo_segundos: number;
};

export type PublicProfile = {
  id_usuario: number;
  nome_perfil: string;
  biografia: string;
  id_avatar?: number | null;
  id_icone?: number | null;
  nivel?: string | null;
};

export type SocialActivityItem = {
  id: string;
  userId: number;
  username: string;
  bookId: number;
  bookTitle: string;
  authorName: string | null;
  rating: number;
  reviewText: string | null;
  createdAt: string;
};

export type SignedHomeData = {
  myReadings: BookSearchResult[];
  readingProgress: ReadingProgressItem[];
  favorites: BookSearchResult[];
  myStories: BookSearchResult[];
  toBeRead: BookSearchResult[];
  myReviews: { book: BookSearchResult; review: Review }[];
  socials: SocialActivityItem[];
};

async function fetchJsonOrNull<T>(
  url: string,
  headers?: HeadersInit,
): Promise<{ ok: true; data: T } | { ok: false; status: number }> {
  try {
    const response = await fetch(url, {
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      return { ok: false, status: response.status };
    }

    const data = (await response.json()) as T;
    return { ok: true, data };
  } catch {
    return { ok: false, status: 0 };
  }
}

function extractBookList(
  payload: BookSearchResult[] | PaginatedBooksResponse | null | undefined,
): BookSearchResult[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && Array.isArray(payload.items)) {
    return payload.items;
  }

  return [];
}

async function resolveBooksByIds(
  ids: number[],
  bookMap: Map<number, BookSearchResult>,
): Promise<BookSearchResult[]> {
  const uniqueIds = Array.from(new Set(ids.filter((id) => Number.isInteger(id) && id > 0)));
  const missingIds = uniqueIds.filter((id) => !bookMap.has(id));

  if (missingIds.length > 0) {
    const fetchedResults = await Promise.all(missingIds.map((id) => getBookById(id)));
    for (const result of fetchedResults) {
      if (result.status === "ok") {
        bookMap.set(result.book.id_livro, result.book);
      }
    }
  }

  return uniqueIds
    .map((id) => bookMap.get(id))
    .filter((book): book is BookSearchResult => Boolean(book));
}

async function fetchPublicProfileName(
  userId: number,
  currentUser: CurrentUser | null,
): Promise<string> {
  if (currentUser && currentUser.id === userId) {
    return currentUser.username;
  }

  const backendUrl = getBackendUrl();
  const v2Profile = await fetchJsonOrNull<PublicProfile>(`${backendUrl}/v2/profiles/${userId}`);
  if (v2Profile.ok && v2Profile.data?.nome_perfil) {
    return v2Profile.data.nome_perfil;
  }

  const rootProfile = await fetchJsonOrNull<PublicProfile>(`${backendUrl}/profiles/${userId}`);
  if (rootProfile.ok && rootProfile.data?.nome_perfil) {
    return rootProfile.data.nome_perfil;
  }

  return `user_${userId}`;
}

export async function getSignedHomeData(
  currentUser: CurrentUser | null,
): Promise<SignedHomeData> {
  const backendUrl = getBackendUrl();
  const token = (await cookies()).get(accessTokenCookieName)?.value;
  const authHeaders: HeadersInit | undefined = token
    ? { Authorization: `Bearer ${token}` }
    : undefined;

  const [
    catalogResponse,
    v2ProgressResponse,
    v2SessionsResponse,
    v2FavoritesResponse,
    v2ToReadResponse,
    v2MyBooksResponse,
    myReviewsResponse,
    recentReviewsResponse,
  ] = await Promise.all([
    fetchJsonOrNull<BookSearchResult[] | PaginatedBooksResponse>(`${backendUrl}/books`),
    authHeaders
      ? fetchJsonOrNull<ReadingProgressItem[]>(`${backendUrl}/v2/me/progress`, authHeaders)
      : Promise.resolve({ ok: false as const, status: 401 }),
    authHeaders
      ? fetchJsonOrNull<ReadingSessionItem[]>(`${backendUrl}/v2/me/sessions`, authHeaders)
      : Promise.resolve({ ok: false as const, status: 401 }),
    authHeaders
      ? fetchJsonOrNull<ListItem[]>(`${backendUrl}/v2/me/lists?tipo=favorito`, authHeaders)
      : Promise.resolve({ ok: false as const, status: 401 }),
    authHeaders
      ? fetchJsonOrNull<ListItem[]>(`${backendUrl}/v2/me/lists?tipo=ler_depois`, authHeaders)
      : Promise.resolve({ ok: false as const, status: 401 }),
    authHeaders
      ? fetchJsonOrNull<BookSearchResult[]>(`${backendUrl}/v2/me/books`, authHeaders)
      : Promise.resolve({ ok: false as const, status: 401 }),
    authHeaders
      ? fetchJsonOrNull<Review[]>(`${backendUrl}/v2/me/reviews`, authHeaders)
      : Promise.resolve({ ok: false as const, status: 401 }),
    fetchJsonOrNull<Review[]>(`${backendUrl}/v2/reviews/recent?limit=6`),
  ]);

  const bookMap = new Map<number, BookSearchResult>();

  for (const list of [
    catalogResponse.ok ? extractBookList(catalogResponse.data) : [],
    v2MyBooksResponse.ok && Array.isArray(v2MyBooksResponse.data)
      ? v2MyBooksResponse.data
      : [],
  ]) {
    for (const book of list) {
      if (book && typeof book.id_livro === "number") {
        const existing = bookMap.get(book.id_livro);
        bookMap.set(book.id_livro, existing ? { ...book, ...existing } : book);
      }
    }
  }

  // Books the reader has actually started, including finished books.
  const startedBookIds = new Set<number>();

  if (v2ProgressResponse.ok && Array.isArray(v2ProgressResponse.data)) {
    for (const item of v2ProgressResponse.data) {
      startedBookIds.add(item.id_livro);
    }
  }

  if (v2SessionsResponse.ok && Array.isArray(v2SessionsResponse.data)) {
    for (const session of v2SessionsResponse.data) {
      startedBookIds.add(session.id_livro);
    }
  }

  const myReadings = await resolveBooksByIds(Array.from(startedBookIds), bookMap);

  // Favorites are a separate shelf from reading progress.
  const favoriteIds: number[] = [];
  if (v2FavoritesResponse.ok && Array.isArray(v2FavoritesResponse.data)) {
    for (const item of v2FavoritesResponse.data) {
      favoriteIds.push(item.id_livro);
    }
  }
  const favorites = await resolveBooksByIds(favoriteIds, bookMap);

  // My stories (books published/created by the current user)
  const myStoryIds: number[] = [];
  if (v2MyBooksResponse.ok && Array.isArray(v2MyBooksResponse.data)) {
    for (const book of v2MyBooksResponse.data) {
      if (book.status_publicacao === "publicado" && !book.status_bloqueado) {
        myStoryIds.push(book.id_livro);
      }
    }
  }
  if (currentUser) {
    for (const book of bookMap.values()) {
      if (
        book.id_publicador === currentUser.id &&
        book.status_publicacao === "publicado" &&
        !book.status_bloqueado
      ) {
        myStoryIds.push(book.id_livro);
      }
    }
  }
  const myStories = await resolveBooksByIds(myStoryIds, bookMap);

  // To-be-read only holds books that have not been started yet.
  const toReadIds: number[] = [];
  if (v2ToReadResponse.ok && Array.isArray(v2ToReadResponse.data)) {
    for (const item of v2ToReadResponse.data) {
      if (!startedBookIds.has(item.id_livro)) {
        toReadIds.push(item.id_livro);
      }
    }
  }
  const toBeRead = await resolveBooksByIds(toReadIds, bookMap);

  const toBookReviews = (reviews: Review[]) => reviews.flatMap((review) => {
    const book = bookMap.get(review.id_livro);
    return book ? [{ book, review }] : [];
  });
  const myReviews = toBookReviews(
    myReviewsResponse.ok && Array.isArray(myReviewsResponse.data) ? myReviewsResponse.data : [],
  );
  const recentSocialReviews = toBookReviews(
    recentReviewsResponse.ok && Array.isArray(recentReviewsResponse.data)
      ? recentReviewsResponse.data
      : [],
  );
  const uniqueReviewerIds = Array.from(
    new Set(recentSocialReviews.map((entry) => entry.review.id_usuario)),
  );
  const profileNamesEntries = await Promise.all(
    uniqueReviewerIds.map(async (userId) => [
      userId,
      await fetchPublicProfileName(userId, currentUser),
    ] as const),
  );
  const profileNameMap = new Map<number, string>(profileNamesEntries);

  const socials: SocialActivityItem[] = recentSocialReviews.map(({ book, review }) => {
    const authorNames = (book.autores ?? []).map((author) => author.nome).filter(Boolean);
    return {
      id: `${review.id_avaliacao}-${book.id_livro}`,
      userId: review.id_usuario,
      username: profileNameMap.get(review.id_usuario) ?? `user_${review.id_usuario}`,
      bookId: book.id_livro,
      bookTitle: book.titulo,
      authorName: authorNames.length > 0 ? authorNames.join(", ") : null,
      rating: review.nota,
      reviewText: review.texto_revisao,
      createdAt: review.data_hora,
    };
  });

  return {
    myReadings,
    readingProgress:
      v2ProgressResponse.ok && Array.isArray(v2ProgressResponse.data)
        ? v2ProgressResponse.data
        : [],
    favorites,
    myStories,
    toBeRead,
    myReviews,
    socials,
  };
}

export type RecommendationReason =
  | "genre"
  | "author"
  | "trending"
  | "rating"
  | "discovery";

export type BookRecommendation = {
  book: BookSearchResult;
  reason: string;
  reason_type: RecommendationReason;
};

export type ContinueReadingItem = {
  book: BookSearchResult;
  pagesRead: number;
  progressPercent: number;
};

export type GenreShelf = {
  genre: Genre;
  books: BookSearchResult[];
};

export type ForYouHomeData = {
  continueReading: ContinueReadingItem[];
  recommendations: BookRecommendation[];
  trending: BookRecommendation[];
  genreShelves: GenreShelf[];
  socials: SocialActivityItem[];
  isColdStart: boolean;
};

export async function getForYouHomeData(
  currentUser: CurrentUser,
): Promise<ForYouHomeData> {
  const backendUrl = getBackendUrl();
  const token = (await cookies()).get(accessTokenCookieName)?.value;
  const authHeaders: HeadersInit | undefined = token
    ? { Authorization: `Bearer ${token}` }
    : undefined;

  const [library, recommendationsResponse, trendingResponse, catalogResponse] =
    await Promise.all([
      getSignedHomeData(currentUser),
      authHeaders
        ? fetchJsonOrNull<BookRecommendation[]>(
            `${backendUrl}/v2/me/recommendations?limit=12`,
            authHeaders,
          )
        : Promise.resolve({ ok: false as const, status: 401 }),
      fetchJsonOrNull<BookRecommendation[]>(`${backendUrl}/v2/books/trending?limit=12`),
      fetchJsonOrNull<BookSearchResult[] | PaginatedBooksResponse>(`${backendUrl}/books`),
    ]);

  const progressByBook = new Map(
    library.readingProgress.map((progress) => [progress.id_livro, progress]),
  );
  const continueReading = library.myReadings
    .flatMap((book): ContinueReadingItem[] => {
      const progress = progressByBook.get(book.id_livro);
      if (progress?.concluido_em) return [];
      const pagesRead = Math.min(progress?.paginas_distintas_lidas ?? 0, book.total_paginas);
      return [
        {
          book,
          pagesRead,
          progressPercent:
            book.total_paginas > 0 ? Math.round((pagesRead / book.total_paginas) * 100) : 0,
        },
      ];
    })
    .sort((a, b) => b.progressPercent - a.progressPercent)
    .slice(0, 6);

  const recommendations =
    recommendationsResponse.ok && Array.isArray(recommendationsResponse.data)
      ? recommendationsResponse.data
      : [];
  const trending =
    trendingResponse.ok && Array.isArray(trendingResponse.data)
      ? trendingResponse.data
      : [];
  const catalog = catalogResponse.ok ? extractBookList(catalogResponse.data) : [];
  const allBooks = new Map<number, BookSearchResult>();
  for (const book of [
    ...catalog,
    ...recommendations.map((item) => item.book),
    ...trending.map((item) => item.book),
  ]) {
    allBooks.set(book.id_livro, book);
  }

  const genreBooks = new Map<number, { genre: Genre; books: BookSearchResult[] }>();
  for (const book of allBooks.values()) {
    for (const genre of book.generos ?? []) {
      if (genre.nome.trim().length < 3) continue;
      const shelf = genreBooks.get(genre.id_genero) ?? { genre, books: [] };
      shelf.books.push(book);
      genreBooks.set(genre.id_genero, shelf);
    }
  }
  const genreShelves = Array.from(genreBooks.values())
    .sort(
      (a, b) =>
        b.books.length - a.books.length || a.genre.nome.localeCompare(b.genre.nome),
    )
    .slice(0, 4)
    .map((shelf) => ({ ...shelf, books: shelf.books.slice(0, 6) }));

  return {
    continueReading,
    recommendations,
    trending,
    genreShelves,
    socials: library.socials,
    isColdStart:
      recommendations.length === 0 ||
      recommendations.every(
        (item) => item.reason_type !== "genre" && item.reason_type !== "author",
      ),
  };
}
