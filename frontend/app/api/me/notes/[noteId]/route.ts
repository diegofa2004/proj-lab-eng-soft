import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getBackendUrl } from "@/app/lib/books";
import { accessTokenCookieName } from "@/app/lib/session";

type RouteContext = {
  params: Promise<{ noteId: string }>;
};

function parseNoteId(value: string): number | null {
  const noteId = Number(value);
  return Number.isInteger(noteId) && noteId > 0 ? noteId : null;
}

function parseLocation(value: unknown): string | null | undefined {
  if (value === null) {
    return null;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { noteId: rawNoteId } = await context.params;
  const noteId = parseNoteId(rawNoteId);

  if (noteId === null) {
    return NextResponse.json({ detail: "Invalid note ID." }, { status: 422 });
  }

  const token = (await cookies()).get(accessTokenCookieName)?.value;
  if (!token) {
    return NextResponse.json(
      { detail: "Please sign in to edit your notes." },
      { status: 401 },
    );
  }

  let body: { texto?: unknown; localizacao?: unknown };
  try {
    body = (await request.json()) as { texto?: unknown; localizacao?: unknown };
  } catch {
    return NextResponse.json({ detail: "Request body must be valid JSON." }, { status: 400 });
  }

  const payload: { texto?: string; localizacao?: string | null } = {};

  if (body.texto !== undefined) {
    if (typeof body.texto !== "string" || body.texto.trim().length === 0) {
      return NextResponse.json({ detail: "Note text is required." }, { status: 422 });
    }
    payload.texto = body.texto.trim();
  }

  if (body.localizacao !== undefined) {
    const location = parseLocation(body.localizacao);
    if (location === undefined) {
      return NextResponse.json({ detail: "Invalid note location." }, { status: 422 });
    }
    payload.localizacao = location;
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ detail: "No note fields were provided." }, { status: 422 });
  }

  try {
    const backendResponse = await fetch(`${getBackendUrl()}/v2/me/notes/${noteId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const responseBody = await backendResponse.text();

    try {
      return NextResponse.json(JSON.parse(responseBody), { status: backendResponse.status });
    } catch {
      return NextResponse.json(
        { detail: responseBody || "The notes service returned an invalid response." },
        { status: backendResponse.status },
      );
    }
  } catch {
    return NextResponse.json({ detail: "The notes service is unavailable." }, { status: 502 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { noteId: rawNoteId } = await context.params;
  const noteId = parseNoteId(rawNoteId);

  if (noteId === null) {
    return NextResponse.json({ detail: "Invalid note ID." }, { status: 422 });
  }

  const token = (await cookies()).get(accessTokenCookieName)?.value;
  if (!token) {
    return NextResponse.json(
      { detail: "Please sign in to delete your notes." },
      { status: 401 },
    );
  }

  try {
    const backendResponse = await fetch(`${getBackendUrl()}/v2/me/notes/${noteId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
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
        { detail: responseBody || "The notes service returned an invalid response." },
        { status: backendResponse.status },
      );
    }
  } catch {
    return NextResponse.json({ detail: "The notes service is unavailable." }, { status: 502 });
  }
}
