"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { ListItemType } from "@/app/lib/books";

type BookListActionsProps = {
  bookId: number;
  initialIsFavorite: boolean;
  initialIsToRead: boolean;
};

export default function BookListActions({
  bookId,
  initialIsFavorite,
  initialIsToRead,
}: BookListActionsProps) {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [isToRead, setIsToRead] = useState(initialIsToRead);
  const [pendingList, setPendingList] = useState<ListItemType | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );
  const router = useRouter();

  async function toggleList(listType: ListItemType) {
    const isCurrentlyInList = listType === "favorito" ? isFavorite : isToRead;
    setPendingList(listType);
    setFeedback(null);

    try {
      const response = isCurrentlyInList
        ? await fetch(`/api/books/${bookId}/lists?tipo=${listType}`, {
            method: "DELETE",
          })
        : await fetch(`/api/books/${bookId}/lists`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tipo: listType }),
          });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { detail?: string } | null;
        setFeedback({
          type: "error",
          text: data?.detail ?? "Could not update your reading list. Please try again.",
        });
        return;
      }

      if (listType === "favorito") {
        setIsFavorite(!isCurrentlyInList);
        setFeedback({
          type: "success",
          text: !isCurrentlyInList ? "Added to Favorites." : "Removed from Favorites.",
        });
      } else {
        setIsToRead(!isCurrentlyInList);
        setFeedback({
          type: "success",
          text: !isCurrentlyInList ? "Added to Read Later." : "Removed from Read Later.",
        });
      }

      router.refresh();
    } catch {
      setFeedback({
        type: "error",
        text: "Unable to reach the server. Please try again.",
      });
    } finally {
      setPendingList(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        <button
          className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
            isFavorite
              ? "border-indigo-600 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
          disabled={pendingList !== null}
          onClick={() => toggleList("favorito")}
          type="button"
        >
          <span>{isFavorite ? "★ Favorited" : "☆ Add to Favorites"}</span>
        </button>

        <button
          className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
            isToRead
              ? "border-indigo-600 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
          disabled={pendingList !== null}
          onClick={() => toggleList("ler_depois")}
          type="button"
        >
          <span>{isToRead ? "✓ In Read Later" : "+ Read Later"}</span>
        </button>
      </div>

      {feedback && (
        <p
          aria-live="polite"
          className={`text-xs ${feedback.type === "error" ? "text-red-600" : "text-emerald-600"}`}
          role="status"
        >
          {feedback.text}
        </p>
      )}
    </div>
  );
}

