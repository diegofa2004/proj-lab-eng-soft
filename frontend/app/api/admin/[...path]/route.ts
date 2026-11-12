import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getBackendUrl, type StatusPublicacao } from "@/app/lib/books";
import { accessTokenCookieName } from "@/app/lib/session";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

const MAX_BOOK_TITLE_LENGTH = 300;
const MAX_BOOK_PAGES = 2147483647;
const VALID_PUBLICATION_STATUSES: readonly StatusPublicacao[] = [
  "rascunho",
  "publicado",
  "arquivado",
];

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isPositiveIntegerArray(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "number" && Number.isSafeInteger(item) && item > 0)
  );
}

function validateOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ detail: "Invalid request origin." }, { status: 403 });
  }
  return null;
}

async function getAdminToken(): Promise<string | null> {
  return (await cookies()).get(accessTokenCookieName)?.value ?? null;
}

async function forwardCanonicalAdmin(
  request: Request,
  path: string[],
  method: "POST" | "PATCH" | "DELETE",
) {
  const originError = validateOrigin(request);
  if (originError) return originError;
  const token = await getAdminToken();
  if (!token) {
    return NextResponse.json({ detail: "Sign in as an administrator." }, { status: 401 });
  }
  const body = method === "DELETE" || path.join("/") === "canonical-genres/reprocess"
    ? undefined
    : await request.text();
  try {
    const backendResponse = await fetch(`${getBackendUrl()}/v2/admin/${path.join("/")}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body,
      cache: "no-store",
    });
    return new NextResponse(await backendResponse.text(), {
      status: backendResponse.status,
      headers: {
        "Content-Type": backendResponse.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch {
    return NextResponse.json({ detail: "Administration service is unavailable." }, { status: 502 });
  }
}

async function forwardBookMetadataUpdate(
  request: Request,
  bookId: number,
  method: "PATCH" | "PUT",
) {
  const originError = validateOrigin(request);
  if (originError) return originError;

  const token = await getAdminToken();
  if (!token) {
    return NextResponse.json({ detail: "Sign in as an administrator." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    const parsed = (await request.json()) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ detail: "Request body must be a JSON object." }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ detail: "Request body must be valid JSON." }, { status: 400 });
  }

  const patchPayload: Record<string, unknown> = {};

  if ("titulo" in body) {
    if (typeof body.titulo !== "string") {
      return NextResponse.json({ detail: "Book title must be a text string." }, { status: 422 });
    }
    const trimmedTitle = body.titulo.trim();
    if (trimmedTitle.length === 0) {
      return NextResponse.json({ detail: "Book title cannot be empty." }, { status: 422 });
    }
    if (trimmedTitle.length > MAX_BOOK_TITLE_LENGTH) {
      return NextResponse.json(
        { detail: `Book title must be at most ${MAX_BOOK_TITLE_LENGTH} characters long.` },
        { status: 422 },
      );
    }
    patchPayload.titulo = trimmedTitle;
  }

  if ("descricao" in body) {
    if (typeof body.descricao !== "string") {
      return NextResponse.json(
        { detail: "Book description must be a text string." },
        { status: 422 },
      );
    }
    patchPayload.descricao = body.descricao;
  }

  if ("data_publicacao" in body) {
    if (typeof body.data_publicacao !== "string" || !isValidIsoDate(body.data_publicacao)) {
      return NextResponse.json(
        { detail: "Publication date must be a valid YYYY-MM-DD date." },
        { status: 422 },
      );
    }
    patchPayload.data_publicacao = body.data_publicacao;
  }

  if ("total_paginas" in body) {
    if (
      typeof body.total_paginas !== "number" ||
      !Number.isSafeInteger(body.total_paginas) ||
      body.total_paginas < 1 ||
      body.total_paginas > MAX_BOOK_PAGES
    ) {
      return NextResponse.json(
        { detail: `Position count must be an integer between 1 and ${MAX_BOOK_PAGES}.` },
        { status: 422 },
      );
    }
    patchPayload.total_paginas = body.total_paginas;
  }

  if ("status_publicacao" in body) {
    if (
      typeof body.status_publicacao !== "string" ||
      !VALID_PUBLICATION_STATUSES.includes(body.status_publicacao as StatusPublicacao)
    ) {
      return NextResponse.json(
        { detail: "Publication status must be rascunho, publicado, or arquivado." },
        { status: 422 },
      );
    }
    patchPayload.status_publicacao = body.status_publicacao;
  }

  if ("status_bloqueado" in body) {
    if (typeof body.status_bloqueado !== "boolean") {
      return NextResponse.json(
        { detail: "Blocked status must be a boolean value." },
        { status: 422 },
      );
    }
    patchPayload.status_bloqueado = body.status_bloqueado;
  }

  const hasAuthors = "autores" in body;
  const hasGenres = "generos" in body;

  if (hasAuthors && !isPositiveIntegerArray(body.autores)) {
    return NextResponse.json(
      { detail: "Authors must be a list of positive author IDs." },
      { status: 422 },
    );
  }

  if (hasGenres && !isPositiveIntegerArray(body.generos)) {
    return NextResponse.json(
      { detail: "Genres must be a list of positive genre IDs." },
      { status: 422 },
    );
  }

  const usePutCatalogEndpoint =
    (method === "PUT" || hasAuthors || hasGenres) &&
    typeof patchPayload.titulo === "string" &&
    typeof patchPayload.data_publicacao === "string" &&
    typeof patchPayload.total_paginas === "number";

  const targetUrl = usePutCatalogEndpoint
    ? `${getBackendUrl()}/v2/books/${bookId}`
    : `${getBackendUrl()}/admin/books/${bookId}`;

  const targetMethod = usePutCatalogEndpoint ? "PUT" : "PATCH";
  const targetPayload = usePutCatalogEndpoint
    ? {
        titulo: patchPayload.titulo,
        descricao: typeof patchPayload.descricao === "string" ? patchPayload.descricao : "",
        data_publicacao: patchPayload.data_publicacao,
        total_paginas: patchPayload.total_paginas,
        status_publicacao:
          typeof patchPayload.status_publicacao === "string"
            ? patchPayload.status_publicacao
            : "rascunho",
        autores: hasAuthors ? (body.autores as number[]) : [],
        generos: hasGenres ? (body.generos as number[]) : [],
      }
    : patchPayload;

  try {
    const backendResponse = await fetch(targetUrl, {
      method: targetMethod,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(targetPayload),
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
      { detail: "Administration service is unavailable." },
      { status: 502 },
    );
  }
}

async function forwardReferenceCreate(request: Request, kind: "authors" | "genres") {
  const originError = validateOrigin(request);
  if (originError) return originError;

  const token = await getAdminToken();
  if (!token) {
    return NextResponse.json({ detail: "Sign in as an administrator." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    const parsed = (await request.json()) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ detail: "Request body must be a JSON object." }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ detail: "Request body must be valid JSON." }, { status: 400 });
  }

  const maxLength = kind === "authors" ? 200 : 100;
  const label = kind === "authors" ? "Author name" : "Genre name";
  const rawName = typeof body.nome === "string" ? body.nome.trim() : "";

  if (!rawName || rawName.length > maxLength) {
    return NextResponse.json(
      { detail: `${label} must be between 1 and ${maxLength} characters.` },
      { status: 422 },
    );
  }

  try {
    const backendResponse = await fetch(`${getBackendUrl()}/v2/admin/${kind}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ nome: rawName }),
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
      { detail: "Administration service is unavailable." },
      { status: 502 },
    );
  }
}

async function forwardAction(request: Request, context: RouteContext, method: "POST" | "DELETE") {
  const { path } = await context.params;

  if (
    (method === "POST" &&
      (path.join("/") === "canonical-genre-rules" ||
        path.join("/") === "canonical-genres/reprocess")) ||
    (method === "DELETE" &&
      path.length === 2 &&
      path[0] === "canonical-genre-rules" &&
      Number.isSafeInteger(Number(path[1])))
  ) {
    return forwardCanonicalAdmin(request, path, method);
  }

  if (method === "POST" && path.length === 1 && (path[0] === "authors" || path[0] === "genres")) {
    return forwardReferenceCreate(request, path[0]);
  }

  const [kind, rawId, action] = path;
  const id = Number(rawId);
  const allowed =
    Number.isSafeInteger(id) &&
    id > 0 &&
    ((method === "POST" &&
      path.length === 3 &&
      (kind === "users" || kind === "books") &&
      (action === "block" || action === "unblock")) ||
      (method === "DELETE" && path.length === 2 && kind === "reviews"));
  if (!allowed) {
    return NextResponse.json({ detail: "Invalid administration action." }, { status: 404 });
  }

  const originError = validateOrigin(request);
  if (originError) return originError;

  const token = await getAdminToken();
  if (!token) {
    return NextResponse.json({ detail: "Sign in as an administrator." }, { status: 401 });
  }

  try {
    const backendResponse = await fetch(`${getBackendUrl()}/admin/${path.join("/")}`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
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
      { detail: "Administration service is unavailable." },
      { status: 502 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  return forwardAction(request, context, "POST");
}

export async function DELETE(request: Request, context: RouteContext) {
  return forwardAction(request, context, "DELETE");
}

export async function PATCH(request: Request, context: RouteContext) {
  const { path } = await context.params;
  if (
    path.length === 2 &&
    path[0] === "canonical-genre-rules" &&
    Number.isSafeInteger(Number(path[1]))
  ) {
    return forwardCanonicalAdmin(request, path, "PATCH");
  }
  const [kind, rawId] = path;
  const bookId = Number(rawId);

  if (path.length !== 2 || kind !== "books" || !Number.isSafeInteger(bookId) || bookId <= 0) {
    return NextResponse.json({ detail: "Invalid administration action." }, { status: 404 });
  }

  return forwardBookMetadataUpdate(request, bookId, "PATCH");
}

export async function PUT(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const [kind, rawId] = path;
  const bookId = Number(rawId);

  if (path.length !== 2 || kind !== "books" || !Number.isSafeInteger(bookId) || bookId <= 0) {
    return NextResponse.json({ detail: "Invalid administration action." }, { status: 404 });
  }

  return forwardBookMetadataUpdate(request, bookId, "PUT");
}
