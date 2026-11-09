"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type LogoutButtonProps = {
  className?: string;
};

export default function LogoutButton({ className }: LogoutButtonProps = {}) {
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
      className={
        className ??
        "inline-flex items-center justify-center rounded-full border border-black/15 bg-white/80 px-5 py-2.5 text-xs font-semibold text-[#1E2E4F] transition hover:border-[#1E2E4F] hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
      }
      disabled={isLoggingOut}
      onClick={handleLogout}
      type="button"
    >
      {isLoggingOut ? "Signing out..." : "Sign out"}
    </button>
  );
}
