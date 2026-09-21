import { NextResponse } from "next/server";

import { forwardAuthRequest } from "../_lib/forward-auth-request";
import { accessTokenCookieName, accessTokenCookieOptions } from "@/app/lib/session";

export async function POST(request: Request) {
  const backendResponse = await forwardAuthRequest(request, "/login");
  const data = (await backendResponse.json()) as {
    access_token?: string;
    detail?: string;
    user?: unknown;
  };

  if (!backendResponse.ok) {
    return NextResponse.json(data, { status: backendResponse.status });
  }

  if (!data.access_token || !data.user) {
    return NextResponse.json(
      { detail: "The authentication service returned an invalid response." },
      { status: 502 },
    );
  }

  const response = NextResponse.json(data.user);
  response.cookies.set(accessTokenCookieName, data.access_token, accessTokenCookieOptions);
  return response;
}
