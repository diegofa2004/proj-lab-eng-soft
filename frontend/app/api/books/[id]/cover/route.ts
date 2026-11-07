import { NextResponse } from "next/server";

import { getBackendUrl } from "@/app/lib/books";

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
    const backendResponse = await fetch(`${getBackendUrl()}/v2/books/${bookId}/cover`, {
      cache: "no-store",
    });
    if (!backendResponse.ok || !backendResponse.body) {
      return NextResponse.json({ detail: "Cover not available." }, { status: backendResponse.status });
    }
    return new NextResponse(backendResponse.body, {
      headers: {
        "Content-Type": backendResponse.headers.get("Content-Type") ?? "image/jpeg",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ detail: "The catalog service is unavailable." }, { status: 502 });
  }
}
