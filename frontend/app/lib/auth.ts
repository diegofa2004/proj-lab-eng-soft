import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { accessTokenCookieName } from "@/app/lib/session";

type CurrentUser = {
  id: number;
  username: string;
  email: string;
};

function getBackendUrl() {
  return process.env.BACKEND_URL ?? "http://localhost:8000";
}

export const requireCurrentUser = cache(async (): Promise<CurrentUser> => {
  const token = (await cookies()).get(accessTokenCookieName)?.value;

  if (!token) {
    redirect("/login");
  }

  try {
    const response = await fetch(`${getBackendUrl()}/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!response.ok) {
      redirect("/login");
    }

    return (await response.json()) as CurrentUser;
  } catch {
    redirect("/login");
  }
});
