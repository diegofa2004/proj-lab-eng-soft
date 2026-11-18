"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { secondaryCompact } from "@/app/lib/ui";

type FavoriteButtonProps = {
  bookId: number;
  initialIsFavorite: boolean;
  variant?: "icon" | "compact";
  className?: string;
};

export default function FavoriteButton({
  bookId,
  initialIsFavorite,
  variant = "compact",
  className = "",
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function toggleFavorite() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch(
        isFavorite
          ? `/api/books/${bookId}/lists?tipo=favorito`
          : `/api/books/${bookId}/lists`,
        isFavorite
          ? { method: "DELETE" }
          : {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tipo: "favorito" }),
            },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
        setError(payload?.detail ?? "Could not update favorites.");
        return;
      }

      setIsFavorite((current) => !current);
      router.refresh();
    } catch {
      setError("The favorites service is unavailable.");
    } finally {
      setPending(false);
    }
  }

  const label = isFavorite ? "Remove from favorites" : "Add to favorites";

  if (variant === "icon") {
    return (
      <button
        aria-label={label}
        aria-pressed={isFavorite}
        className={`grid h-9 w-9 place-items-center rounded-full border border-black/15 bg-white/95 text-lg text-[#1E2E4F] shadow-sm backdrop-blur transition hover:scale-105 hover:bg-white disabled:cursor-wait disabled:opacity-70 ${className}`}
        disabled={pending}
        onClick={toggleFavorite}
        title={error ?? label}
        type="button"
      >
        <span aria-hidden="true">{pending ? "…" : isFavorite ? "★" : "☆"}</span>
        <span className="sr-only" role="status">
          {error ?? (isFavorite ? "Favorited" : "Not favorited")}
        </span>
      </button>
    );
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        aria-pressed={isFavorite}
        className={`${isFavorite ? "inline-flex items-center justify-center rounded-full bg-[#1E2E4F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#15223B]" : secondaryCompact} gap-2 disabled:cursor-wait disabled:opacity-60 ${className}`}
        disabled={pending}
        onClick={toggleFavorite}
        type="button"
      >
        <span aria-hidden="true">{isFavorite ? "★" : "☆"}</span>
        <span>{isFavorite ? "Favorited" : "Add to favorites"}</span>
      </button>
      {error ? (
        <span className="text-xs text-red-600" role="status">
          {error}
        </span>
      ) : null}
    </span>
  );
}
