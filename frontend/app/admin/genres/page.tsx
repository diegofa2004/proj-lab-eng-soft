import { getAdminData } from "@/app/lib/admin";
import type { CanonicalGenre } from "@/app/lib/books";
import CanonicalGenreManager, {
  type CanonicalGenreRule,
} from "@/components/admin/canonical-genre-manager";

export default async function AdminGenresPage() {
  const [genres, rules] = await Promise.all([
    getAdminData<CanonicalGenre[]>("/v2/canonical-genres"),
    getAdminData<CanonicalGenreRule[]>("/v2/admin/canonical-genre-rules"),
  ]);

  return (
    <section>
      <h2 className="text-xl font-semibold">Canonical genres</h2>
      <p className="mt-1 max-w-3xl text-sm text-black/60">
        Raw subjects remain attached to each book. These configurable rules map them into the
        stable genres used by search, shelves, and recommendations.
      </p>
      {genres && rules ? (
        <CanonicalGenreManager genres={genres} initialRules={rules} />
      ) : (
        <p className="mt-6 text-red-700">Could not load genre configuration.</p>
      )}
    </section>
  );
}
