import { NextResponse, type NextRequest } from "next/server";

import { getBackendUrl } from "@/app/lib/books";

const forwardedSearchParams = ["q", "author", "genre", "source", "sort", "page", "page_size"];

export async function GET(request: NextRequest) {
  const backendParams = new URLSearchParams();

  for (const name of forwardedSearchParams) {
    const value = request.nextUrl.searchParams.get(name)?.trim();
    if (value) {
      backendParams.set(name, value);
    }
  }

  const queryString = backendParams.toString();

  try {
    const backendResponse = await fetch(
      `${getBackendUrl()}/books${queryString ? `?${queryString}` : ""}`,
      { cache: "no-store" },
    );
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

