"use client";

import Link from "next/link";
import type { Book as EpubBook, Location, NavItem, Rendition } from "epubjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

type TocEntry = {
  href: string;
  label: string;
  depth: number;
};

function normalizeHref(href?: string | null): string {
  if (!href) return "";
  let value = href.split("#")[0].split("?")[0];
  try {
    value = decodeURIComponent(value);
  } catch {
    // Keep the raw value when it is not valid percent-encoding.
  }
  return value.replace(/^\.\//, "").replace(/^\/+/, "");
}

function flattenToc(items: NavItem[], depth = 0): TocEntry[] {
  return items.flatMap((item) => {
    const label = item.label?.trim() || item.href;
    const entry: TocEntry = { href: item.href, label, depth };
    const children = item.subitems?.length ? flattenToc(item.subitems, depth + 1) : [];
    return [entry, ...children];
  });
}

function findTocEntry(entries: TocEntry[], href?: string | null): TocEntry | null {
  const target = normalizeHref(href);
  if (!target) return null;

  const exact = entries.find((entry) => normalizeHref(entry.href) === target);
  if (exact) return exact;

  const bySuffix = entries.find((entry) => {
    const candidate = normalizeHref(entry.href);
    return Boolean(candidate) && (target.endsWith(candidate) || candidate.endsWith(target));
  });
  if (bySuffix) return bySuffix;

  let best: TocEntry | null = null;
  for (const entry of entries) {
    const candidate = normalizeHref(entry.href);
    if (!candidate) continue;
    if (target.startsWith(candidate) || candidate.startsWith(target)) {
      if (!best || candidate.length > normalizeHref(best.href).length) {
        best = entry;
      }
    }
  }
  return best;
}

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
  const [toc, setToc] = useState<NavItem[]>([]);
  const [currentHref, setCurrentHref] = useState("");
  const [currentLabel, setCurrentLabel] = useState("");
  const [percentage, setPercentage] = useState(0);
  const tocEntries = useMemo(() => flattenToc(toc), [toc]);
  const tocEntriesRef = useRef<TocEntry[]>([]);

  useEffect(() => {
    tocEntriesRef.current = tocEntries;
  }, [tocEntries]);

  const currentTocHref = useMemo(
    () => findTocEntry(tocEntries, currentHref)?.href ?? "",
    [currentHref, tocEntries],
  );

  const goToPrevious = useCallback(() => {
    void renditionRef.current?.prev();
  }, []);

  const goToNext = useCallback(() => {
    void renditionRef.current?.next();
  }, []);

  const goToChapter = useCallback((href: string) => {
    if (!href) return;
    void renditionRef.current?.display(href);
  }, []);

  const handleKeyboard = useCallback((event: KeyboardEvent) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target as HTMLElement | null;
    const tagName = target?.tagName;
    if (tagName === "INPUT" || tagName === "SELECT" || tagName === "TEXTAREA") return;

    if (event.key === "ArrowLeft" || event.key === "PageUp") {
      event.preventDefault();
      void renditionRef.current?.prev();
    } else if (event.key === "ArrowRight" || event.key === "PageDown") {
      event.preventDefault();
      void renditionRef.current?.next();
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [handleKeyboard]);

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
        try {
          const navigation = await book.loaded.navigation;
          if (!disposed) setToc(navigation.toc ?? []);
        } catch {
          if (!disposed) setToc([]);
        }
        if (disposed) { book.destroy(); return; }
        void book.locations.generate(1600).catch(() => {
          // The reader still works with approximate progress when this fails.
        });
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

    function updateChapterPosition(location: Location) {
      const href = location.start?.href ?? "";
      setCurrentHref(href);
      const entry = findTocEntry(tocEntriesRef.current, href);
      setCurrentLabel(entry?.label ?? "");

      const position = location.start?.cfi;
      let nextPercentage = 0;
      let measured = false;
      const locations = bookRef.current?.locations;

      if (position && locations && locations.length() > 0) {
        const fromCfi = locations.percentageFromCfi(position);
        if (Number.isFinite(fromCfi) && fromCfi >= 0) {
          nextPercentage = fromCfi * 100;
          measured = true;
        }
      }
      if (
        !measured &&
        typeof location.start?.percentage === "number" &&
        Number.isFinite(location.start.percentage)
      ) {
        nextPercentage = location.start.percentage * 100;
        measured = true;
      }
      if (!measured) {
        const entries = tocEntriesRef.current;
        const index = entry ? entries.findIndex((item) => item.href === entry.href) : -1;
        if (index >= 0 && entries.length > 1) {
          nextPercentage = (index / (entries.length - 1)) * 100;
        }
      }

      // EPUB CFI percentages stop just short of the last location, so trust atEnd.
      if (location.atEnd || nextPercentage >= 99.5) {
        nextPercentage = 100;
      }

      setPercentage(Math.max(0, Math.min(100, Math.round(nextPercentage))));
    }

    function onRelocated(location: Location) {
      if (disposed) return;
      updateChapterPosition(location);
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

    const keyboardDocs = new Set<Document>();
    function attachKeyboard() {
      // epubjs types declare getContents() as a single Contents, but it returns an array.
      const contentsList = rendition.getContents() as unknown as Array<{ document?: Document }>;
      for (const contents of contentsList) {
        const doc = contents?.document;
        if (doc && !keyboardDocs.has(doc)) {
          doc.addEventListener("keydown", handleKeyboard);
          keyboardDocs.add(doc);
        }
      }
    }

    rendition.on("relocated", onRelocated);
    rendition.on("rendered", attachKeyboard);
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
      rendition.off("rendered", attachKeyboard);
      for (const doc of keyboardDocs) {
        doc.removeEventListener("keydown", handleKeyboard);
      }
      if (renditionRef.current === rendition) renditionRef.current = null;
      rendition.destroy();
    };
  }, [bookId, bookReady, handleKeyboard, settingsReady, userId]);

  return (
    <div className="mx-auto flex min-h-screen max-w-[960px] flex-col gap-3 px-2 py-3 sm:px-4 sm:py-5">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-sm">
        <div className="min-w-0">
          <Link className="text-sm font-medium text-[#1E2E4F] hover:underline" href={`/books/${bookId}`}>← Back to book</Link>
          <h1 className="truncate text-lg font-semibold" title={title}>{title}</h1>
        </div>
        <a className="text-sm font-semibold text-[#1E2E4F] hover:underline" href={`/api/books/${bookId}/content`}>Download EPUB</a>
      </header>

      <div className="rounded-xl bg-white px-3 py-3 shadow-sm sm:px-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            aria-keyshortcuts="ArrowLeft PageUp"
            aria-label="Previous page or chapter"
            className="inline-flex h-9 items-center rounded-full border border-black/15 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
            disabled={status !== "ready"}
            onClick={goToPrevious}
            type="button"
          >
            ← Previous
          </button>
          <label className="sr-only" htmlFor="reader-chapter">Chapter</label>
          <select
            className="h-9 max-w-[220px] rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-700 disabled:opacity-40 sm:max-w-[320px]"
            disabled={status !== "ready" || tocEntries.length === 0}
            id="reader-chapter"
            onChange={(event) => goToChapter(event.target.value)}
            value={currentTocHref}
          >
            <option disabled value="">{tocEntries.length > 0 ? "Select chapter" : "No chapters"}</option>
            {tocEntries.map((entry) => (
              <option key={`${entry.href}-${entry.depth}-${entry.label}`} value={entry.href}>
                {"— ".repeat(entry.depth)}{entry.label}
              </option>
            ))}
          </select>
          <button
            aria-keyshortcuts="ArrowRight PageDown"
            aria-label="Next page or chapter"
            className="inline-flex h-9 items-center rounded-full border border-black/15 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
            disabled={status !== "ready"}
            onClick={goToNext}
            type="button"
          >
            Next →
          </button>
          <span
            className="min-w-0 flex-1 truncate text-right text-sm font-medium text-slate-600"
            title={currentLabel || undefined}
          >
            {currentLabel || "Reading"}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div
            aria-label="Reading progress"
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={percentage}
            className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
          >
            <div
              className="h-full rounded-full bg-[#1E2E4F] transition-[width] duration-200"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <span className="font-mono text-xs font-semibold tabular-nums text-slate-600">{percentage}%</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 shadow-sm sm:px-4">
        <span className="text-sm font-medium text-slate-600">Scroll or use the controls to read</span>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="reader-font">Font</label>
          <select className="max-w-[165px] rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm" id="reader-font" onChange={(event) => setFont(event.target.value)} value={font}>
            {FONTS.map((entry) => <option key={entry.label} value={entry.value}>{entry.label}</option>)}
          </select>
          <button aria-label="Decrease font size" className="h-9 w-9 rounded-full border border-black/15 text-lg font-medium disabled:opacity-40" disabled={fontSizePt <= MIN_FONT_SIZE_PT} onClick={() => setFontSizePt((size) => Math.max(MIN_FONT_SIZE_PT, size - 1))} type="button">A−</button>
          <label className="sr-only" htmlFor="reader-font-size">Font size in points</label>
          <select className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm tabular-nums text-slate-700" id="reader-font-size" onChange={(event) => setFontSizePt(Number(event.target.value))} value={fontSizePt}>
            {FONT_SIZES_PT.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
          <button aria-label="Increase font size" className="h-9 w-9 rounded-full border border-black/15 text-lg font-medium disabled:opacity-40" disabled={fontSizePt >= MAX_FONT_SIZE_PT} onClick={() => setFontSizePt((size) => Math.min(MAX_FONT_SIZE_PT, size + 1))} type="button">A+</button>
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
