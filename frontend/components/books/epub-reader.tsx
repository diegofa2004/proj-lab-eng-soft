"use client";

import Link from "next/link";
import type { Book as EpubBook, Location, Rendition } from "epubjs";
import { useEffect, useRef, useState } from "react";

type EpubReaderProps = {
  bookId: number;
  title: string;
  userId: number | null;
};

export default function EpubReader({ bookId, title, userId }: EpubReaderProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [pageLabel, setPageLabel] = useState("");
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    let disposed = false;
    let book: EpubBook | null = null;
    let rendition: Rendition | null = null;
    let pendingPosition: string | null = null;
    let saving = false;
    const controller = new AbortController();
    const progressUrl = `/api/books/${bookId}/progress`;
    const storageKey = `livrusp-reader:${userId ?? "guest"}:${bookId}`;

    async function saveProgress() {
      if (saving || userId === null) return;
      saving = true;
      while (pendingPosition) {
        const position = pendingPosition;
        pendingPosition = null;
        try {
          const response = await fetch(progressUrl, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ position }),
          });
          if (!disposed) {
            setSaveMessage(response.ok ? "Position saved" : "Saved on this device only");
          }
        } catch {
          if (!disposed) setSaveMessage("Saved on this device only");
        }
      }
      saving = false;
    }

    function onRelocated(location: Location) {
      if (disposed) return;
      const position = location.start?.cfi;
      setAtStart(location.atStart);
      setAtEnd(location.atEnd);
      const displayed = location.start?.displayed;
      setPageLabel(displayed?.total > 0
        ? `Page ${displayed.page} of ${displayed.total} in this section`
        : "Reading");
      if (!position) return;
      try {
        window.localStorage.setItem(storageKey, position);
      } catch {
        // Storage may be disabled; online reading still works.
      }
      if (userId !== null) {
        pendingPosition = position;
        setSaveMessage("Saving position...");
        void saveProgress();
      } else {
        setSaveMessage("Position saved on this device");
      }
    }

    async function loadBook() {
      try {
        const [contentResponse, progressResponse] = await Promise.all([
          fetch(`/api/books/${bookId}/content`, { signal: controller.signal }),
          userId !== null
            ? fetch(progressUrl, { signal: controller.signal })
            : Promise.resolve(null),
        ]);
        if (!contentResponse.ok) {
          throw new Error(contentResponse.status === 404
            ? "The EPUB file is not available for this book."
            : "Unable to load the EPUB file. Please try again.");
        }
        const file = await contentResponse.arrayBuffer();
        if (disposed) return;

        let savedPosition: string | null = null;
        if (progressResponse?.ok) {
          const progress = (await progressResponse.json()) as { ultima_posicao?: string | null };
          savedPosition = progress.ultima_posicao ?? null;
        }
        if (!savedPosition) {
          try {
            savedPosition = window.localStorage.getItem(storageKey);
          } catch {
            // Local storage is optional.
          }
        }

        const { default: ePub } = await import("epubjs");
        if (disposed || !viewerRef.current) return;
        book = ePub(file);
        await book.ready;
        if (disposed || !viewerRef.current) return;
        rendition = book.renderTo(viewerRef.current, {
          width: "100%",
          height: "100%",
          flow: "paginated",
          spread: "none",
          allowScriptedContent: false,
        });
        renditionRef.current = rendition;
        rendition.on("relocated", onRelocated);
        rendition.on("keyup", (event: KeyboardEvent) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            void rendition?.prev();
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            void rendition?.next();
          }
        });
        try {
          await rendition.display(savedPosition ?? undefined);
        } catch {
          await rendition.display();
        }
        if (!disposed) setStatus("ready");
      } catch (cause) {
        if (disposed) return;
        setError(cause instanceof Error ? cause.message : "Unable to open this EPUB.");
        setStatus("error");
      }
    }

    void loadBook();
    return () => {
      disposed = true;
      controller.abort();
      renditionRef.current = null;
      rendition?.destroy();
      book?.destroy();
    };
  }, [bookId, userId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!renditionRef.current) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.target instanceof HTMLElement &&
          ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        void renditionRef.current?.prev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        void renditionRef.current?.next();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 px-3 py-4 sm:px-6 sm:py-6">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-sm">
        <div className="min-w-0">
          <Link className="text-sm font-medium text-indigo-700 hover:underline" href={`/books/${bookId}`}>
            ← Back to book
          </Link>
          <h1 className="truncate text-lg font-semibold" title={title}>{title}</h1>
        </div>
        <a className="text-sm font-medium text-slate-600 hover:text-indigo-700" href={`/api/books/${bookId}/content`}>
          Download EPUB
        </a>
      </header>

      <section aria-label={`Reader for ${title}`} className="relative h-[min(72vh,900px)] min-h-[420px] overflow-hidden rounded-xl bg-white shadow-sm">
        <div ref={viewerRef} className="h-full w-full" />
        {status !== "ready" && (
          <div className="absolute inset-0 flex items-center justify-center bg-white p-6 text-center">
            <p className={status === "error" ? "text-red-700" : "text-slate-600"} role={status === "error" ? "alert" : "status"}>
              {status === "error" ? error : "Loading EPUB..."}
            </p>
          </div>
        )}
      </section>

      <nav aria-label="Reading controls" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-sm">
        <button
          className="rounded-lg border border-slate-300 px-4 py-2 font-medium disabled:cursor-not-allowed disabled:opacity-40"
          disabled={status !== "ready" || atStart}
          onClick={() => { void renditionRef.current?.prev(); }}
          type="button"
        >
          ← Previous
        </button>
        <div className="text-center text-sm text-slate-600">
          <p>{pageLabel || "Use the arrows to turn pages"}</p>
          {saveMessage && <p className="text-xs text-slate-500" role="status">{saveMessage}</p>}
        </div>
        <button
          className="rounded-lg bg-indigo-700 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          disabled={status !== "ready" || atEnd}
          onClick={() => { void renditionRef.current?.next(); }}
          type="button"
        >
          Next →
        </button>
      </nav>
      <p className="text-center text-xs text-slate-500">You can also use the left and right arrow keys.</p>
    </div>
  );
}
