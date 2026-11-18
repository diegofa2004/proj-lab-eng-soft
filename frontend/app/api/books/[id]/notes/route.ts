import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getBackendUrl } from "@/app/lib/books";
import { accessTokenCookieName } from "@/app/lib/session";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseBookId(value: string): number | null {
  const bookId = Number(value);
  return Number.isInteger(bookId) && bookId > 0 ? bookId : null;
}

function parseLocation(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const bookId = parseBookId(id);

  if (bookId === null) {
    return NextResponse.json({ detail: "Invalid book ID." }, { status: 422 });
  }

  const token = (await cookies()).get(accessTokenCookieName)?.value;
  if (!token) {
    return NextResponse.json(
      { detail: "Please sign in to view your notes." },
      { status: 401 },
    );
  }

  try {
    const backendResponse = await fetch(
      `${getBackendUrl()}/v2/me/notes?book_id=${bookId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );
    const responseBody = await backendResponse.text();

    try {
      return NextResponse.json(JSON.parse(responseBody), { status: backendResponse.status });
    } catch {
      return NextResponse.json(
        { detail: responseBody || "The notes service returned an invalid response." },
        { status: backendResponse.status },
      );
    }
  } catch {
    return NextResponse.json({ detail: "The notes service is unavailable." }, { status: 502 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const bookId = parseBookId(id);

  if (bookId === null) {
    return NextResponse.json({ detail: "Invalid book ID." }, { status: 422 });
  }

  const token = (await cookies()).get(accessTokenCookieName)?.value;
  if (!token) {
    return NextResponse.json(
      { detail: "Please sign in to create a note." },
      { status: 401 },
    );
  }

  let body: { texto?: unknown; localizacao?: unknown };
  try {
    body = (await request.json()) as { texto?: unknown; localizacao?: unknown };
  } catch {
    return NextResponse.json({ detail: "Request body must be valid JSON." }, { status: 400 });
  }

  if (typeof body.texto !== "string" || body.texto.trim().length === 0) {
    return NextResponse.json({ detail: "Note text is required." }, { status: 422 });
  }

  const location = parseLocation(body.localizacao);
  if (body.localizacao !== undefined && location === undefined) {
    return NextResponse.json({ detail: "Invalid note location." }, { status: 422 });
  }

  try {
    const backendResponse = await fetch(`${getBackendUrl()}/v2/me/notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id_livro: bookId,
        texto: body.texto.trim(),
        localizacao: location ?? null,
      }),
      cache: "no-store",
    });
    const responseBody = await backendResponse.text();

    try {
      return NextResponse.json(JSON.parse(responseBody), { status: backendResponse.status });
    } catch {
      return NextResponse.json(
        { detail: responseBody || "The notes service returned an invalid response." },
        { status: backendResponse.status },
      );
    }
  } catch {
    return NextResponse.json({ detail: "The notes service is unavailable." }, { status: 502 });
  }
}
