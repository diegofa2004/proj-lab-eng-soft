import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { accessTokenCookieName } from "@/app/lib/session";

/** Validates that state-changing requests originate from the same host (including Docker host mapping). */
export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    return true;
  }

  const requestUrl = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") ?? requestUrl.protocol.replace(":", "");
  const expectedOrigin = host ? `${protocol}://${host}` : requestUrl.origin;

  return origin === expectedOrigin || origin === requestUrl.origin;
}

/** Reads the authenticated reader's HTTP-only JWT cookie on the server. */
export async function getSessionToken(): Promise<string | null> {
  return (await cookies()).get(accessTokenCookieName)?.value ?? null;
}

/** Parses a backend response text into a NextResponse JSON payload preserving status code. */
export function buildJsonResponseFromText(
  responseBody: string,
  status: number,
  fallbackDetail: string,
): NextResponse {
  try {
    return NextResponse.json(JSON.parse(responseBody), { status });
  } catch {
    return NextResponse.json(
      { detail: responseBody || fallbackDetail },
      { status },
    );
  }
}
