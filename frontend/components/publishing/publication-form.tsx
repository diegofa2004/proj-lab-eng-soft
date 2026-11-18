"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import type { Author, Genre } from "@/app/lib/books";
import {
  card,
  cardInset,
  cardInsetMuted,
  primaryCompact,
  secondaryCompact,
} from "@/app/lib/ui";

const MAX_BOOK_TITLE_LENGTH = 300;
const MAX_BOOK_PAGES = 2147483647;
const MAX_EPUB_BYTES = 50 * 1024 * 1024;

const labelClassName =
  "block font-mono text-[11px] font-semibold uppercase tracking-wider text-[#556B45]";
const fieldClassName =
  "mt-1.5 block w-full rounded-xl border border-black/15 bg-white px-3.5 py-2.5 text-sm text-black shadow-2xs outline-none transition placeholder:text-black/40 hover:border-[#1E2E4F]/50 focus:border-[#1E2E4F] focus:ring-2 focus:ring-[#82A7D5]/50";

type Status = "idle" | "submitting" | "error" | "success";

type CreatedBook = {
  id_livro: number;
};

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

async function readError(response: Response, fallback: string): Promise<string> {
  const payload = (await response.json().catch(() => null)) as unknown;
  return extractErrorMessage(payload, fallback);
}

function toggleSelection(
  setter: (updater: (current: number[]) => number[]) => void,
  id: number,
) {
  setter((current) =>
    current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
  );
}

function SelectionGrid({
  items,
  selected,
  emptyLabel,
  onToggle,
}: {
  items: { id: number; label: string }[];
  selected: number[];
  emptyLabel: string;
  onToggle: (id: number) => void;
}) {
  if (items.length === 0) {
    return <p className="mt-2 text-sm text-black/55">{emptyLabel}</p>;
  }

  return (
    <div className="mt-2 grid max-h-56 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const active = selected.includes(item.id);
        return (
          <button
            aria-pressed={active}
            className={`rounded-xl border px-3.5 py-2.5 text-left text-sm font-semibold transition ${
              active
                ? "border-[#1E2E4F] bg-[#1E2E4F] text-white shadow-sm"
                : "border-black/12 bg-white/75 text-black/75 hover:border-[#1E2E4F]/55 hover:bg-white"
            }`}
            key={item.id}
            onClick={() => onToggle(item.id)}
            type="button"
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export default function PublicationForm({
  authors,
  genres,
  today,
}: {
  authors: Author[];
  genres: Genre[];
  today: string;
}) {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataPublicacao, setDataPublicacao] = useState(today);
  const [totalPaginas, setTotalPaginas] = useState("1");
  const [authorIds, setAuthorIds] = useState<number[]>([]);
  const [genreIds, setGenreIds] = useState<number[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [publishNow, setPublishNow] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [createdId, setCreatedId] = useState<number | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;

    setStatus("idle");
    setMessage("");

    const cleanTitle = titulo.trim();
    if (!cleanTitle || cleanTitle.length > MAX_BOOK_TITLE_LENGTH) {
      setStatus("error");
      setMessage(`Title must be between 1 and ${MAX_BOOK_TITLE_LENGTH} characters.`);
      return;
    }
    if (!dataPublicacao) {
      setStatus("error");
      setMessage("Choose a publication date.");
      return;
    }

    const pages = Number(totalPaginas);
    if (!Number.isInteger(pages) || pages < 1 || pages > MAX_BOOK_PAGES) {
      setStatus("error");
      setMessage("Page count must be a positive whole number.");
      return;
    }
    if (publishNow && !file) {
      setStatus("error");
      setMessage("Add an EPUB file before publishing. You can also save a draft and upload it later.");
      return;
    }
    if (file && !file.name.toLowerCase().endsWith(".epub")) {
      setStatus("error");
      setMessage("Choose a file with the .epub extension.");
      return;
    }
    if (file && file.size > MAX_EPUB_BYTES) {
      setStatus("error");
      setMessage("EPUB files must be at most 50 MB.");
      return;
    }

    const payload = {
      titulo: cleanTitle,
      descricao: descricao.trim(),
      data_publicacao: dataPublicacao,
      total_paginas: pages,
      autores: authorIds,
      generos: genreIds,
      status_publicacao: "rascunho",
    };

    setStatus("submitting");

    try {
      const createResponse = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!createResponse.ok) {
        setStatus("error");
        setMessage(
          await readError(createResponse, "We could not create this book. Please try again."),
        );
        return;
      }

      const created = (await createResponse.json()) as CreatedBook;
      const bookId = created.id_livro;
      setCreatedId(bookId);

      if (file) {
        const uploadBody = new FormData();
        uploadBody.append("file", file);
        const uploadResponse = await fetch(`/api/books/${bookId}/content`, {
          method: "POST",
          body: uploadBody,
        });
        if (!uploadResponse.ok) {
          setStatus("error");
          setMessage(
            `${await readError(uploadResponse, "The EPUB upload failed.")} The draft was saved without a book file.`,
          );
          return;
        }
      }

      if (file || publishNow) {
        const finalStatus = publishNow ? "publicado" : "rascunho";
        const updateResponse = await fetch(`/api/books/${bookId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, status_publicacao: finalStatus }),
        });
        if (!updateResponse.ok) {
          setStatus("error");
          setMessage(
            await readError(
              updateResponse,
              publishNow
                ? "The EPUB was uploaded, but publishing failed."
                : "The draft was saved, but its page count could not be refreshed.",
            ),
          );
          return;
        }
      }

      setStatus("success");
      setMessage(
        publishNow
          ? "Your book is published and available in the catalog."
          : "Your draft is saved. You can continue editing it from the writing studio.",
      );
      router.refresh();
    } catch {
      setStatus("error");
      setMessage("The publishing service is unavailable. Please try again.");
    }
  }

  if (status === "success" && createdId !== null) {
    return (
      <section className={`p-6 sm:p-8 lg:p-10 ${card}`} role="status">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#556B45]">
          Publication complete
        </p>
        <h2 className="mt-3 font-serif text-4xl leading-[0.98] tracking-tight text-black sm:text-5xl">
          {publishNow ? "Your book is live." : "Draft saved."}
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-black/65 sm:text-base">
          {message}
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          {publishNow ? (
            <Link className={primaryCompact} href={`/books/${createdId}`}>
              View book page
            </Link>
          ) : (
            <Link className={primaryCompact} href="/library">
              Go to your library
            </Link>
          )}
          <Link className={secondaryCompact} href="/publish">
            Publish another book
          </Link>
        </div>
      </section>
    );
  }

  return (
    <form className="space-y-6" noValidate onSubmit={handleSubmit}>
      <section className={`p-6 sm:p-8 lg:p-10 ${card}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#556B45]">
              New publication · 01
            </p>
            <h2 className="mt-3 font-serif text-4xl leading-[0.98] tracking-tight text-black sm:text-5xl">
              Book details.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-black/60">
              Add the information readers will see in the catalog. You can save a draft and upload
              the EPUB later.
            </p>
          </div>
          <span className="rounded-full border border-[#1E2E4F]/20 bg-[#D9E1F1] px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#1E2E4F]">
            Community publication
          </span>
        </div>

        <div className="mt-8 grid gap-5">
          <label className={labelClassName}>
            Title
            <input
              className={fieldClassName}
              maxLength={MAX_BOOK_TITLE_LENGTH}
              onChange={(event) => setTitulo(event.target.value)}
              placeholder="The title readers will see"
              value={titulo}
            />
          </label>

          <label className={labelClassName}>
            Synopsis
            <textarea
              className={`${fieldClassName} min-h-32 resize-y`}
              onChange={(event) => setDescricao(event.target.value)}
              placeholder="A short description of the story, themes, and what makes it worth reading."
              value={descricao}
            />
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className={labelClassName}>
              Publication date
              <input
                className={fieldClassName}
                onChange={(event) => setDataPublicacao(event.target.value)}
                type="date"
                value={dataPublicacao}
              />
            </label>
            <label className={labelClassName}>
              Estimated pages
              <input
                className={fieldClassName}
                inputMode="numeric"
                min={1}
                onChange={(event) => setTotalPaginas(event.target.value)}
                type="number"
                value={totalPaginas}
              />
            </label>
          </div>
        </div>
      </section>

      <section className={`p-6 sm:p-8 lg:p-10 ${card}`}>
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#556B45]">
          Classification · 02
        </p>
        <h2 className="mt-3 font-serif text-4xl leading-[0.98] tracking-tight text-black">
          Authors &amp; genres.
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-black/60">
          Leave authors empty to publish under your profile name. Genres help readers find the
          book in catalog filters.
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className={`p-4 ${cardInset}`}>
            <p className={labelClassName}>Authors</p>
            <SelectionGrid
              emptyLabel="No authors are available yet."
              items={authors.map((author) => ({ id: author.id_autor, label: author.nome }))}
              onToggle={(id) =>
                toggleSelection((updater) => setAuthorIds((current) => updater(current)), id)
              }
              selected={authorIds}
            />
          </div>
          <div className={`p-4 ${cardInset}`}>
            <p className={labelClassName}>Genres</p>
            <SelectionGrid
              emptyLabel="No genres are available yet."
              items={genres.map((genre) => ({ id: genre.id_genero, label: genre.nome }))}
              onToggle={(id) =>
                toggleSelection((updater) => setGenreIds((current) => updater(current)), id)
              }
              selected={genreIds}
            />
          </div>
        </div>
      </section>

      <section className={`p-6 sm:p-8 lg:p-10 ${card}`}>
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#556B45]">
          Book file · 03
        </p>
        <h2 className="mt-3 font-serif text-4xl leading-[0.98] tracking-tight text-black">
          Upload the EPUB.
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-black/60">
          You can publish immediately with an EPUB3 file, or save the metadata as a draft first.
          Files are limited to 50 MB.
        </p>

        <div className={`mt-6 p-4 ${cardInsetMuted}`}>
          <label className={labelClassName}>
            EPUB3 file
            <input
              accept=".epub,application/epub+zip"
              className={`${fieldClassName} file:mr-4 file:rounded-full file:border-0 file:bg-[#1E2E4F] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#15223B]`}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              type="file"
            />
          </label>
          {file ? (
            <p className="mt-2 text-xs font-medium text-black/55">
              Selected: {file.name} · {(file.size / (1024 * 1024)).toFixed(1)} MB
            </p>
          ) : (
            <p className="mt-2 text-xs text-black/55">No file selected.</p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-black/10 pt-6">
          <label className="flex items-center gap-2.5 text-sm font-medium text-black/70">
            <input
              checked={publishNow}
              className="h-4 w-4 accent-[#1E2E4F]"
              onChange={(event) => setPublishNow(event.target.checked)}
              type="checkbox"
            />
            Publish immediately after upload
          </label>
          <button className={primaryCompact} disabled={status === "submitting"} type="submit">
            {status === "submitting"
              ? "Saving..."
              : publishNow
                ? "Upload and publish"
                : "Save draft"}
          </button>
        </div>

        {status === "error" ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800" role="alert">
            {message}
          </p>
        ) : null}
      </section>
    </form>
  );
}
