import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getBackendUrl } from "@/app/lib/books";
import { accessTokenCookieName } from "@/app/lib/session";

type RouteContext = {
  params: Promise<{ reviewId: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const { reviewId } = await context.params;
  const parsedId = Number(reviewId);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return NextResponse.json({ detail: "Invalid review ID." }, { status: 422 });
  }

  const token = (await cookies()).get(accessTokenCookieName)?.value;
  if (!token) {
    return NextResponse.json(
      { detail: "Please sign in to delete your review." },
      { status: 401 },
    );
  }

  try {
    const backendResponse = await fetch(`${getBackendUrl()}/reviews/${parsedId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
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
        { detail: responseBody || "The reviews service returned an invalid response." },
        { status: backendResponse.status },
      );
    }
  } catch {
    return NextResponse.json(
      { detail: "The reviews service is unavailable." },
      { status: 502 },
    );
  }
}

