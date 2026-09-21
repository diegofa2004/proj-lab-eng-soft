import { NextResponse } from "next/server";

function getBackendUrl() {
  return process.env.BACKEND_URL ?? "http://localhost:8000";
}

export async function forwardAuthRequest(request: Request, path: "/register" | "/login") {
  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json({ detail: "Request body must be valid JSON." }, { status: 400 });
  }

  try {
    const backendResponse = await fetch(`${getBackendUrl()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      cache: "no-store",
    });
    const responseBody = await backendResponse.text();

    try {
      return NextResponse.json(JSON.parse(responseBody), { status: backendResponse.status });
    } catch {
      return NextResponse.json(
        { detail: responseBody || "The authentication service returned an invalid response." },
        { status: backendResponse.status },
      );
    }
  } catch {
    return NextResponse.json({ detail: "The authentication service is unavailable." }, { status: 502 });
  }
}
