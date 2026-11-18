import { NextResponse } from "next/server";

import { buildJsonResponseFromText, getSessionToken, isSameOriginRequest } from "@/app/api/_lib/subscription";
import { getBackendUrl } from "@/app/lib/books";

type WritingMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export async function forwardWritingRequest(
  request: Request,
  path: string,
  method: WritingMethod,
  body?: string,
) {
  if (method !== "GET" && !isSameOriginRequest(request)) {
    return NextResponse.json({ detail: "Invalid request origin." }, { status: 403 });
  }

  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ detail: "Sign in to manage your book." }, { status: 401 });
  }

  try {
    const backendResponse = await fetch(`${getBackendUrl()}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body,
      cache: "no-store",
    });

    if (backendResponse.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    return buildJsonResponseFromText(
      await backendResponse.text(),
      backendResponse.status,
      "The writing service returned an invalid response.",
    );
  } catch {
    return NextResponse.json({ detail: "The writing service is unavailable." }, { status: 502 });
  }
}

export function invalidBookId() {
  return NextResponse.json({ detail: "Invalid book ID." }, { status: 422 });
}
