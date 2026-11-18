import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getSessionToken, isSameOriginRequest } from "@/app/api/_lib/subscription";
import { getBackendUrl } from "@/app/lib/books";
import { accessTokenCookieName } from "@/app/lib/session";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const MAX_EPUB_BYTES = 50 * 1024 * 1024;

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

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const bookId = Number(id);
  if (!Number.isSafeInteger(bookId) || bookId <= 0) {
    return NextResponse.json({ detail: "Invalid book ID." }, { status: 422 });
  }

  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ detail: "Invalid request origin." }, { status: 403 });
  }

  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ detail: "Sign in to upload a book file." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ detail: "Upload a valid EPUB file." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ detail: "Choose an EPUB file to upload." }, { status: 422 });
  }
  if (file.size > MAX_EPUB_BYTES) {
    return NextResponse.json({ detail: "EPUB files must be at most 50 MB." }, { status: 413 });
  }

  const backendForm = new FormData();
  backendForm.append("file", file, file.name);

  try {
    const backendResponse = await fetch(`${getBackendUrl()}/v2/books/${bookId}/content`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: backendForm,
      cache: "no-store",
    });
    if (backendResponse.ok) {
      return new NextResponse(null, { status: 204 });
    }
    return new NextResponse(await backendResponse.text(), {
      status: backendResponse.status,
      headers: {
        "Content-Type": backendResponse.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch {
    return NextResponse.json({ detail: "The catalog service is unavailable." }, { status: 502 });
  }
}
