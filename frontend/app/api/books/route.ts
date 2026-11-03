import { NextResponse, type NextRequest } from "next/server";

import { parseBookSearchParams, searchBooks } from "@/app/lib/books";

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
