import { NextResponse } from "next/server";

import { getBackendUrl } from "@/app/lib/books";

function isSafeRelativeAssetPath(path: string): boolean {
  return (
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.includes("..") &&
    !path.includes("\\")
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawPath = (searchParams.get("path") ?? "").trim();

  if (!rawPath || !isSafeRelativeAssetPath(rawPath)) {
    return NextResponse.json({ detail: "Invalid asset path." }, { status: 400 });
  }

  const backendUrl = getBackendUrl();
  const candidateUrls = [
    `${backendUrl}${rawPath}`,
    ...(rawPath.startsWith("/v2/") ? [`${backendUrl}${rawPath.slice(3)}`] : []),
  ];

  for (const targetUrl of candidateUrls) {
    try {
      const response = await fetch(targetUrl, { cache: "no-store" });
      if (!response.ok) {
        continue;
      }

      const contentType = response.headers.get("content-type") ?? "image/svg+xml";
      const buffer = await response.arrayBuffer();

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=300",
        },
      });
    } catch {
      // Try next candidate URL
    }
  }

  return NextResponse.json({ detail: "Profile asset not found." }, { status: 404 });
}
