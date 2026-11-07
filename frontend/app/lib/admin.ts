import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/app/lib/auth";
import { getBackendUrl, type Book, type Review } from "@/app/lib/books";
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

export type AdminBook = Book;

export type AdminStats = {
  users: { total: number; active: number; blocked: number };
  books: number;
  accesses: number;
  reviews: number;
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
