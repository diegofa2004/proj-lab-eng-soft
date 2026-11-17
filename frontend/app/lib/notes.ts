import { cookies } from "next/headers";

import { getBackendUrl } from "@/app/lib/books";
import { accessTokenCookieName } from "@/app/lib/session";

export type PersonalNote = {
  id_nota: number;
  id_usuario: number;
  id_livro: number;
  texto: string;
  localizacao: string | null;
  data_criacao: string;
  data_atualizacao: string;
};

export async function getBookNotes(bookId: number): Promise<PersonalNote[]> {
  const token = (await cookies()).get(accessTokenCookieName)?.value;

  if (!token) {
    return [];
  }

  try {
    const response = await fetch(
      `${getBackendUrl()}/v2/me/notes?book_id=${encodeURIComponent(bookId)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return [];
    }

    const notes = (await response.json()) as PersonalNote[];
    return Array.isArray(notes) ? notes : [];
  } catch {
    return [];
  }
}
