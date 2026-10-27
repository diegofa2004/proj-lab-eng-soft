import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getBackendUrl, type ListItemType } from "@/app/lib/books";
import { accessTokenCookieName } from "@/app/lib/session";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isValidListType(value: unknown): value is ListItemType {
  return value === "favorito" || value === "ler_depois";
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
      { detail: "Please sign in to manage your reading lists." },
      { status: 401 },
    );
  }

  let body: { tipo?: unknown };
  try {
    body = (await request.json()) as { tipo?: unknown };
  } catch {
    return NextResponse.json({ detail: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!isValidListType(body.tipo)) {
    return NextResponse.json({ detail: "Invalid list type." }, { status: 422 });
  }

  try {
    const backendResponse = await fetch(`${getBackendUrl()}/users/me/lists`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id_livro: bookId, tipo: body.tipo }),
      cache: "no-store",
    });
    const responseBody = await backendResponse.text();

    try {
      return NextResponse.json(JSON.parse(responseBody), { status: backendResponse.status });
    } catch {
      return NextResponse.json(
        { detail: responseBody || "The list service returned an invalid response." },
        { status: backendResponse.status },
      );
    }
  } catch {
    return NextResponse.json({ detail: "The list service is unavailable." }, { status: 502 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const bookId = Number(id);

  if (!Number.isInteger(bookId) || bookId <= 0) {
    return NextResponse.json({ detail: "Invalid book ID." }, { status: 422 });
  }

  const token = (await cookies()).get(accessTokenCookieName)?.value;
  if (!token) {
    return NextResponse.json(
      { detail: "Please sign in to manage your reading lists." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo");

  if (!isValidListType(tipo)) {
    return NextResponse.json({ detail: "Invalid list type." }, { status: 422 });
  }

  try {
    const backendResponse = await fetch(`${getBackendUrl()}/users/me/lists/${bookId}/${tipo}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (backendResponse.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const responseBody = await backendResponse.text();
    try {
      return NextResponse.json(JSON.parse(responseBody), { status: backendResponse.status });
    } catch {
      return NextResponse.json(
        { detail: responseBody || "The list service returned an invalid response." },
        { status: backendResponse.status },
      );
    }
  } catch {
    return NextResponse.json({ detail: "The list service is unavailable." }, { status: 502 });
  }
}

