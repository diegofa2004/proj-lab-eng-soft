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
    const backendResponse = await fetch(`${getBackendUrl()}/books/${bookId}`, {
      cache: "no-store",
    });
    const responseBody = await backendResponse.text();

    try {
      return NextResponse.json(JSON.parse(responseBody), { status: backendResponse.status });
    } catch {
      return NextResponse.json(
        { detail: responseBody || "The catalog service returned an invalid response." },
        { status: backendResponse.status },
      );
    }
  } catch {
    return NextResponse.json(
      { detail: "The catalog service is unavailable." },
      { status: 502 },
    );
  }
}

async function forwardBookUpdate(
  request: Request,
  context: RouteContext,
  method: "PATCH" | "PUT",
) {
  const { id } = await context.params;
  const bookId = Number(id);

  if (!Number.isSafeInteger(bookId) || bookId <= 0) {
    return NextResponse.json({ detail: "Invalid book ID." }, { status: 422 });
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ detail: "Invalid request origin." }, { status: 403 });
  }

  const token = (await cookies()).get(accessTokenCookieName)?.value;
  if (!token) {
    return NextResponse.json({ detail: "Sign in to update book metadata." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Request body must be valid JSON." }, { status: 400 });
  }

  const endpoint =
    method === "PUT"
      ? `${getBackendUrl()}/v2/books/${bookId}`
      : `${getBackendUrl()}/admin/books/${bookId}`;

  try {
    const backendResponse = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const responseBody = await backendResponse.text();
    return new NextResponse(responseBody, {
      status: backendResponse.status,
      headers: {
        "Content-Type": backendResponse.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch {
    return NextResponse.json(
      { detail: "The catalog service is unavailable." },
      { status: 502 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  return forwardBookUpdate(request, context, "PATCH");
}

export async function PUT(request: Request, context: RouteContext) {
  return forwardBookUpdate(request, context, "PUT");
}
