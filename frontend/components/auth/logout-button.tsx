"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  async function handleLogout() {
    setIsLoggingOut(true);
    await fetch("/api/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }

  return (
    <button
      className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed"
      disabled={isLoggingOut}
      onClick={handleLogout}
      type="button"
    >
      {isLoggingOut ? "Signing out..." : "Sign out"}
    </button>
  );
}
