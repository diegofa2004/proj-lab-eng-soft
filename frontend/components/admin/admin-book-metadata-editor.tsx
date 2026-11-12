"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type SyntheticEvent, useMemo, useState } from "react";

import type { AdminBook } from "@/app/lib/admin";
import type { Author, Book, Genre, StatusPublicacao } from "@/app/lib/books";
import {
  card,
  cardInset,
  cardInsetMuted,
  primaryCompact,
  secondaryCompact,
} from "@/app/lib/ui";
import AdminActionButton from "@/components/admin/admin-action-button";

type FormStatus = "idle" | "submitting" | "success" | "error";

type AdminBookMetadataEditorProps = {
  book: AdminBook;
  availableAuthors?: Author[];
  availableGenres?: Genre[];
  mode?: "inline" | "standalone";
  defaultOpen?: boolean;
};

const MAX_BOOK_TITLE_LENGTH = 300;
const MAX_BOOK_PAGES = 2147483647;

const PUBLICATION_STATUS_OPTIONS: {
  value: StatusPublicacao;
  label: string;
  description: string;
}[] = [
  {
    value: "publicado",
    label: "Published (publicado)",
    description: "Visible in the public catalog when not removed.",
  },
  {
    value: "rascunho",
    label: "Draft (rascunho)",
    description: "Work in progress; hidden from public search.",
  },
  {
    value: "arquivado",
    label: "Archived (arquivado)",
    description: "Retired from active catalog browsing.",
  },
];

const labelClassName =
  "block font-mono text-[11px] font-semibold uppercase tracking-wider text-[#556B45]";
const fieldClassName =
  "mt-1.5 block w-full rounded-xl border border-black/15 bg-white px-3.5 py-2.5 text-sm text-black shadow-2xs outline-none transition placeholder:text-black/40 hover:border-[#1E2E4F]/50 focus:border-[#1E2E4F] focus:ring-2 focus:ring-[#82A7D5]/50";

function normalizeDateInput(value: string): string {
  if (!value) return "";
  return value.slice(0, 10);
}

function sameIdSet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  if (setA.size !== b.length) return false;
  return b.every((id) => setA.has(id));
}

function extractErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") {
    return fallback;
  }
  const detail = (data as { detail?: unknown }).detail;
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: unknown } | undefined;
    if (first && typeof first.msg === "string") {
      return first.msg;
    }
  }
  return fallback;
}

export default function AdminBookMetadataEditor({
  book,
  availableAuthors = [],
  availableGenres = [],
  mode = "inline",
  defaultOpen,
}: AdminBookMetadataEditorProps) {
  const router = useRouter();
  const isStandalone = mode === "standalone";

  const [savedBook, setSavedBook] = useState<AdminBook>(book);
  const [isOpen, setIsOpen] = useState<boolean>(defaultOpen ?? isStandalone);

  const [titulo, setTitulo] = useState<string>(book.titulo);
  const [descricao, setDescricao] = useState<string>(book.descricao ?? "");
  const [dataPublicacao, setDataPublicacao] = useState<string>(
    normalizeDateInput(book.data_publicacao),
  );
  const [totalPaginas, setTotalPaginas] = useState<string>(String(book.total_paginas));
  const [statusPublicacao, setStatusPublicacao] = useState<StatusPublicacao>(
    book.status_publicacao,
  );

  const [authorsList, setAuthorsList] = useState<Author[]>(availableAuthors);
  const [genresList, setGenresList] = useState<Genre[]>(availableGenres);

  const initialAuthorIds = useMemo(
    () => (savedBook.autores ?? []).map((author) => author.id_autor),
    [savedBook.autores],
  );
  const initialGenreIds = useMemo(
    () => (savedBook.generos ?? []).map((genre) => genre.id_genero),
    [savedBook.generos],
  );

  const [selectedAuthorIds, setSelectedAuthorIds] = useState<number[]>(initialAuthorIds);
  const [selectedGenreIds, setSelectedGenreIds] = useState<number[]>(initialGenreIds);
  const [editRelations, setEditRelations] = useState<boolean>(Boolean(book.relationsLoaded));

  const [newAuthorName, setNewAuthorName] = useState<string>("");
  const [newGenreName, setNewGenreName] = useState<string>("");
  const [creatingAuthor, setCreatingAuthor] = useState<boolean>(false);
  const [creatingGenre, setCreatingGenre] = useState<boolean>(false);

  const [formStatus, setFormStatus] = useState<FormStatus>("idle");
  const [message, setMessage] = useState<string>("");

  const parsedPages = Number(totalPaginas);
  const relationsChanged =
    editRelations &&
    (!sameIdSet(selectedAuthorIds, initialAuthorIds) ||
      !sameIdSet(selectedGenreIds, initialGenreIds));

  const hasChanges =
    titulo.trim() !== savedBook.titulo ||
    descricao !== (savedBook.descricao ?? "") ||
    dataPublicacao !== normalizeDateInput(savedBook.data_publicacao) ||
    parsedPages !== savedBook.total_paginas ||
    statusPublicacao !== savedBook.status_publicacao ||
    relationsChanged;

  const isSubmitting = formStatus === "submitting";
  const remainingTitleChars = MAX_BOOK_TITLE_LENGTH - titulo.length;

  function clearFeedback() {
    if (formStatus !== "idle") {
      setFormStatus("idle");
      setMessage("");
    }
  }

  function handleReset() {
    setTitulo(savedBook.titulo);
    setDescricao(savedBook.descricao ?? "");
    setDataPublicacao(normalizeDateInput(savedBook.data_publicacao));
    setTotalPaginas(String(savedBook.total_paginas));
    setStatusPublicacao(savedBook.status_publicacao);
    setSelectedAuthorIds((savedBook.autores ?? []).map((a) => a.id_autor));
    setSelectedGenreIds((savedBook.generos ?? []).map((g) => g.id_genero));
    setEditRelations(Boolean(savedBook.relationsLoaded));
    setFormStatus("idle");
    setMessage("");
  }

  function toggleAuthor(authorId: number) {
    clearFeedback();
    setEditRelations(true);
    setSelectedAuthorIds((prev) =>
      prev.includes(authorId) ? prev.filter((id) => id !== authorId) : [...prev, authorId],
    );
  }

  function toggleGenre(genreId: number) {
    clearFeedback();
    setEditRelations(true);
    setSelectedGenreIds((prev) =>
      prev.includes(genreId) ? prev.filter((id) => id !== genreId) : [...prev, genreId],
    );
  }

  async function handleCreateAuthor() {
    const trimmed = newAuthorName.trim();
    if (!trimmed) return;

    setCreatingAuthor(true);
    clearFeedback();

    try {
      const response = await fetch("/api/admin/authors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: trimmed }),
      });
      const data = (await response.json().catch(() => null)) as Author | { detail?: unknown } | null;

      if (!response.ok || !data || !("id_autor" in data)) {
        setFormStatus("error");
        setMessage(extractErrorMessage(data, "Could not create author."));
        return;
      }

      setAuthorsList((prev) =>
        [...prev.filter((item) => item.id_autor !== data.id_autor), data].sort((a, b) =>
          a.nome.localeCompare(b.nome),
        ),
      );
      setEditRelations(true);
      setSelectedAuthorIds((prev) =>
        prev.includes(data.id_autor) ? prev : [...prev, data.id_autor],
      );
      setNewAuthorName("");
    } catch {
      setFormStatus("error");
      setMessage("Could not reach the administration service.");
    } finally {
      setCreatingAuthor(false);
    }
  }

  async function handleCreateGenre() {
    const trimmed = newGenreName.trim();
    if (!trimmed) return;

    setCreatingGenre(true);
    clearFeedback();

    try {
      const response = await fetch("/api/admin/genres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: trimmed }),
      });
      const data = (await response.json().catch(() => null)) as Genre | { detail?: unknown } | null;

      if (!response.ok || !data || !("id_genero" in data)) {
        setFormStatus("error");
        setMessage(extractErrorMessage(data, "Could not create genre."));
        return;
      }

      setGenresList((prev) =>
        [...prev.filter((item) => item.id_genero !== data.id_genero), data].sort((a, b) =>
          a.nome.localeCompare(b.nome),
        ),
      );
      setEditRelations(true);
      setSelectedGenreIds((prev) =>
        prev.includes(data.id_genero) ? prev : [...prev, data.id_genero],
      );
      setNewGenreName("");
    } catch {
      setFormStatus("error");
      setMessage("Could not reach the administration service.");
    } finally {
      setCreatingGenre(false);
    }
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTitle = titulo.trim();
    if (!trimmedTitle) {
      setFormStatus("error");
      setMessage("Book title cannot be empty.");
      return;
    }

    if (trimmedTitle.length > MAX_BOOK_TITLE_LENGTH) {
      setFormStatus("error");
      setMessage(`Book title must be at most ${MAX_BOOK_TITLE_LENGTH} characters long.`);
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataPublicacao)) {
      setFormStatus("error");
      setMessage("Publication date must be a valid YYYY-MM-DD date.");
      return;
    }

    if (
      !Number.isSafeInteger(parsedPages) ||
      parsedPages < 1 ||
      parsedPages > MAX_BOOK_PAGES
    ) {
      setFormStatus("error");
      setMessage(`Reading pages must be a whole number between 1 and ${MAX_BOOK_PAGES}.`);
      return;
    }

    setFormStatus("submitting");
    setMessage("");

    const includeRelations =
      relationsChanged || (editRelations && !savedBook.relationsLoaded);

    const payload: Record<string, unknown> = {
      titulo: trimmedTitle,
      descricao,
      data_publicacao: dataPublicacao,
      total_paginas: parsedPages,
      status_publicacao: statusPublicacao,
    };

    if (includeRelations) {
      payload.autores = selectedAuthorIds;
      payload.generos = selectedGenreIds;
    }

    try {
      const response = await fetch(`/api/admin/books/${savedBook.id_livro}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => null)) as
        | (Book & { detail?: unknown })
        | { detail?: unknown }
        | null;

      if (!response.ok) {
        setFormStatus("error");
        setMessage(
          extractErrorMessage(
            data,
            "Could not update book metadata. Please verify the fields and try again.",
          ),
        );
        return;
      }

      const updatedAuthors = includeRelations
        ? authorsList.filter((author) => selectedAuthorIds.includes(author.id_autor))
        : savedBook.autores;
      const updatedGenres = includeRelations
        ? genresList.filter((genre) => selectedGenreIds.includes(genre.id_genero))
        : savedBook.generos;

      if (data && "id_livro" in data) {
        const nextBook: AdminBook = {
          ...savedBook,
          ...data,
          autores: updatedAuthors,
          generos: updatedGenres,
          relationsLoaded: savedBook.relationsLoaded || includeRelations,
        };
        setSavedBook(nextBook);
        setTitulo(nextBook.titulo);
        setDescricao(nextBook.descricao ?? "");
        setDataPublicacao(normalizeDateInput(nextBook.data_publicacao));
        setTotalPaginas(String(nextBook.total_paginas));
        setStatusPublicacao(nextBook.status_publicacao);
      } else {
        setSavedBook((prev) => ({
          ...prev,
          titulo: trimmedTitle,
          descricao,
          data_publicacao: dataPublicacao,
          total_paginas: parsedPages,
          status_publicacao: statusPublicacao,
          autores: updatedAuthors,
          generos: updatedGenres,
          relationsLoaded: prev.relationsLoaded || includeRelations,
        }));
      }

      setFormStatus("success");
      setMessage("Book metadata updated.");
      router.refresh();
    } catch {
      setFormStatus("error");
      setMessage("Could not reach the administration service.");
    }
  }

  const editorForm = (
    <form
      aria-label={`Edit metadata for ${savedBook.titulo}`}
      className={isStandalone ? "space-y-6" : `mt-4 space-y-5 p-5 ${cardInset}`}
      noValidate
      onSubmit={handleSubmit}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 pb-3">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#556B45]">
            Metadata Editor · Book #{savedBook.id_livro}
          </p>
          <p className="mt-0.5 text-xs text-black/60">
            Update catalog information, publication state, and reading length. Every save is recorded in the administrative audit log.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasChanges ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-700/25 bg-amber-100/80 px-3 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-900">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber-600" />
              Unsaved changes
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full border border-[#556B45]/25 bg-white/80 px-3 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#556B45]">
              Synced
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <label
            className={labelClassName}
            htmlFor={`book-title-${savedBook.id_livro}`}
          >
            Title
          </label>
          <span
            className={`font-mono text-[11px] ${
              remainingTitleChars < 30 ? "font-semibold text-amber-800" : "text-[#556B45]"
            }`}
          >
            {titulo.length} / {MAX_BOOK_TITLE_LENGTH}
          </span>
        </div>
        <input
          className={fieldClassName}
          id={`book-title-${savedBook.id_livro}`}
          maxLength={MAX_BOOK_TITLE_LENGTH}
          name="titulo"
          onChange={(event) => {
            setTitulo(event.target.value);
            clearFeedback();
          }}
          placeholder="Book title"
          required
          type="text"
          value={titulo}
        />
      </div>

      {/* Publication Date, Page Count, Status */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label
            className={labelClassName}
            htmlFor={`book-date-${savedBook.id_livro}`}
          >
            Publication date
          </label>
          <input
            className={fieldClassName}
            id={`book-date-${savedBook.id_livro}`}
            name="data_publicacao"
            onChange={(event) => {
              setDataPublicacao(event.target.value);
              clearFeedback();
            }}
            required
            type="date"
            value={dataPublicacao}
          />
        </div>

        <div>
          <label
            className={labelClassName}
            htmlFor={`book-pages-${savedBook.id_livro}`}
          >
            Reading pages
          </label>
          <input
            className={fieldClassName}
            id={`book-pages-${savedBook.id_livro}`}
            max={MAX_BOOK_PAGES}
            min={1}
            name="total_paginas"
            onChange={(event) => {
              setTotalPaginas(event.target.value);
              clearFeedback();
            }}
            required
            readOnly
            step={1}
            type="number"
            value={totalPaginas}
          />
          <p className="mt-1 text-[11px] text-black/55">
            Calculated automatically from the uploaded EPUB content.
          </p>
        </div>

        <div>
          <label
            className={labelClassName}
            htmlFor={`book-status-${savedBook.id_livro}`}
          >
            Publication status
          </label>
          <select
            className={fieldClassName}
            id={`book-status-${savedBook.id_livro}`}
            name="status_publicacao"
            onChange={(event) => {
              setStatusPublicacao(event.target.value as StatusPublicacao);
              clearFeedback();
            }}
            value={statusPublicacao}
          >
            {PUBLICATION_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-black/55">
            {
              PUBLICATION_STATUS_OPTIONS.find((opt) => opt.value === statusPublicacao)
                ?.description
            }
          </p>
        </div>
      </div>

      {/* Description / Synopsis */}
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <label
            className={labelClassName}
            htmlFor={`book-description-${savedBook.id_livro}`}
          >
            Synopsis / Description
          </label>
          {descricao.length > 0 && (
            <button
              className="font-mono text-[11px] font-semibold text-[#1E2E4F] transition hover:underline"
              onClick={() => {
                setDescricao("");
                clearFeedback();
              }}
              type="button"
            >
              Clear synopsis
            </button>
          )}
        </div>
        <textarea
          className={`${fieldClassName} min-h-[110px] resize-y leading-relaxed`}
          id={`book-description-${savedBook.id_livro}`}
          name="descricao"
          onChange={(event) => {
            setDescricao(event.target.value);
            clearFeedback();
          }}
          placeholder="Write or update the book synopsis shown on the public details page..."
          rows={4}
          value={descricao}
        />
      </div>

      {/* Authors & Genres Relations */}
      {(authorsList.length > 0 || genresList.length > 0 || isStandalone) && (
        <div className={`space-y-4 p-4 ${cardInsetMuted}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className={labelClassName}>Authors &amp; Genres</span>
              <p className="mt-0.5 text-xs text-black/60">
                {savedBook.relationsLoaded
                  ? "Select the authors and genres linked to this book in catalog search."
                  : "Author and genre links are only replaced if you enable relation editing below."}
              </p>
            </div>
            {!savedBook.relationsLoaded && (
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#1E2E4F]">
                <input
                  checked={editRelations}
                  className="h-4 w-4 rounded border-black/25 accent-[#1E2E4F]"
                  onChange={(event) => {
                    setEditRelations(event.target.checked);
                    clearFeedback();
                  }}
                  type="checkbox"
                />
                Edit authors &amp; genres
              </label>
            )}
          </div>

          {editRelations && (
            <div className="grid gap-5 pt-2 md:grid-cols-2">
              {/* Authors */}
              <div>
                <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#1E2E4F]">
                  Authors ({selectedAuthorIds.length} selected)
                </p>
                {authorsList.length === 0 ? (
                  <p className="mt-2 text-xs text-black/55">No authors registered yet.</p>
                ) : (
                  <div className="mt-2 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto pr-1">
                    {authorsList.map((author) => {
                      const selected = selectedAuthorIds.includes(author.id_autor);
                      return (
                        <button
                          aria-pressed={selected}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                            selected
                              ? "border-[#1E2E4F] bg-[#1E2E4F] text-white"
                              : "border-black/15 bg-white/80 text-black/80 hover:border-[#1E2E4F]/50 hover:bg-white"
                          }`}
                          key={author.id_autor}
                          onClick={() => toggleAuthor(author.id_autor)}
                          type="button"
                        >
                          {author.nome}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="mt-3 flex gap-2">
                  <input
                    aria-label="New author name"
                    className="min-w-0 flex-1 rounded-lg border border-black/15 bg-white px-3 py-1.5 text-xs text-black outline-none focus:border-[#1E2E4F]"
                    maxLength={200}
                    onChange={(event) => setNewAuthorName(event.target.value)}
                    placeholder="Add new author..."
                    type="text"
                    value={newAuthorName}
                  />
                  <button
                    className={secondaryCompact}
                    disabled={creatingAuthor || !newAuthorName.trim()}
                    onClick={handleCreateAuthor}
                    type="button"
                  >
                    {creatingAuthor ? "Adding..." : "Add author"}
                  </button>
                </div>
              </div>

              {/* Genres */}
              <div>
                <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#1E2E4F]">
                  Genres ({selectedGenreIds.length} selected)
                </p>
                {genresList.length === 0 ? (
                  <p className="mt-2 text-xs text-black/55">No genres registered yet.</p>
                ) : (
                  <div className="mt-2 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto pr-1">
                    {genresList.map((genre) => {
                      const selected = selectedGenreIds.includes(genre.id_genero);
                      return (
                        <button
                          aria-pressed={selected}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                            selected
                              ? "border-[#1E2E4F] bg-[#1E2E4F] text-white"
                              : "border-black/15 bg-white/80 text-black/80 hover:border-[#1E2E4F]/50 hover:bg-white"
                          }`}
                          key={genre.id_genero}
                          onClick={() => toggleGenre(genre.id_genero)}
                          type="button"
                        >
                          {genre.nome}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="mt-3 flex gap-2">
                  <input
                    aria-label="New genre name"
                    className="min-w-0 flex-1 rounded-lg border border-black/15 bg-white px-3 py-1.5 text-xs text-black outline-none focus:border-[#1E2E4F]"
                    maxLength={100}
                    onChange={(event) => setNewGenreName(event.target.value)}
                    placeholder="Add new genre..."
                    type="text"
                    value={newGenreName}
                  />
                  <button
                    className={secondaryCompact}
                    disabled={creatingGenre || !newGenreName.trim()}
                    onClick={handleCreateGenre}
                    type="button"
                  >
                    {creatingGenre ? "Adding..." : "Add genre"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Read-only System Metadata Summary */}
      <dl className="grid grid-cols-2 gap-3 border-t border-black/10 pt-4 text-xs text-black/65 sm:grid-cols-4">
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-wider text-[#556B45]">
            Origin
          </dt>
          <dd className="mt-0.5 font-semibold text-black">
            {savedBook.origem === "usuario" ? "Community book" : "Catalog book"}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-wider text-[#556B45]">
            Visibility
          </dt>
          <dd className="mt-0.5 font-semibold text-black">
            {savedBook.status_bloqueado ? "Removed from catalog" : "Allowed in catalog"}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-wider text-[#556B45]">
            Publisher ID
          </dt>
          <dd className="mt-0.5 font-mono text-black">
            {savedBook.id_publicador ? `#${savedBook.id_publicador}` : "Platform"}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-wider text-[#556B45]">
            Content Endpoint
          </dt>
          <dd className="mt-0.5 truncate font-mono text-black" title={savedBook.arquivo_conteudo}>
            {savedBook.arquivo_conteudo}
          </dd>
        </div>
      </dl>

      {/* Feedback Banner */}
      {formStatus === "error" && message && (
        <div
          className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
          role="alert"
        >
          {message}
        </div>
      )}

      {formStatus === "success" && message && (
        <div
          aria-live="polite"
          className="rounded-xl border border-[#556B45]/35 bg-[#556B45]/10 px-4 py-3 text-sm font-medium text-[#2E3D23]"
          role="status"
        >
          {message}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            className={primaryCompact}
            disabled={isSubmitting || !hasChanges}
            type="submit"
          >
            {isSubmitting ? "Saving..." : "Save metadata"}
          </button>
          <button
            className={secondaryCompact}
            disabled={isSubmitting || !hasChanges}
            onClick={handleReset}
            type="button"
          >
            Reset
          </button>
          {!isStandalone && (
            <button
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              disabled={isSubmitting}
              onClick={() => setIsOpen(false)}
              type="button"
            >
              Cancel
            </button>
          )}
        </div>

        {!isStandalone && (
          <Link
            className="text-xs font-semibold text-[#1E2E4F] hover:underline"
            href={`/admin/books/${savedBook.id_livro}`}
          >
            Open dedicated editor →
          </Link>
        )}
      </div>
    </form>
  );

  if (isStandalone) {
    return (
      <div className={`${card} p-6 sm:p-8`}>
        {editorForm}
      </div>
    );
  }

  return (
    <li className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              className="font-semibold text-black hover:text-[#1E2E4F] hover:underline"
              href={`/admin/books/${savedBook.id_livro}`}
            >
              {savedBook.titulo}
            </Link>
            {savedBook.autores && savedBook.autores.length > 0 && (
              <span className="text-xs text-slate-500">
                by {savedBook.autores.map((a) => a.nome).join(", ")}
              </span>
            )}
          </div>

          <p className="mt-0.5 text-sm text-slate-500">
            #{savedBook.id_livro} ·{" "}
            {savedBook.origem === "usuario" ? "Community book" : "Catalog book"} ·{" "}
            {savedBook.status_bloqueado ? "Removed" : savedBook.status_publicacao} ·{" "}
            {savedBook.total_paginas} reading pages ·{" "}
            Published {normalizeDateInput(savedBook.data_publicacao)}
          </p>

          {savedBook.generos && savedBook.generos.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {savedBook.generos.map((genre) => (
                <span
                  className="rounded-full border border-[#1E2E4F]/15 bg-white/75 px-2 py-0.5 text-[11px] font-medium text-[#1E2E4F]"
                  key={genre.id_genero}
                >
                  {genre.nome}
                </span>
              ))}
            </div>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            {!savedBook.status_bloqueado && savedBook.status_publicacao === "publicado" && (
              <Link
                className="text-sm text-[#1E2E4F] hover:underline"
                href={`/books/${savedBook.id_livro}`}
              >
                View public page
              </Link>
            )}
            <Link
              className="text-sm text-slate-600 hover:text-[#1E2E4F] hover:underline"
              href={`/admin/books/${savedBook.id_livro}`}
            >
              Metadata page
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-2">
          <button
            aria-expanded={isOpen}
            className={secondaryCompact}
            onClick={() => setIsOpen((prev) => !prev)}
            type="button"
          >
            {isOpen ? "Close editor" : "Edit metadata"}
          </button>
          <AdminActionButton
            confirmText={
              savedBook.status_bloqueado
                ? undefined
                : `Remove “${savedBook.titulo}” from the public catalog?`
            }
            label={savedBook.status_bloqueado ? "Restore" : "Remove from catalog"}
            method="POST"
            path={`books/${savedBook.id_livro}/${savedBook.status_bloqueado ? "unblock" : "block"}`}
            tone={savedBook.status_bloqueado ? "neutral" : "danger"}
          />
        </div>
      </div>

      {isOpen && editorForm}
    </li>
  );
}
