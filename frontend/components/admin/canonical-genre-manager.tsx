"use client";

import { useState } from "react";

import type { CanonicalGenre } from "@/app/lib/books";
import { primaryCompact, secondaryCompact } from "@/app/lib/ui";

export type CanonicalGenreRule = {
  id_regra: number;
  id_genero_canonico: number;
  tipo: "exact" | "contains" | "starts_with" | "ends_with";
  padrao: string;
  peso: number;
  prioridade: number;
  ativo: boolean;
};

export default function CanonicalGenreManager({
  genres,
  initialRules,
}: {
  genres: CanonicalGenre[];
  initialRules: CanonicalGenreRule[];
}) {
  const [rules, setRules] = useState(initialRules);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const genreById = new Map(genres.map((genre) => [genre.id_genero_canonico, genre]));

  async function createRule(formData: FormData) {
    setBusy(true);
    setMessage("");
    const payload = {
      id_genero_canonico: Number(formData.get("genre")),
      tipo: String(formData.get("type")),
      padrao: String(formData.get("pattern") ?? "").trim(),
      peso: Number(formData.get("weight")),
      prioridade: Number(formData.get("priority")),
    };
    const response = await fetch("/api/admin/canonical-genre-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.ok) {
      const createdRule = (await response.json()) as CanonicalGenreRule;
      setRules((current) => [...current, createdRule]);
      setMessage("Rule saved. Reprocess the catalog to apply it to existing books.");
    } else {
      setMessage("Could not save the rule.");
    }
    setBusy(false);
  }

  async function removeRule(ruleId: number) {
    setBusy(true);
    const response = await fetch(`/api/admin/canonical-genre-rules/${ruleId}`, {
      method: "DELETE",
    });
    if (response.ok) {
      setRules((current) => current.filter((rule) => rule.id_regra !== ruleId));
      setMessage("Rule removed. Reprocess the catalog to update existing books.");
    } else {
      setMessage("Could not remove the rule.");
    }
    setBusy(false);
  }

  async function reprocess() {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/canonical-genres/reprocess", { method: "POST" });
    if (response.ok) {
      const result = (await response.json()) as { total: number; unclassified: number };
      setMessage(
        `Reprocessed ${result.total} books; ${result.unclassified} remain without a canonical genre.`,
      );
    } else {
      setMessage("Could not reprocess the catalog.");
    }
    setBusy(false);
  }

  return (
    <div className="mt-6 space-y-8">
      <form action={createRule} className="grid gap-3 rounded-xl border border-black/10 bg-white/75 p-5 md:grid-cols-6">
        <select className="rounded-lg border p-2 md:col-span-2" name="genre" required>
          {genres.map((genre) => (
            <option key={genre.id_genero_canonico} value={genre.id_genero_canonico}>
              {genre.nome}
            </option>
          ))}
        </select>
        <select className="rounded-lg border p-2" defaultValue="contains" name="type">
          <option value="contains">Contains</option>
          <option value="exact">Exact</option>
          <option value="starts_with">Starts with</option>
          <option value="ends_with">Ends with</option>
        </select>
        <input className="rounded-lg border p-2 md:col-span-2" maxLength={200} name="pattern" placeholder="Metadata pattern" required />
        <div className="flex gap-2">
          <input aria-label="Weight" className="min-w-0 rounded-lg border p-2" defaultValue="0.85" max="1" min="0.01" name="weight" step="0.01" type="number" />
          <input aria-label="Priority" className="min-w-0 rounded-lg border p-2" defaultValue="100" name="priority" type="number" />
          <button className={primaryCompact} disabled={busy} type="submit">Add</button>
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-4">
        <button className={secondaryCompact} disabled={busy} onClick={reprocess} type="button">
          Reprocess all books
        </button>
        {message ? <p className="text-sm text-black/65" role="status">{message}</p> : null}
      </div>

      <div className="overflow-x-auto rounded-xl border border-black/10 bg-white/75">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 bg-black/5 text-xs uppercase text-black/55">
            <tr><th className="p-3">Genre</th><th className="p-3">Match</th><th className="p-3">Pattern</th><th className="p-3">Weight</th><th className="p-3"><span className="sr-only">Actions</span></th></tr>
          </thead>
          <tbody className="divide-y divide-black/10">
            {rules.map((rule) => (
              <tr key={rule.id_regra}>
                <td className="p-3 font-medium">{genreById.get(rule.id_genero_canonico)?.nome ?? "Unknown"}</td>
                <td className="p-3 font-mono text-xs">{rule.tipo}</td>
                <td className="p-3">{rule.padrao}</td>
                <td className="p-3">{rule.peso}</td>
                <td className="p-3 text-right"><button className="text-red-700 hover:underline" disabled={busy} onClick={() => removeRule(rule.id_regra)} type="button">Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
