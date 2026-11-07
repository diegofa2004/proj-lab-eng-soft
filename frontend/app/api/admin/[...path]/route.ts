import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getBackendUrl } from "@/app/lib/books";
import { accessTokenCookieName } from "@/app/lib/session";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function forwardAction(request: Request, context: RouteContext, method: "POST" | "DELETE") {
  const { path } = await context.params;
  const [kind, rawId, action] = path;
  const id = Number(rawId);
  const allowed = Number.isSafeInteger(id) && id > 0 && (
    (method === "POST" && path.length === 3 &&
      (kind === "users" || kind === "books") &&
      (action === "block" || action === "unblock")) ||
    (method === "DELETE" && path.length === 2 && kind === "reviews")
  );
  if (!allowed) {
    return NextResponse.json({ detail: "Invalid administration action." }, { status: 404 });
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ detail: "Invalid request origin." }, { status: 403 });
  }
  const token = (await cookies()).get(accessTokenCookieName)?.value;
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
      headers: { "Content-Type": backendResponse.headers.get("Content-Type") ?? "application/json" },
    });
  } catch {
    return NextResponse.json({ detail: "Administration service is unavailable." }, { status: 502 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  return forwardAction(request, context, "POST");
}

export async function DELETE(request: Request, context: RouteContext) {
  return forwardAction(request, context, "DELETE");
}
