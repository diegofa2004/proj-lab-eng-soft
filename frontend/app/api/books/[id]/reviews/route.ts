import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getBackendUrl } from "@/app/lib/books";
import { accessTokenCookieName } from "@/app/lib/session";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const bookId = Number(id);

  if (!Number.isInteger(bookId) || bookId <= 0) {
    return NextResponse.json({ detail: "Invalid book ID." }, { status: 422 });
  }

  try {
    const backendResponse = await fetch(`${getBackendUrl()}/books/${bookId}/reviews`, {
      cache: "no-store",
    });
    const responseBody = await backendResponse.text();

    try {
      return NextResponse.json(JSON.parse(responseBody), { status: backendResponse.status });
    } catch {
      return NextResponse.json(
        { detail: responseBody || "The reviews service returned an invalid response." },
        { status: backendResponse.status },
      );
    }
  } catch {
    return NextResponse.json(
      { detail: "The reviews service is unavailable." },
      { status: 502 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const bookId = Number(id);

  if (!Number.isInteger(bookId) || bookId <= 0) {
    return NextResponse.json({ detail: "Invalid book ID." }, { status: 422 });
  }

  const token = (await cookies()).get(accessTokenCookieName)?.value;
  if (!token) {
    return NextResponse.json(
      { detail: "Please sign in to submit a review." },
      { status: 401 },
    );
  }

  let body: { nota?: unknown; texto_revisao?: unknown };
  try {
    body = (await request.json()) as { nota?: unknown; texto_revisao?: unknown };
  } catch {
    return NextResponse.json({ detail: "Request body must be valid JSON." }, { status: 400 });
  }

  const nota = Number(body.nota);
  if (!Number.isInteger(nota) || nota < 1 || nota > 5) {
    return NextResponse.json(
      { detail: "Rating must be an integer between 1 and 5." },
      { status: 422 },
    );
  }

  const rawText = typeof body.texto_revisao === "string" ? body.texto_revisao.trim() : "";
  const payload = {
    id_livro: bookId,
    nota,
    texto_revisao: rawText.length > 0 ? rawText : null,
  };

  try {
    const backendResponse = await fetch(`${getBackendUrl()}/books/${bookId}/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const responseBody = await backendResponse.text();

    try {
      return NextResponse.json(JSON.parse(responseBody), { status: backendResponse.status });
    } catch {
      return NextResponse.json(
        { detail: responseBody || "The reviews service returned an invalid response." },
        { status: backendResponse.status },
      );
    }
  } catch {
    return NextResponse.json(
      { detail: "The reviews service is unavailable." },
      { status: 502 },
    );
  }
}

