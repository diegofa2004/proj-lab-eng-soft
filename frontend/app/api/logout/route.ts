import { NextResponse } from "next/server";

import { accessTokenCookieName, accessTokenCookieOptions } from "@/app/lib/session";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(accessTokenCookieName, "", { ...accessTokenCookieOptions, maxAge: 0 });
  return response;
}
