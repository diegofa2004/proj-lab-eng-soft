"use client";

import Link from "next/link";
import type { Book as EpubBook, Location, Rendition } from "epubjs";
import { useEffect, useRef, useState } from "react";

type Props = { bookId: number; title: string; userId: number | null };
const MIN_FONT_SIZE_PT = 8;
const MAX_FONT_SIZE_PT = 36;
const DEFAULT_FONT_SIZE_PT = 12;
const FONT_SIZES_PT = Array.from(
  { length: MAX_FONT_SIZE_PT - MIN_FONT_SIZE_PT + 1 },
  (_, index) => MIN_FONT_SIZE_PT + index,
);
const FONTS = [
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: '"Times New Roman", Times, serif' },
  { label: "Garamond", value: 'Garamond, "Times New Roman", serif' },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
];
const SETTINGS_KEY = "livrusp-reader-settings";

export default function EpubReader({ bookId, title, userId }: Props) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<EpubBook | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const positionRef = useRef<string | null>(null);
  const typographyRef = useRef({ font: FONTS[0].value, fontSizePt: DEFAULT_FONT_SIZE_PT });
  const [bookReady, setBookReady] = useState(false);
  const [settingsReady, setSettingsReady] = useState(false);
  const [font, setFont] = useState(FONTS[0].value);
  const [fontSizePt, setFontSizePt] = useState(DEFAULT_FONT_SIZE_PT);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    let disposed = false;
    try {
      const saved = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || "{}") as {
        font?: string;
        fontSizePt?: number;
        fontSize?: number;
      };
      queueMicrotask(() => {
        if (disposed) return;
        if (FONTS.some((entry) => entry.value === saved.font)) setFont(saved.font!);
        if (Number.isInteger(saved.fontSizePt) &&
            saved.fontSizePt! >= MIN_FONT_SIZE_PT && saved.fontSizePt! <= MAX_FONT_SIZE_PT) {
          setFontSizePt(saved.fontSizePt!);
        } else if (typeof saved.fontSize === "number" &&
                   saved.fontSize >= 80 && saved.fontSize <= 160) {
          // Convert the previous percent-based setting to an approximate point size.
          setFontSizePt(Math.round(DEFAULT_FONT_SIZE_PT * saved.fontSize / 100));
        }
        setSettingsReady(true);
      });
    } catch {
      queueMicrotask(() => { if (!disposed) setSettingsReady(true); });
    }
    return () => { disposed = true; };
  }, []);

  useEffect(() => {
    if (!settingsReady) return;
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ font, fontSizePt }));
    } catch {
      // Reading still works without local storage.
    }
  }, [font, fontSizePt, settingsReady]);

  useEffect(() => {
    typographyRef.current = { font, fontSizePt };
    renditionRef.current?.themes.font(font);
    renditionRef.current?.themes.override("font-size", `${fontSizePt}pt`, true);
  }, [font, fontSizePt]);

  useEffect(() => {
    let disposed = false;
    const controller = new AbortController();
    const storageKey = `livrusp-reader:${userId ?? "guest"}:${bookId}`;
    async function loadBook() {
      try {
        const [contentResponse, progressResponse] = await Promise.all([
          fetch(`/api/books/${bookId}/content`, { signal: controller.signal }),
          userId === null ? Promise.resolve(null)
            : fetch(`/api/books/${bookId}/progress`, { signal: controller.signal }),
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
          try { savedPosition = window.localStorage.getItem(storageKey); } catch { /* optional */ }
        }
        const { default: ePub } = await import("epubjs");
        if (disposed) return;
        const book = ePub(file);
        await book.ready;
        if (disposed) { book.destroy(); return; }
        positionRef.current = savedPosition;
        bookRef.current = book;
        setBookReady(true);
      } catch (cause) {
        if (disposed) return;
        setError(cause instanceof Error ? cause.message : "Unable to open this EPUB.");
        setStatus("error");
      }
    }
    queueMicrotask(() => {
      if (disposed) return;
      setBookReady(false);
      setStatus("loading");
      setError("");
    });
    positionRef.current = null;
    void loadBook();
    return () => {
      disposed = true;
      controller.abort();
      const book = bookRef.current;
      bookRef.current = null;
      // The rendition effect cleans up immediately after this one.
      queueMicrotask(() => book?.destroy());
    };
  }, [bookId, userId]);

  useEffect(() => {
    if (!bookReady || !settingsReady || !bookRef.current || !viewerRef.current) return;
    let disposed = false;
    let saveTimer: ReturnType<typeof setTimeout> | null = null;
    let pendingPosition: string | null = null;
    let saving = false;
    const storageKey = `livrusp-reader:${userId ?? "guest"}:${bookId}`;
    const progressUrl = `/api/books/${bookId}/progress`;
    const rendition = bookRef.current.renderTo(viewerRef.current, {
      width: "100%",
      height: "100%",
      manager: "continuous",
      flow: "scrolled-doc",
      spread: "none",
      allowScriptedContent: false,
    });
    renditionRef.current = rendition;
    rendition.themes.default({
      body: {
        margin: "0 auto !important",
        "max-width": "860px !important",
        padding: "0 0.75rem !important",
        "line-height": "1.6 !important",
      },
      p: { "margin-top": "0.55em !important", "margin-bottom": "0.55em !important" },
      img: { "max-width": "100% !important" },
    });
    rendition.themes.font(typographyRef.current.font);
    rendition.themes.override("font-size", `${typographyRef.current.fontSizePt}pt`, true);

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
          if (!disposed) setSaveMessage(response.ok ? "Position saved" : "Saved on this device only");
        } catch {
          if (!disposed) setSaveMessage("Saved on this device only");
        }
      }
      saving = false;
    }

    function onRelocated(location: Location) {
      if (disposed) return;
      const position = location.start?.cfi;
      if (!position) return;
      positionRef.current = position;
      try { window.localStorage.setItem(storageKey, position); } catch { /* optional */ }
      if (userId === null) {
        setSaveMessage("Position saved on this device");
      } else {
        pendingPosition = position;
        setSaveMessage("Saving position...");
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(() => { void saveProgress(); }, 700);
      }
    }
    rendition.on("relocated", onRelocated);
    queueMicrotask(() => { if (!disposed) setStatus("loading"); });
    async function display() {
      try {
        try { await rendition.display(positionRef.current ?? undefined); }
        catch { await rendition.display(); }
        if (!disposed) setStatus("ready");
      } catch (cause) {
        if (disposed) return;
        setError(cause instanceof Error ? cause.message : "Unable to open this EPUB.");
        setStatus("error");
      }
    }
    void display();
    return () => {
      disposed = true;
      if (saveTimer) clearTimeout(saveTimer);
      if (pendingPosition) void saveProgress();
      rendition.off("relocated", onRelocated);
      if (renditionRef.current === rendition) renditionRef.current = null;
      rendition.destroy();
    };
  }, [bookId, bookReady, settingsReady, userId]);

  return (
    <div className="mx-auto flex min-h-screen max-w-[960px] flex-col gap-3 px-2 py-3 sm:px-4 sm:py-5">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-sm">
        <div className="min-w-0">
          <Link className="text-sm font-medium text-indigo-700 hover:underline" href={`/books/${bookId}`}>← Back to book</Link>
          <h1 className="truncate text-lg font-semibold" title={title}>{title}</h1>
        </div>
        <a className="text-sm font-medium text-slate-600 hover:text-indigo-700" href={`/api/books/${bookId}/content`}>Download EPUB</a>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 shadow-sm sm:px-4">
        <span className="text-sm font-medium text-slate-600">Scroll down to read</span>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="reader-font">Font</label>
          <select className="max-w-[165px] rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm" id="reader-font" onChange={(event) => setFont(event.target.value)} value={font}>
            {FONTS.map((entry) => <option key={entry.label} value={entry.value}>{entry.label}</option>)}
          </select>
          <button aria-label="Decrease font size" className="h-9 w-9 rounded-lg border border-slate-300 text-lg font-medium disabled:opacity-40" disabled={fontSizePt <= MIN_FONT_SIZE_PT} onClick={() => setFontSizePt((size) => Math.max(MIN_FONT_SIZE_PT, size - 1))} type="button">A−</button>
          <label className="sr-only" htmlFor="reader-font-size">Font size in points</label>
          <select className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm tabular-nums text-slate-700" id="reader-font-size" onChange={(event) => setFontSizePt(Number(event.target.value))} value={fontSizePt}>
            {FONT_SIZES_PT.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
          <button aria-label="Increase font size" className="h-9 w-9 rounded-lg border border-slate-300 text-lg font-medium disabled:opacity-40" disabled={fontSizePt >= MAX_FONT_SIZE_PT} onClick={() => setFontSizePt((size) => Math.min(MAX_FONT_SIZE_PT, size + 1))} type="button">A+</button>
        </div>
      </div>

      <section aria-label={`Reader for ${title}`} className="relative h-[min(78vh,980px)] min-h-[480px] overflow-hidden rounded-xl bg-white p-1 shadow-sm sm:p-2">
        <div ref={viewerRef} className="h-full w-full" />
        {status !== "ready" && (
          <div className="absolute inset-0 flex items-center justify-center bg-white p-6 text-center">
            <p className={status === "error" ? "text-red-700" : "text-slate-600"} role={status === "error" ? "alert" : "status"}>{status === "error" ? error : "Loading EPUB..."}</p>
          </div>
        )}
      </section>

      {saveMessage && <p className="text-center text-xs text-slate-500" role="status">{saveMessage}</p>}
    </div>
  );
}
