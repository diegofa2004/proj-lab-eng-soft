"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { card, primaryCompact } from "@/app/lib/ui";

const fieldClassName =
  "block w-full rounded-xl border border-black/15 bg-white px-3.5 py-2.5 text-sm text-black shadow-2xs outline-none transition placeholder:text-black/40 hover:border-[#1E2E4F]/50 focus:border-[#1E2E4F] focus:ring-2 focus:ring-[#82A7D5]/50";

function extractErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const detail = (data as { detail?: unknown }).detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: unknown } | undefined;
    if (first && typeof first.msg === "string") return first.msg;
  }
  return fallback;
}

export default function NewStoryForm({ today }: { today: string }) {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [status, setStatus] = useState<"idle" | "creating" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "creating") return;
    const cleanTitle = titulo.trim();
    if (!cleanTitle) {
      setStatus("error");
      setMessage("Give your story a title before creating the draft.");
      return;
    }

    setStatus("creating");
    setMessage("");
    try {
      const response = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: cleanTitle,
          descricao: "",
          data_publicacao: today,
          total_paginas: 1,
          autores: [],
          generos: [],
          status_publicacao: "rascunho",
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as unknown;
        setStatus("error");
        setMessage(
          extractErrorMessage(payload, "We could not create the draft. Please try again."),
        );
        return;
      }
      const created = (await response.json()) as { id_livro: number };
      router.push(`/write/${created.id_livro}`);
    } catch {
      setStatus("error");
      setMessage("The writing service is unavailable. Please try again.");
    }
  }

  return (
    <form className={`p-5 sm:p-6 ${card}`} noValidate onSubmit={handleSubmit}>
      <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#556B45]">
        New story
      </p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <label className="flex-1">
          <span className="sr-only">Story title</span>
          <input
            className={fieldClassName}
            maxLength={300}
            onChange={(event) => setTitulo(event.target.value)}
            placeholder="Working title"
            value={titulo}
          />
        </label>
        <button className={primaryCompact} disabled={status === "creating"} type="submit">
          {status === "creating" ? "Creating..." : "Start writing"}
        </button>
      </div>
      {status === "error" ? (
        <p className="mt-3 text-sm font-medium text-red-700" role="alert">
          {message}
        </p>
      ) : null}
    </form>
  );
}
