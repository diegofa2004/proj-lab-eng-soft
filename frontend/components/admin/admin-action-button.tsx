"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { dangerCompact, neutralCompact } from "@/app/lib/ui";

type AdminActionButtonProps = {
  path: string;
  method: "POST" | "DELETE";
  label: string;
  confirmText?: string;
  tone?: "danger" | "neutral";
};

export default function AdminActionButton({
  path,
  method,
  label,
  confirmText,
  tone = "danger",
}: AdminActionButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function runAction() {
    if (confirmText && !window.confirm(confirmText)) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/${path}`, { method });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { detail?: string } | null;
        setError(data?.detail ?? "Action failed. Please try again.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach the administration service.");
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        className={tone === "danger" ? dangerCompact : neutralCompact}
        disabled={pending}
        onClick={runAction}
        type="button"
      >
        {pending ? "Working..." : label}
      </button>
      {error && <span className="max-w-48 text-xs text-red-700" role="alert">{error}</span>}
    </span>
  );
}
