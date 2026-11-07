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

  const token = (await cookies()).get(accessTokenCookieName)?.value;
  try {
    const backendResponse = await fetch(`${getBackendUrl()}/books/${bookId}/content`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: "no-store",
    });
    if (!backendResponse.ok || !backendResponse.body) {
      return new NextResponse(await backendResponse.text(), {
        status: backendResponse.status,
        headers: { "Content-Type": backendResponse.headers.get("Content-Type") ?? "text/plain" },
      });
    }
    return new NextResponse(backendResponse.body, {
      status: 200,
      headers: {
        "Content-Type": backendResponse.headers.get("Content-Type") ?? "application/epub+zip",
        "Content-Disposition": backendResponse.headers.get("Content-Disposition") ?? "attachment",
      },
    });
  } catch {
    return NextResponse.json({ detail: "The catalog service is unavailable." }, { status: 502 });
  }
}
