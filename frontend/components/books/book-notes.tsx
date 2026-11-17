"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type SyntheticEvent, useState } from "react";

import type { CurrentUser } from "@/app/lib/books";
import type { PersonalNote } from "@/app/lib/notes";
import {
  card,
  cardInset,
  dangerCompact,
  primaryCompact,
  secondaryCompact,
} from "@/app/lib/ui";

type BookNotesProps = {
  bookId: number;
  currentUser: CurrentUser | null;
  notes: PersonalNote[];
};

function formatNoteDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

export default function BookNotes({ bookId, currentUser, notes }: BookNotesProps) {
  const [draftText, setDraftText] = useState("");
  const [draftLocation, setDraftLocation] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );
  const router = useRouter();

  if (!currentUser) {
    return (
      <section className={`${card} p-8`}>
        <h2 className="font-serif text-3xl font-normal tracking-tight text-black">
          Personal notes
        </h2>
        <p className="mt-2 text-sm text-black/65">
          Keep private observations, quotes, and reminders about this book.
        </p>
        <div className={`mt-6 flex flex-wrap items-center gap-4 p-4 ${cardInset}`}>
          <p className="text-sm text-black/70">Sign in to create your first note.</p>
          <Link className={primaryCompact} href="/login">
            Sign in
          </Link>
        </div>
      </section>
    );
  }

  async function createNote(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draftText.trim();

    if (!text) {
      setFeedback({ type: "error", text: "Write something before saving your note." });
      return;
    }

    setCreating(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/books/${bookId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          texto: text,
          localizacao: draftLocation.trim() || null,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { detail?: string } | null;

      if (!response.ok) {
        setFeedback({
          type: "error",
          text: payload?.detail ?? "Could not save your note. Please try again.",
        });
        return;
      }

      setDraftText("");
      setDraftLocation("");
      setFeedback({ type: "success", text: "Note saved." });
      router.refresh();
    } catch {
      setFeedback({ type: "error", text: "The notes service is unavailable." });
    } finally {
      setCreating(false);
    }
  }

  function startEditing(note: PersonalNote) {
    setEditingId(note.id_nota);
    setEditText(note.texto);
    setEditLocation(note.localizacao ?? "");
    setFeedback(null);
  }

  async function saveEdit(event: SyntheticEvent<HTMLFormElement>, noteId: number) {
    event.preventDefault();
    const text = editText.trim();

    if (!text) {
      setFeedback({ type: "error", text: "Note text cannot be empty." });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/me/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          texto: text,
          localizacao: editLocation.trim() || null,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { detail?: string } | null;

      if (!response.ok) {
        setFeedback({
          type: "error",
          text: payload?.detail ?? "Could not update your note. Please try again.",
        });
        return;
      }

      setEditingId(null);
      setFeedback({ type: "success", text: "Note updated." });
      router.refresh();
    } catch {
      setFeedback({ type: "error", text: "The notes service is unavailable." });
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(noteId: number) {
    setDeletingId(noteId);
    setFeedback(null);

    try {
      const response = await fetch(`/api/me/notes/${noteId}`, { method: "DELETE" });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
        setFeedback({
          type: "error",
          text: payload?.detail ?? "Could not delete your note. Please try again.",
        });
        return;
      }

      if (editingId === noteId) {
        setEditingId(null);
      }
      setFeedback({ type: "success", text: "Note deleted." });
      router.refresh();
    } catch {
      setFeedback({ type: "error", text: "The notes service is unavailable." });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className={`${card} p-8`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-normal tracking-tight text-black">
            Personal notes
          </h2>
          <p className="mt-2 text-sm text-black/65">
            Keep private observations, quotes, and reminders about this book.
          </p>
        </div>
        <span className="rounded-full border border-black/10 bg-white/70 px-3 py-1 font-mono text-[11px] text-[#556B45]">
          {notes.length} {notes.length === 1 ? "note" : "notes"}
        </span>
      </div>

      <form className="mt-6 space-y-3" noValidate onSubmit={createNote}>
        <div>
          <label className="font-mono text-[11px] uppercase tracking-wider text-[#556B45]" htmlFor="note-text">
            New note
          </label>
          <textarea
            className="mt-2 w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-[#1E2E4F] focus:ring-2 focus:ring-[#82A7D5]/50"
            id="note-text"
            onChange={(event) => setDraftText(event.target.value)}
            placeholder="What do you want to remember about this book?"
            required
            rows={4}
            value={draftText}
          />
        </div>
        <div>
          <label
            className="font-mono text-[11px] uppercase tracking-wider text-[#556B45]"
            htmlFor="note-location"
          >
            Location <span className="normal-case tracking-normal text-black/45">(optional)</span>
          </label>
          <input
            className="mt-2 w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-[#1E2E4F] focus:ring-2 focus:ring-[#82A7D5]/50"
            id="note-location"
            onChange={(event) => setDraftLocation(event.target.value)}
            placeholder="Page, chapter, or quote"
            value={draftLocation}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className={primaryCompact} disabled={creating} type="submit">
            {creating ? "Saving note..." : "Save note"}
          </button>
          {feedback ? (
            <p
              aria-live="polite"
              className={`text-sm ${
                feedback.type === "error" ? "text-red-600" : "text-emerald-700"
              }`}
              role="status"
            >
              {feedback.text}
            </p>
          ) : null}
        </div>
      </form>

      {notes.length > 0 ? (
        <ul className="mt-8 space-y-4">
          {notes.map((note) => (
            <li className={`p-5 ${cardInset}`} key={note.id_nota}>
              {editingId === note.id_nota ? (
                <form className="space-y-3" onSubmit={(event) => saveEdit(event, note.id_nota)}>
                  <div>
                    <label
                      className="font-mono text-[11px] uppercase tracking-wider text-[#556B45]"
                      htmlFor={`edit-note-text-${note.id_nota}`}
                    >
                      Note text
                    </label>
                    <textarea
                      className="mt-2 w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-[#1E2E4F] focus:ring-2 focus:ring-[#82A7D5]/50"
                      id={`edit-note-text-${note.id_nota}`}
                      onChange={(event) => setEditText(event.target.value)}
                      required
                      rows={4}
                      value={editText}
                    />
                  </div>
                  <div>
                    <label
                      className="font-mono text-[11px] uppercase tracking-wider text-[#556B45]"
                      htmlFor={`edit-note-location-${note.id_nota}`}
                    >
                      Location
                    </label>
                    <input
                      className="mt-2 w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-[#1E2E4F] focus:ring-2 focus:ring-[#82A7D5]/50"
                      id={`edit-note-location-${note.id_nota}`}
                      onChange={(event) => setEditLocation(event.target.value)}
                      placeholder="Page, chapter, or quote"
                      value={editLocation}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button className={primaryCompact} disabled={saving} type="submit">
                      {saving ? "Saving..." : "Save changes"}
                    </button>
                    <button
                      className={secondaryCompact}
                      onClick={() => setEditingId(null)}
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-black/80">
                      {note.texto}
                    </p>
                    <div className="flex shrink-0 gap-2">
                      <button
                        className={secondaryCompact}
                        onClick={() => startEditing(note)}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className={dangerCompact}
                        disabled={deletingId === note.id_nota}
                        onClick={() => deleteNote(note.id_nota)}
                        type="button"
                      >
                        {deletingId === note.id_nota ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-black/10 pt-3 text-xs text-black/55">
                    {note.localizacao ? (
                      <span className="rounded-full bg-[#D9E1F1]/70 px-2.5 py-0.5 font-medium text-[#1E2E4F]">
                        {note.localizacao}
                      </span>
                    ) : null}
                    <span>Updated {formatNoteDate(note.data_atualizacao)}</span>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className={`mt-8 p-5 text-sm text-black/60 ${cardInset}`}>
          You have not written any notes for this book yet.
        </p>
      )}
    </section>
  );
}
