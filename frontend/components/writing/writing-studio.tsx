"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { type Chapter, type OwnedBookDetail } from "@/app/lib/writing";
import {
  card,
  cardInset,
  dangerCompact,
  primaryCompact,
  secondaryCompact,
} from "@/app/lib/ui";

const AUTOSAVE_DELAY_MS = 800;

const fieldClassName =
  "block w-full rounded-xl border border-black/15 bg-white px-3.5 py-2.5 text-sm text-black shadow-2xs outline-none transition placeholder:text-black/40 hover:border-[#1E2E4F]/50 focus:border-[#1E2E4F] focus:ring-2 focus:ring-[#82A7D5]/50";

type SaveState = "idle" | "saving" | "saved" | "error" | "conflict";
type Feedback = { tone: "error" | "warning"; text: string } | null;

function chapterSignature(chapter: Chapter): string {
  return `${chapter.id_capitulo}:${chapter.versao}:${chapter.titulo}:${chapter.conteudo}`;
}

function countWords(text: string): number {
  return text.match(/\S+/g)?.length ?? 0;
}

function sortChapters(chapters: Chapter[]): Chapter[] {
  return [...chapters].sort((a, b) => a.ordem - b.ordem || a.id_capitulo - b.id_capitulo);
}

async function readError(response: Response, fallback: string): Promise<string> {
  const payload = (await response.json().catch(() => null)) as { detail?: unknown } | null;
  const detail = payload?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: unknown } | undefined;
    if (first && typeof first.msg === "string") return first.msg;
  }
  return fallback;
}

export default function WritingStudio({ book }: { book: OwnedBookDetail }) {
  const router = useRouter();
  const initialChapter = book.capitulos[0] ?? null;
  const [chapters, setChapters] = useState<Chapter[]>(sortChapters(book.capitulos));
  const [activeId, setActiveId] = useState<number | null>(initialChapter?.id_capitulo ?? null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const active = chapters.find((chapter) => chapter.id_capitulo === activeId) ?? null;
  const activeRef = useRef<Chapter | null>(active);
  const chaptersRef = useRef(chapters);
  const savingChapters = useRef(new Set<number>());
  const lastSaved = useRef(
    new Map(book.capitulos.map((chapter) => [chapter.id_capitulo, chapterSignature(chapter)])),
  );

  const editable =
    book.status_publicacao === "rascunho" || book.status_publicacao === "arquivado";
  const totalWords = chapters.reduce((sum, chapter) => sum + countWords(chapter.conteudo), 0);
  const totalPages = Math.max(1, Math.ceil(totalWords / 300));
  const titleError = Boolean(active && editable && !active.titulo.trim());

  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  useEffect(() => {
    chaptersRef.current = chapters;
  }, [chapters]);

  const refreshBook = useCallback(
    async (preferredId?: number | null, warning = "") => {
      const response = await fetch(`/api/books/${book.id_livro}/writing`, {
        cache: "no-store",
      });
      if (!response.ok) {
        setSaveState("error");
        setFeedback({
          tone: "error",
          text: await readError(response, "We could not reload this book."),
        });
        return null;
      }

      const detail = (await response.json()) as OwnedBookDetail;
      const nextChapters = sortChapters(detail.capitulos);
      setChapters(nextChapters);
      chaptersRef.current = nextChapters;
      lastSaved.current = new Map(
        nextChapters.map((chapter) => [chapter.id_capitulo, chapterSignature(chapter)]),
      );
      const nextId =
        preferredId && nextChapters.some((chapter) => chapter.id_capitulo === preferredId)
          ? preferredId
          : nextChapters[0]?.id_capitulo ?? null;
      setActiveId(nextId);
      setSaveState(warning ? "conflict" : "idle");
      setFeedback(warning ? { tone: "warning", text: warning } : null);
      return detail;
    },
    [book.id_livro],
  );

  const saveChapter = useCallback(
    async (chapter: Chapter): Promise<boolean> => {
      if (!chapter.titulo.trim()) {
        setSaveState("error");
        setFeedback({ tone: "error", text: "Chapter title cannot be empty." });
        return false;
      }
      if (savingChapters.current.has(chapter.id_capitulo)) return false;
      savingChapters.current.add(chapter.id_capitulo);

      const sentSignature = chapterSignature(chapter);
      setSaveState("saving");
      setFeedback(null);

      try {
        const response = await fetch(
          `/api/books/${book.id_livro}/chapters/${chapter.id_capitulo}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              titulo: chapter.titulo.trim(),
              conteudo: chapter.conteudo,
              versao: chapter.versao,
            }),
          },
        );

        if (response.status === 409) {
          setSaveState("conflict");
          setFeedback({
            tone: "warning",
            text: "This chapter changed in another session. Your local text is preserved here; copy it before reloading.",
          });
          return false;
        }
        if (!response.ok) {
          setSaveState("error");
          setFeedback({
            tone: "error",
            text: await readError(response, "We could not save this chapter."),
          });
          return false;
        }

        const updated = (await response.json()) as Chapter;
        const latest = chaptersRef.current.find(
          (item) => item.id_capitulo === updated.id_capitulo,
        );
        const isActive = activeRef.current?.id_capitulo === updated.id_capitulo;

        if (latest && chapterSignature(latest) !== sentSignature) {
          const revised = chaptersRef.current.map((item) =>
            item.id_capitulo === updated.id_capitulo
              ? { ...item, versao: updated.versao, atualizado_em: updated.atualizado_em }
              : item,
          );
          chaptersRef.current = revised;
          setChapters(revised);
          if (isActive) {
            lastSaved.current.set(
              updated.id_capitulo,
              chapterSignature({ ...chapter, versao: updated.versao }),
            );
            setSaveState("idle");
          }
          return true;
        }

        setChapters((current) =>
          current.map((item) =>
            item.id_capitulo === updated.id_capitulo ? updated : item,
          ),
        );
        if (isActive) {
          setSaveState("saved");
        }
        lastSaved.current.set(updated.id_capitulo, chapterSignature(updated));
        return true;
      } catch {
        setSaveState("error");
        setFeedback({
          tone: "error",
          text: "The writing service is unavailable. Your changes are still in this tab.",
        });
        return false;
      } finally {
        savingChapters.current.delete(chapter.id_capitulo);
      }
    },
    [book.id_livro],
  );

  useEffect(() => {
    if (!active || !editable) return;
    if (!active.titulo.trim()) return;
    if (chapterSignature(active) === lastSaved.current.get(active.id_capitulo)) return;

    const timer = window.setTimeout(() => {
      void saveChapter(active);
    }, AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [active, editable, saveChapter]);

  const flushActive = useCallback(async (): Promise<boolean> => {
    const activeId = activeRef.current?.id_capitulo;
    if (activeId === undefined || !editable) return true;
    while (savingChapters.current.has(activeId)) {
      await new Promise((resolve) => window.setTimeout(resolve, 25));
    }
    const chapter = chaptersRef.current.find((item) => item.id_capitulo === activeId);
    if (!chapter || chapterSignature(chapter) === lastSaved.current.get(chapter.id_capitulo)) {
      return true;
    }
    return saveChapter(chapter);
  }, [editable, saveChapter]);

  function selectChapter(chapterId: number) {
    const chapter = chapters.find((item) => item.id_capitulo === chapterId) ?? null;
    if (!chapter) return;
    if (active && active.id_capitulo !== chapterId) {
      if (chapterSignature(active) !== lastSaved.current.get(active.id_capitulo)) {
        void saveChapter(active);
      }
    }
    setActiveId(chapterId);
    setSaveState("idle");
    setFeedback(null);
  }

  function updateActive(patch: Partial<Pick<Chapter, "titulo" | "conteudo">>) {
    if (!active || !editable) return;
    setChapters((current) =>
      current.map((chapter) =>
        chapter.id_capitulo === active.id_capitulo ? { ...chapter, ...patch } : chapter,
      ),
    );
  }

  async function addChapter() {
    if (!editable || isAdding) return;
    setIsAdding(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/books/${book.id_livro}/chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: `Chapter ${chapters.length + 1}`,
          conteudo: "",
        }),
      });
      if (!response.ok) {
        setFeedback({
          tone: "error",
          text: await readError(response, "We could not add a chapter."),
        });
        return;
      }
      const chapter = (await response.json()) as Chapter;
      setChapters((current) => sortChapters([...current, chapter]));
      lastSaved.current.set(chapter.id_capitulo, chapterSignature(chapter));
      setActiveId(chapter.id_capitulo);
      setSaveState("saved");
    } catch {
      setFeedback({
        tone: "error",
        text: "The writing service is unavailable. Please try again.",
      });
    } finally {
      setIsAdding(false);
    }
  }

  async function deleteChapter() {
    if (!active || !editable || isDeleting) return;
    if (!window.confirm(`Delete “${active.titulo}”? This cannot be undone.`)) return;

    setIsDeleting(true);
    setFeedback(null);
    try {
      const response = await fetch(
        `/api/books/${book.id_livro}/chapters/${active.id_capitulo}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        setFeedback({
          tone: "error",
          text: await readError(response, "We could not delete this chapter."),
        });
        return;
      }
      await refreshBook(null);
    } catch {
      setFeedback({
        tone: "error",
        text: "The writing service is unavailable. Please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  async function moveChapter(index: number, direction: -1 | 1) {
    if (!editable || isReordering) return;
    const target = index + direction;
    if (target < 0 || target >= chapters.length) return;

    const reordered = [...chapters];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const optimistic = reordered.map((chapter, position) => ({ ...chapter, ordem: position + 1 }));
    setChapters(optimistic);
    setIsReordering(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/books/${book.id_livro}/chapters/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          capitulos: optimistic.map((chapter) => chapter.id_capitulo),
        }),
      });
      if (!response.ok) {
        setFeedback({
          tone: "error",
          text: await readError(response, "We could not reorder the chapters."),
        });
        await refreshBook(activeId);
        return;
      }
      const updated = (await response.json()) as Chapter[];
      setChapters(sortChapters(updated));
    } catch {
      setFeedback({
        tone: "error",
        text: "The writing service is unavailable. Please try again.",
      });
      await refreshBook(activeId);
    } finally {
      setIsReordering(false);
    }
  }

  async function preview() {
    if (!active || isPreviewing) return;
    const saved = await flushActive();
    if (!saved) return;

    setIsPreviewing(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/books/${book.id_livro}/epub`, { method: "POST" });
      if (!response.ok) {
        setFeedback({
          tone: "error",
          text: await readError(response, "We could not generate the draft EPUB."),
        });
        return;
      }
      router.push(`/write/${book.id_livro}/preview`);
    } catch {
      setFeedback({
        tone: "error",
        text: "The preview service is unavailable. Please try again.",
      });
    } finally {
      setIsPreviewing(false);
    }
  }

  async function publish() {
    if (!active || isPublishing) return;
    const saved = await flushActive();
    if (!saved) return;

    setIsPublishing(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/books/${book.id_livro}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: book.titulo,
          descricao: book.descricao,
          data_publicacao: book.data_publicacao.slice(0, 10),
          total_paginas: book.total_paginas,
          autores: book.autores.map((author) => author.id_autor),
          generos: book.generos.map((genre) => genre.id_genero),
          status_publicacao: "publicado",
        }),
      });
      if (!response.ok) {
        setFeedback({
          tone: "error",
          text: await readError(response, "We could not publish this book."),
        });
        return;
      }
      router.push(`/books/${book.id_livro}`);
      router.refresh();
    } catch {
      setFeedback({
        tone: "error",
        text: "The publishing service is unavailable. Please try again.",
      });
    } finally {
      setIsPublishing(false);
    }
  }

  const saveLabel = titleError
    ? "Title required"
    : saveState === "saving"
      ? "Saving..."
      : saveState === "saved"
        ? "All changes saved"
        : saveState === "error"
          ? "Save failed"
          : saveState === "conflict"
            ? "Reloaded after conflict"
            : "Autosave on";

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className={`h-fit p-4 ${card}`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#556B45]">
              Chapters
            </p>
            <p className="mt-1 text-sm font-semibold text-black">{chapters.length} total</p>
          </div>
          <button
            className={secondaryCompact}
            disabled={!editable || isAdding}
            onClick={addChapter}
            type="button"
          >
            {isAdding ? "Adding..." : "Add"}
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {chapters.length === 0 ? (
            <p className="rounded-xl border border-dashed border-black/15 bg-white/60 p-4 text-sm text-black/55">
              Add the first chapter to start writing.
            </p>
          ) : (
            chapters.map((chapter, index) => {
              const isActive = chapter.id_capitulo === activeId;
              return (
                <div className="flex items-center gap-1" key={chapter.id_capitulo}>
                  <button
                    className={`min-w-0 flex-1 rounded-xl border px-3 py-2 text-left text-sm transition ${
                      isActive
                        ? "border-[#1E2E4F] bg-[#1E2E4F] text-white"
                        : "border-black/10 bg-white/70 text-black/75 hover:border-[#1E2E4F]/40 hover:bg-white"
                    }`}
                    onClick={() => selectChapter(chapter.id_capitulo)}
                    type="button"
                  >
                    <span className="block font-mono text-[10px] uppercase tracking-wider opacity-65">
                      {chapter.ordem}
                    </span>
                    <span className="mt-0.5 block truncate font-semibold">
                      {chapter.titulo || "Untitled chapter"}
                    </span>
                  </button>
                  <div className="flex flex-col gap-1">
                    <button
                      aria-label={`Move ${chapter.titulo} up`}
                      className="rounded-md border border-black/10 bg-white px-1.5 text-xs text-black/70 hover:border-[#1E2E4F]/40 disabled:opacity-40"
                      disabled={!editable || isReordering || index === 0}
                      onClick={() => moveChapter(index, -1)}
                      type="button"
                    >
                      ↑
                    </button>
                    <button
                      aria-label={`Move ${chapter.titulo} down`}
                      className="rounded-md border border-black/10 bg-white px-1.5 text-xs text-black/70 hover:border-[#1E2E4F]/40 disabled:opacity-40"
                      disabled={!editable || isReordering || index === chapters.length - 1}
                      onClick={() => moveChapter(index, 1)}
                      type="button"
                    >
                      ↓
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className={`mt-4 p-3 ${cardInset}`}>
          <p className="font-mono text-[10px] uppercase tracking-wider text-[#556B45]">
            Draft metrics
          </p>
          <p className="mt-2 text-sm text-black/70">
            {totalWords.toLocaleString()} words · {totalPages} pages
          </p>
          {!book.tem_epub ? (
            <p className="mt-1 text-xs text-black/50">Preview will generate the EPUB.</p>
          ) : null}
        </div>
      </aside>

      <section className="space-y-4">
        <div className={`p-5 sm:p-7 ${card}`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <Link className="text-sm font-semibold text-[#1E2E4F] hover:underline" href="/write">
                ← All stories
              </Link>
              <h1 className="mt-3 font-serif text-3xl leading-[1] tracking-tight text-black sm:text-4xl">
                {book.titulo}
              </h1>
              <p className="mt-2 text-sm text-black/55">
                {book.status_publicacao === "rascunho"
                  ? "Draft"
                  : book.status_publicacao === "arquivado"
                    ? "Archived"
                    : "Published"}{" "}
                · {book.total_capitulos} chapters · {book.total_palavras.toLocaleString()} words
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className={secondaryCompact}
                disabled={!editable || !active || isPreviewing}
                onClick={preview}
                type="button"
              >
                {isPreviewing ? "Preparing..." : "Preview draft"}
              </button>
              <button
                className={primaryCompact}
                disabled={!editable || !active || isPublishing || chapters.length === 0}
                onClick={publish}
                type="button"
              >
                {isPublishing ? "Publishing..." : "Publish"}
              </button>
            </div>
          </div>

          {!editable ? (
            <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Published books are read-only here. Open the public page to read the final edition.
            </p>
          ) : null}
          {feedback ? (
            <p
              className={`mt-5 rounded-xl border px-4 py-3 text-sm font-medium ${
                feedback.tone === "warning"
                  ? "border-amber-200 bg-amber-50 text-amber-900"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
              role={feedback.tone === "error" ? "alert" : "status"}
            >
              {feedback.text}
            </p>
          ) : null}
        </div>

        {active ? (
          <div className={`p-5 sm:p-7 ${card}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-black/55">
                Chapter {active.ordem} ·{" "}
                <span
                  className={
                    saveState === "error"
                      ? "text-red-700"
                      : saveState === "saved"
                        ? "text-[#556B45]"
                        : "text-black/55"
                  }
                >
                  {saveLabel}
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  className={secondaryCompact}
                  disabled={!editable || saveState === "saving"}
                  onClick={() => void saveChapter(active)}
                  type="button"
                >
                  Save now
                </button>
                <button
                  className={dangerCompact}
                  disabled={!editable || isDeleting}
                  onClick={deleteChapter}
                  type="button"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>

            <label className="mt-6 block font-mono text-[11px] font-semibold uppercase tracking-wider text-[#556B45]">
              Chapter title
              <input
                className={fieldClassName}
                disabled={!editable}
                maxLength={300}
                onChange={(event) => updateActive({ titulo: event.target.value })}
                value={active.titulo}
              />
            </label>
            {titleError ? (
              <p className="mt-2 text-sm font-medium text-red-700" role="alert">
                Chapter title cannot be empty.
              </p>
            ) : null}

            <label className="mt-5 block font-mono text-[11px] font-semibold uppercase tracking-wider text-[#556B45]">
              Chapter text
              <textarea
                className={`${fieldClassName} mt-1.5 min-h-[55vh] resize-y font-serif text-base leading-7`}
                disabled={!editable}
                onChange={(event) => updateActive({ conteudo: event.target.value })}
                placeholder="Write the chapter here. Paragraphs are preserved in the generated EPUB."
                value={active.conteudo}
              />
            </label>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-black/50">
              <span>
                {countWords(active.conteudo).toLocaleString()} words in this chapter
              </span>
              <span>Version {active.versao}</span>
            </div>
          </div>
        ) : (
          <div className={`p-6 ${card}`}>
            <h2 className="font-serif text-3xl text-black">Start with a chapter.</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-black/60">
              Add a chapter to the left. Autosave will keep your text in the backend as you write.
            </p>
            <button
              className={primaryCompact}
              disabled={!editable || isAdding}
              onClick={addChapter}
              type="button"
            >
              {isAdding ? "Adding..." : "Add first chapter"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
