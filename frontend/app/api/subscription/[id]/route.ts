import { NextResponse } from "next/server";

import { getBackendUrl } from "@/app/lib/books";
import {
  buildJsonResponseFromText,
  getSessionToken,
  isSameOriginRequest,
} from "@/app/api/_lib/subscription";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: Request, context: RouteContext) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ detail: "Invalid request origin." }, { status: 403 });
  }

  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json(
      { detail: "Please sign in to cancel your subscription." },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  const subscriptionId = Number(id);

  if (!Number.isSafeInteger(subscriptionId) || subscriptionId <= 0) {
    return NextResponse.json({ detail: "Invalid subscription identifier." }, { status: 422 });
  }

  try {
    const backendResponse = await fetch(
      `${getBackendUrl()}/v2/me/subscriptions/${subscriptionId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );
    const responseBody = await backendResponse.text();

    return buildJsonResponseFromText(
      responseBody,
      backendResponse.status,
      "The subscription service returned an invalid response.",
    );
  } catch {
    return NextResponse.json(
      { detail: "The subscription service is unavailable." },
      { status: 502 },
    );
  }
}
