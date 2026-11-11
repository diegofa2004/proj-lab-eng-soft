import { redirect } from "next/navigation";

import { getGenres, getOptionalCurrentUser } from "@/app/lib/books";
import { pageBody, pageContainer } from "@/app/lib/ui";
import { LivruspHeaderLogo } from "@/components/home/livrusp-logos";
import GenrePreferences from "@/components/onboarding/genre-preferences";

export default async function OnboardingPage() {
  const currentUser = await getOptionalCurrentUser();
  if (!currentUser) redirect("/login");
  if (currentUser.onboarding_generos_concluido) redirect("/home");
  const genres = await getGenres();

  return (
    <main className={pageBody}>
      <div className={`${pageContainer} py-6 sm:py-10`}>
        <div className="mb-10 flex items-center justify-between">
          <LivruspHeaderLogo />
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#556B45]">
            First steps
          </span>
        </div>
        <GenrePreferences genres={genres} username={currentUser.username} />
      </div>
    </main>
  );
}
