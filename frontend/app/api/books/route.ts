import { NextResponse, type NextRequest } from "next/server";

import {
  buildJsonResponseFromText,
  getSessionToken,
  isSameOriginRequest,
} from "@/app/api/_lib/subscription";
import { getBackendUrl, parseBookSearchParams, searchBooks } from "@/app/lib/books";

export async function GET(request: NextRequest) {
  const filters = parseBookSearchParams(Object.fromEntries(request.nextUrl.searchParams));
  const result = await searchBooks(filters);

  if (result.status === "unavailable") {
    return NextResponse.json({ detail: result.detail }, { status: 502 });
  }

  return NextResponse.json({
    items: result.books,
    total: result.total,
    page: result.page,
    page_size: result.pageSize,
  });
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ detail: "Invalid request origin." }, { status: 403 });
  }

  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ detail: "Sign in to publish a book." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ detail: "Publish a valid book payload." }, { status: 422 });
  }

  try {
    const backendResponse = await fetch(`${getBackendUrl()}/v2/books`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    return buildJsonResponseFromText(
      await backendResponse.text(),
      backendResponse.status,
      "The publishing service returned an invalid response.",
    );
  } catch {
    return NextResponse.json({ detail: "The publishing service is unavailable." }, { status: 502 });
  }
}
