import type { Metadata } from "next";
import Link from "next/link";

import { requireCurrentUser } from "@/app/lib/auth";
import { SIGNED_NAV_LINKS } from "@/app/lib/navigation";
import { card, pageBody, pageContainer } from "@/app/lib/ui";
import { formatActiveTime, getReadingDashboard, type ReadingDashboard } from "@/app/lib/reading";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";

export const metadata: Metadata = {
  title: "Reading dashboard · LivrUSP",
};

type Metric = {
  label: string;
  value: string;
  hint: string;
  note?: string;
};

function buildMetrics(dashboard: ReadingDashboard): Metric[] {
  return [
    {
      label: "Books completed",
      value: dashboard.livros_concluidos.toString(),
      hint: "Stories you finished from start to end.",
    },
    {
      label: "Reading pages",
      value: dashboard.paginas_padrao_lidas.toLocaleString("en-US"),
      hint: "Reading volume across your books.",
      note: "A consistent estimate",
    },
    {
      label: "Active time",
      value: formatActiveTime(dashboard.tempo_ativo_segundos),
      hint: "Time spent actively reading.",
    },
    {
      label: "Genres read",
      value: dashboard.generos_lidos.toString(),
      hint: "Different genres explored so far.",
    },
    {
      label: "Authors read",
      value: dashboard.autores_lidos.toString(),
      hint: "Different authors you have read.",
    },
  ];
}

function isNewReader(dashboard: ReadingDashboard): boolean {
  return (
    dashboard.livros_concluidos === 0 &&
    dashboard.paginas_padrao_lidas === 0 &&
    dashboard.tempo_ativo_segundos === 0 &&
    dashboard.generos_lidos === 0 &&
    dashboard.autores_lidos === 0
  );
}

export default async function DashboardPage() {
  const [user, result] = await Promise.all([requireCurrentUser(), getReadingDashboard()]);

  return (
    <div className={pageBody}>
      <div className={pageContainer}>
        <SiteHeader activeHref="/dashboard" currentUser={user} />

        <main className="space-y-10 pt-4 pb-16 sm:pt-8 sm:pb-20">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-[#556B45]">
              Reading activity
            </p>
            <h1 className="mt-3 font-serif text-5xl leading-[0.98] font-normal tracking-tight text-black sm:text-6xl md:text-7xl">
              Your dashboard.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-black/60 sm:text-base">
              A snapshot of everything you have read, how much time you spent reading, and the
              worlds you have explored so far.
            </p>
          </div>

          {result.status === "error" ? (
            <section
              aria-live="polite"
              className="rounded-[24px] border border-red-300 bg-red-50/80 p-6 text-red-800 sm:p-8"
              role="alert"
            >
              <h2 className="font-serif text-2xl font-normal">Dashboard unavailable</h2>
              <p className="mt-2 text-sm leading-relaxed">{result.detail}</p>
              <Link
                className="mt-4 inline-flex rounded-full bg-[#1E2E4F] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#15223B]"
                href="/dashboard"
              >
                Try again
              </Link>
            </section>
          ) : (
            <>
              <section aria-label="Reading statistics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {buildMetrics(result.dashboard).map((metric) => (
                  <article
                    className={`flex flex-col justify-between p-6 sm:p-7 ${card}`}
                    key={metric.label}
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#556B45]">
                        {metric.label}
                      </p>
                      {metric.note ? (
                        <span className="text-[11px] text-black/45">{metric.note}</span>
                      ) : null}
                    </div>
                    <p className="mt-4 font-serif text-5xl leading-none tracking-tight text-black sm:text-6xl">
                      {metric.value}
                    </p>
                    <p className="mt-4 text-xs leading-relaxed text-black/55 sm:text-sm">{metric.hint}</p>
                  </article>
                ))}
              </section>

              {isNewReader(result.dashboard) ? (
                <section className={`${card} p-6 sm:p-8`}>
                  <h2 className="font-serif text-3xl font-normal tracking-tight text-black">
                    Your reading journey starts here.
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-black/60 sm:text-base">
                    You have not started reading yet. Pick a book from the catalog and your
                    progress, reading pages, and active time will show up here.
                  </p>
                  <Link
                    className="mt-5 inline-flex rounded-full bg-[#1E2E4F] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#15223B]"
                    href="/books"
                  >
                    Browse the catalog
                  </Link>
                </section>
              ) : null}
            </>
          )}
        </main>

        <SiteFooter links={SIGNED_NAV_LINKS} />
      </div>
    </div>
  );
}
