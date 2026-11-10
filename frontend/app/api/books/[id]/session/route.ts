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

function invalidBook() {
  return NextResponse.json({ detail: "Invalid book ID." }, { status: 422 });
}

export async function POST(_request: Request, context: RouteContext) {
  const { bookId, token } = await bookIdAndToken(context);
  if (!Number.isSafeInteger(bookId) || bookId <= 0) return invalidBook();
  if (!token) {
    return NextResponse.json({ detail: "Sign in to track reading time." }, { status: 401 });
  }

  try {
    const response = await fetch(`${getBackendUrl()}/v2/me/sessions/${bookId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json({ detail: "Reading sessions are unavailable." }, { status: 502 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const { bookId, token } = await bookIdAndToken(context);
  if (!Number.isSafeInteger(bookId) || bookId <= 0) return invalidBook();
  if (!token) {
    return NextResponse.json({ detail: "Sign in to track reading time." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid request body." }, { status: 400 });
  }
  const { sessionId, tempoAtivoSegundos } = (body ?? {}) as {
    sessionId?: unknown;
    tempoAtivoSegundos?: unknown;
  };
  if (typeof sessionId !== "number" || !Number.isSafeInteger(sessionId) || sessionId <= 0) {
    return NextResponse.json({ detail: "Invalid session ID." }, { status: 422 });
  }
  if (
    typeof tempoAtivoSegundos !== "number" ||
    !Number.isInteger(tempoAtivoSegundos) ||
    tempoAtivoSegundos < 0
  ) {
    return NextResponse.json({ detail: "Invalid active time." }, { status: 422 });
  }

  try {
    const response = await fetch(`${getBackendUrl()}/v2/me/sessions/${sessionId}/end`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tempo_ativo_segundos: tempoAtivoSegundos }),
      cache: "no-store",
    });
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json({ detail: "Reading sessions are unavailable." }, { status: 502 });
  }
}
