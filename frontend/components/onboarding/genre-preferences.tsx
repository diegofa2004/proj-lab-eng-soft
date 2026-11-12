"use client";

import { useState } from "react";

import type { CanonicalGenre } from "@/app/lib/books";
import { primaryPill, secondaryPill } from "@/app/lib/ui";

type SelectionMode = "interesse" | "nao_interessa";

export default function GenrePreferences({
  genres,
  username,
}: {
  genres: CanonicalGenre[];
  username: string;
}) {
  const [mode, setMode] = useState<SelectionMode>("interesse");
  const [interests, setInterests] = useState<Set<number>>(new Set());
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  function toggleGenre(genreId: number) {
    setError("");
    if (mode === "interesse") {
      setInterests((current) => {
        const next = new Set(current);
        if (next.has(genreId)) {
          next.delete(genreId);
        } else {
          next.add(genreId);
        }
        return next;
      });
      setExcluded((current) => {
        const next = new Set(current);
        next.delete(genreId);
        return next;
      });
      return;
    }
    setExcluded((current) => {
      const next = new Set(current);
      if (next.has(genreId)) {
        next.delete(genreId);
      } else {
        next.add(genreId);
      }
      return next;
    });
    setInterests((current) => {
      const next = new Set(current);
      next.delete(genreId);
      return next;
    });
  }

  async function savePreferences() {
    setIsSaving(true);
    setError("");
    try {
      const response = await fetch("/api/profile/genre-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interesses: [...interests],
          nao_interessa: [...excluded],
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
        setError(payload?.detail ?? "We could not save your preferences. Please try again.");
        return;
      }
      window.location.replace("/home");
    } catch {
      setError("We could not reach the preference service. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const selected = mode === "interesse" ? interests : excluded;
  const buttonClass = (active: boolean) =>
    active
      ? "border-[#1E2E4F] bg-[#1E2E4F] text-white shadow-sm"
      : "border-black/12 bg-white/75 text-black/75 hover:border-[#1E2E4F]/55 hover:bg-white";

  return (
    <section className="rounded-[24px] border border-black/10 bg-[#E6EBF5]/90 p-6 shadow-xs backdrop-blur-xs sm:p-8 lg:p-10">
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#556B45]">
        Your reading map · 01
      </p>
      <h1 className="mt-4 font-serif text-4xl leading-[0.98] tracking-tight text-black sm:text-6xl">
        What pulls you into a story, {username}?
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-black/60 sm:text-base">
        Pick the genres you want to see more often, or mark the ones you would rather leave out.
        These choices give your first recommendations a more personal starting point.
      </p>

      <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="Genre preference mode">
        <button
          aria-selected={mode === "interesse"}
          className={mode === "interesse" ? primaryPill : secondaryPill}
          onClick={() => setMode("interesse")}
          role="tab"
          type="button"
        >
          I&apos;m interested · {interests.size}
        </button>
        <button
          aria-selected={mode === "nao_interessa"}
          className={mode === "nao_interessa" ? "inline-flex items-center justify-center rounded-full bg-[#556B45] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#405133] sm:px-5 sm:py-3 sm:text-sm" : secondaryPill}
          onClick={() => setMode("nao_interessa")}
          role="tab"
          type="button"
        >
          Not interested · {excluded.size}
        </button>
      </div>

      <p className="mt-5 text-sm font-medium text-black/65">
        {mode === "interesse"
          ? "Select genres you would like us to prioritize."
          : "Select genres you do not want in your recommendations."}
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3" role="tabpanel">
        {genres.map((genre) => {
          const isSelected = selected.has(genre.id_genero_canonico);
          const inOtherList =
            mode === "interesse"
              ? excluded.has(genre.id_genero_canonico)
              : interests.has(genre.id_genero_canonico);
          return (
            <button
              aria-pressed={isSelected}
              className={`min-h-14 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${buttonClass(isSelected)}`}
              key={genre.id_genero_canonico}
              onClick={() => toggleGenre(genre.id_genero_canonico)}
              type="button"
            >
              <span className="block">{genre.nome}</span>
              {inOtherList ? (
                <span className="mt-1 block text-xs font-normal opacity-70">
                  Currently marked in the other list
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {error ? <p className="mt-5 text-sm font-medium text-red-700" role="alert">{error}</p> : null}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-black/10 pt-6">
        <p className="text-sm text-black/55">You may continue without selecting a genre.</p>
        <button className={primaryPill} disabled={isSaving} onClick={savePreferences} type="button">
          {isSaving ? "Saving preferences..." : "Continue to For You"}
          {!isSaving ? <span aria-hidden="true">↗</span> : null}
        </button>
      </div>
    </section>
  );
}
