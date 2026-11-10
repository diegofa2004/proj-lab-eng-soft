import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/app/lib/auth";
import {
  getBackendUrl,
  type Author,
  type Book,
  type BookSearchResult,
  type Genre,
  type Review,
  type StatusPublicacao,
} from "@/app/lib/books";
import { accessTokenCookieName } from "@/app/lib/session";

export type AdminUser = {
  id: number;
  username: string;
  email: string;
  biography: string;
  is_blocked: boolean;
  is_admin: boolean;
  created_at: string;
};

export type AdminReview = Review & {
  titulo_livro: string;
  nome_usuario: string;
};

export type AdminBook = Book & {
  autores?: Author[];
  generos?: Genre[];
  relationsLoaded?: boolean;
};

export type AdminBookMetadataUpdatePayload = {
  titulo?: string;
  descricao?: string;
  data_publicacao?: string;
  total_paginas?: number;
  status_publicacao?: StatusPublicacao;
  status_bloqueado?: boolean;
  autores?: number[];
  generos?: number[];
};

export type AdminStats = {
  users: { total: number; active: number; blocked: number };
  books: number;
  accesses: number;
  reviews: number;
};

export type AdminActionType =
  | "bloquear_usuario"
  | "desbloquear_usuario"
  | "bloquear_livro"
  | "desbloquear_livro"
  | "moderar_avaliacao"
  | "editar_livro";

export type AdminActivity = {
  id_log: number;
  id_admin: number;
  id_usuario_alvo: number | null;
  id_livro_alvo: number | null;
  id_avaliacao_alvo: number | null;
  tipo_acao: AdminActionType;
  descricao: string;
  data_hora: string;
};

export type EnrichedAdminActivity = AdminActivity & {
  admin_username?: string | null;
  target_user?: {
    id: number;
    username: string;
    email: string;
    is_blocked: boolean;
  } | null;
  target_book?: {
    id_livro: number;
    titulo: string;
    status_publicacao: StatusPublicacao;
    status_bloqueado: boolean;
  } | null;
  target_review?: {
    id_avaliacao: number;
    id_livro: number;
    id_usuario: number;
    nota: number;
    texto_revisao: string | null;
    is_removida: boolean;
    titulo_livro?: string;
    nome_usuario?: string;
  } | null;
};

export async function requireAdmin() {
  const user = await requireCurrentUser();
  if (!user.is_admin) redirect("/profile");
  return user;
}

export async function getAdminData<T>(path: string): Promise<T | null> {
  const token = (await cookies()).get(accessTokenCookieName)?.value;
  if (!token) return null;

  try {
    const response = await fetch(`${getBackendUrl()}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function getAdminAuthors(): Promise<Author[]> {
  const backendUrl = getBackendUrl();

  for (const endpoint of [`${backendUrl}/v2/authors`, `${backendUrl}/authors`]) {
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) continue;

      const authors = (await response.json()) as Author[];
      if (Array.isArray(authors)) {
        return [...authors].sort((a, b) => a.nome.localeCompare(b.nome));
      }
    } catch {
      // Try next fallback endpoint
    }
  }

  return [];
}

export async function getAdminGenres(): Promise<Genre[]> {
  const backendUrl = getBackendUrl();

  for (const endpoint of [`${backendUrl}/v2/genres`, `${backendUrl}/genres`]) {
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) continue;

      const genres = (await response.json()) as Genre[];
      if (Array.isArray(genres)) {
        return [...genres].sort((a, b) => a.nome.localeCompare(b.nome));
      }
    } catch {
      // Try next fallback endpoint
    }
  }

  return [];
}

export async function enrichAdminBooks(books: AdminBook[]): Promise<AdminBook[]> {
  if (books.length === 0) return [];

  try {
    const response = await fetch(`${getBackendUrl()}/books`, {
      cache: "no-store",
    });
    if (!response.ok) return books;

    const catalogBooks = (await response.json()) as BookSearchResult[];
    if (!Array.isArray(catalogBooks)) return books;

    const catalogMap = new Map<number, BookSearchResult>();
    for (const item of catalogBooks) {
      if (item && typeof item.id_livro === "number") {
        catalogMap.set(item.id_livro, item);
      }
    }

    return books.map((book) => {
      const catalogEntry = catalogMap.get(book.id_livro);
      if (!catalogEntry) return book;

      return {
        ...book,
        capa_url: book.capa_url ?? catalogEntry.capa_url ?? null,
        autores: Array.isArray(catalogEntry.autores) ? catalogEntry.autores : book.autores,
        generos: Array.isArray(catalogEntry.generos) ? catalogEntry.generos : book.generos,
        relationsLoaded:
          Array.isArray(catalogEntry.autores) && Array.isArray(catalogEntry.generos),
      };
    });
  } catch {
    return books;
  }
}

export async function getAdminBookById(bookId: number): Promise<AdminBook | null> {
  if (!Number.isSafeInteger(bookId) || bookId <= 0) {
    return null;
  }

  const PAGE_LIMIT = 100;
  let matchedBook: AdminBook | null = null;

  for (let offset = 0; offset < 1000; offset += PAGE_LIMIT) {
    const batch = await getAdminData<AdminBook[]>(
      `/v2/admin/books?limit=${PAGE_LIMIT}&offset=${offset}`,
    );
    if (!batch || batch.length === 0) {
      break;
    }

    const found = batch.find((item) => item.id_livro === bookId);
    if (found) {
      matchedBook = found;
      break;
    }

    if (batch.length < PAGE_LIMIT) {
      break;
    }
  }

  const backendUrl = getBackendUrl();
  for (const endpoint of [`${backendUrl}/v2/books/${bookId}`, `${backendUrl}/books/${bookId}`]) {
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) continue;

      const detail = (await response.json()) as BookSearchResult;
      if (detail && typeof detail.id_livro === "number") {
        const base = matchedBook ?? detail;
        return {
          ...base,
          capa_url: base.capa_url ?? detail.capa_url ?? null,
          autores: Array.isArray(detail.autores) ? detail.autores : [],
          generos: Array.isArray(detail.generos) ? detail.generos : [],
          relationsLoaded: Array.isArray(detail.autores) && Array.isArray(detail.generos),
        };
      }
    } catch {
      // Ignore public endpoint error when book is draft or blocked
    }
  }

  return matchedBook;
}

export async function getAdminActivities(options?: {
  limit?: number;
  offset?: number;
}): Promise<AdminActivity[] | null> {
  const safeLimit = Math.min(Math.max(1, options?.limit ?? 50), 100);
  const safeOffset = Math.max(0, options?.offset ?? 0);
  const query = new URLSearchParams({
    limit: String(safeLimit),
    offset: String(safeOffset),
  });

  const v2Actions = await getAdminData<AdminActivity[]>(`/v2/admin/actions?${query}`);
  if (Array.isArray(v2Actions)) {
    return v2Actions;
  }

  const legacyActivities = await getAdminData<AdminActivity[]>("/admin/activities");
  if (Array.isArray(legacyActivities)) {
    return legacyActivities.slice(safeOffset, safeOffset + safeLimit);
  }

  return null;
}

export async function enrichAdminActivities(
  activities: AdminActivity[],
): Promise<EnrichedAdminActivity[]> {
  if (activities.length === 0) return [];

  const [users, books, reviews] = await Promise.all([
    getAdminData<AdminUser[]>("/v2/admin/users?limit=100"),
    getAdminData<AdminBook[]>("/v2/admin/books?limit=100"),
    getAdminData<Review[]>("/v2/admin/reviews?limit=100"),
  ]);

  const userMap = new Map<number, AdminUser>();
  if (Array.isArray(users)) {
    for (const user of users) {
      if (user && typeof user.id === "number") {
        userMap.set(user.id, user);
      }
    }
  }

  const bookMap = new Map<number, AdminBook>();
  if (Array.isArray(books)) {
    for (const book of books) {
      if (book && typeof book.id_livro === "number") {
        bookMap.set(book.id_livro, book);
      }
    }
  }

  const reviewMap = new Map<number, Review>();
  if (Array.isArray(reviews)) {
    for (const review of reviews) {
      if (review && typeof review.id_avaliacao === "number") {
        reviewMap.set(review.id_avaliacao, review);
      }
    }
  }

  return activities.map((activity) => {
    const adminUser = userMap.get(activity.id_admin);
    const targetUser =
      activity.id_usuario_alvo !== null ? userMap.get(activity.id_usuario_alvo) : undefined;
    const targetBook =
      activity.id_livro_alvo !== null ? bookMap.get(activity.id_livro_alvo) : undefined;
    const targetReview =
      activity.id_avaliacao_alvo !== null ? reviewMap.get(activity.id_avaliacao_alvo) : undefined;

    const reviewBook = targetReview ? bookMap.get(targetReview.id_livro) : undefined;
    const reviewAuthor = targetReview ? userMap.get(targetReview.id_usuario) : undefined;

    return {
      ...activity,
      admin_username: adminUser?.username ?? null,
      target_user: targetUser
        ? {
            id: targetUser.id,
            username: targetUser.username,
            email: targetUser.email,
            is_blocked: targetUser.is_blocked,
          }
        : null,
      target_book: targetBook
        ? {
            id_livro: targetBook.id_livro,
            titulo: targetBook.titulo,
            status_publicacao: targetBook.status_publicacao,
            status_bloqueado: targetBook.status_bloqueado,
          }
        : null,
      target_review: targetReview
        ? {
            id_avaliacao: targetReview.id_avaliacao,
            id_livro: targetReview.id_livro,
            id_usuario: targetReview.id_usuario,
            nota: targetReview.nota,
            texto_revisao: targetReview.texto_revisao,
            is_removida: targetReview.is_removida,
            titulo_livro: reviewBook?.titulo,
            nome_usuario: reviewAuthor?.username,
          }
        : null,
    };
  });
}

