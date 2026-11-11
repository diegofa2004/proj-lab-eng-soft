import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getBackendUrl } from "@/app/lib/books";
import { accessTokenCookieName } from "@/app/lib/session";

function isPositiveIntegerList(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "number" && Number.isSafeInteger(item) && item > 0)
  );
}

export async function PUT(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ detail: "Invalid request origin." }, { status: 403 });
  }
  const token = (await cookies()).get(accessTokenCookieName)?.value;
  if (!token) {
    return NextResponse.json({ detail: "Please sign in first." }, { status: 401 });
  }
  let body: { interesses?: unknown; nao_interessa?: unknown };
  try {
    body = (await request.json()) as { interesses?: unknown; nao_interessa?: unknown };
  } catch {
    return NextResponse.json({ detail: "Request body must be valid JSON." }, { status: 400 });
  }
  const interests = body.interesses ?? [];
  const excluded = body.nao_interessa ?? [];
  if (!isPositiveIntegerList(interests) || !isPositiveIntegerList(excluded)) {
    return NextResponse.json({ detail: "Genres must be positive ID lists." }, { status: 422 });
  }
  if (new Set([...interests, ...excluded]).size !== interests.length + excluded.length) {
    return NextResponse.json(
      { detail: "A genre cannot be selected in both lists." },
      { status: 422 },
    );
  }
  try {
    const response = await fetch(`${getBackendUrl()}/v2/me/genre-preferences`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ interesses: interests, nao_interessa: excluded }),
      cache: "no-store",
    });
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" },
    });
  } catch {
    return NextResponse.json({ detail: "Preference service is unavailable." }, { status: 502 });
  }
}
