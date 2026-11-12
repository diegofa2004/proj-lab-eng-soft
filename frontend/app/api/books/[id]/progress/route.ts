import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getBackendUrl } from "@/app/lib/books";
import { accessTokenCookieName } from "@/app/lib/session";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function bookIdAndToken(context: RouteContext) {
  const { id } = await context.params;
  const bookId = Number(id);
  const token = (await cookies()).get(accessTokenCookieName)?.value;
  return { bookId, token };
}

export async function GET(_request: Request, context: RouteContext) {
  const { bookId, token } = await bookIdAndToken(context);
  if (!Number.isSafeInteger(bookId) || bookId <= 0) {
    return NextResponse.json({ detail: "Invalid book ID." }, { status: 422 });
  }
  if (!token) {
    return NextResponse.json({ detail: "Sign in to save reading progress." }, { status: 401 });
  }

  try {
    const response = await fetch(`${getBackendUrl()}/books/${bookId}/progress`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json({ detail: "Reading progress is unavailable." }, { status: 502 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const { bookId, token } = await bookIdAndToken(context);
  if (!Number.isSafeInteger(bookId) || bookId <= 0) {
    return NextResponse.json({ detail: "Invalid book ID." }, { status: 422 });
  }
  if (!token) {
    return NextResponse.json({ detail: "Sign in to save reading progress." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid request body." }, { status: 400 });
  }
  const { position, pagesRead } = (body ?? {}) as { position?: unknown; pagesRead?: unknown };
  if (typeof position !== "string" || !position.startsWith("epubcfi(") || position.length > 2048) {
    return NextResponse.json({ detail: "Invalid EPUB position." }, { status: 422 });
  }
  if (
    pagesRead !== undefined &&
    (typeof pagesRead !== "number" || !Number.isInteger(pagesRead) || pagesRead < 0)
  ) {
    return NextResponse.json({ detail: "Invalid reading page count." }, { status: 422 });
  }

  try {
    const response = await fetch(`${getBackendUrl()}/v2/me/progress/${bookId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ultima_posicao: position, paginas_distintas_lidas: pagesRead ?? 0 }),
      cache: "no-store",
    });
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json({ detail: "Reading progress is unavailable." }, { status: 502 });
  }
}
