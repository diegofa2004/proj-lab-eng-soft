import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getBackendUrl } from "@/app/lib/books";
import { MAX_BIOGRAPHY_LENGTH, type ProfileEditPayload } from "@/app/lib/profile";
import {
  isProfileAvatar,
  isProfileBackground,
  isProfileRing,
} from "@/app/lib/profile-utils";
import { accessTokenCookieName } from "@/app/lib/session";

function isPositiveIntegerOrNull(value: unknown): value is number | null {
  if (value === null) {
    return true;
  }
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

export async function GET() {
  const token = (await cookies()).get(accessTokenCookieName)?.value;
  if (!token) {
    return NextResponse.json(
      { detail: "Please sign in to view your profile." },
      { status: 401 },
    );
  }

  try {
    const backendResponse = await fetch(`${getBackendUrl()}/v2/me/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    const responseBody = await backendResponse.text();

    try {
      return NextResponse.json(JSON.parse(responseBody), { status: backendResponse.status });
    } catch {
      return NextResponse.json(
        { detail: responseBody || "The profile service returned an invalid response." },
        { status: backendResponse.status },
      );
    }
  } catch {
    return NextResponse.json(
      { detail: "The profile service is unavailable." },
      { status: 502 },
    );
  }
}

export async function PATCH(request: Request) {
  const token = (await cookies()).get(accessTokenCookieName)?.value;
  if (!token) {
    return NextResponse.json(
      { detail: "Please sign in to update your profile." },
      { status: 401 },
    );
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

  const payload: ProfileEditPayload = {};

  if ("biografia" in body) {
    if (typeof body.biografia !== "string") {
      return NextResponse.json(
        { detail: "Biography must be a text string." },
        { status: 422 },
      );
    }
    if (body.biografia.length > MAX_BIOGRAPHY_LENGTH) {
      return NextResponse.json(
        { detail: `Biography must be at most ${MAX_BIOGRAPHY_LENGTH} characters long.` },
        { status: 422 },
      );
    }
    payload.biografia = body.biografia;
  }

  if ("id_avatar" in body) {
    if (!isPositiveIntegerOrNull(body.id_avatar)) {
      return NextResponse.json(
        { detail: "Invalid avatar selection." },
        { status: 422 },
      );
    }
    payload.id_avatar = body.id_avatar;
  }

  if ("id_icone" in body) {
    if (!isPositiveIntegerOrNull(body.id_icone)) {
      return NextResponse.json(
        { detail: "Invalid profile icon selection." },
        { status: 422 },
      );
    }
    payload.id_icone = body.id_icone;
  }

  if ("profile_ring" in body) {
    if (body.profile_ring !== null && !isProfileRing(body.profile_ring)) {
      return NextResponse.json({ detail: "Invalid profile ring selection." }, { status: 422 });
    }
    payload.profile_ring = body.profile_ring;
  }

  if ("profile_background" in body) {
    if (body.profile_background !== null && !isProfileBackground(body.profile_background)) {
      return NextResponse.json(
        { detail: "Invalid profile background selection." },
        { status: 422 },
      );
    }
    payload.profile_background = body.profile_background;
  }

  if ("profile_avatar" in body) {
    if (body.profile_avatar !== null && !isProfileAvatar(body.profile_avatar)) {
      return NextResponse.json({ detail: "Invalid profile avatar selection." }, { status: 422 });
    }
    payload.profile_avatar = body.profile_avatar;
  }

  try {
    const backendResponse = await fetch(`${getBackendUrl()}/v2/me/profile`, {
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
        { detail: responseBody || "The profile service returned an invalid response." },
        { status: backendResponse.status },
      );
    }
  } catch {
    return NextResponse.json(
      { detail: "The profile service is unavailable." },
      { status: 502 },
    );
  }
}
