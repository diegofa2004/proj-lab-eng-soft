import type { Metadata } from "next";
import Link from "next/link";

import { requireCurrentUser } from "@/app/lib/auth";
import { SIGNED_NAV_LINKS } from "@/app/lib/navigation";
import { pageBody, pageContainer } from "@/app/lib/ui";
import { formatActiveTime, getReadingDashboard, type ReadingDashboard } from "@/app/lib/reading";
import { LivruspFooterLogo } from "@/components/home/livrusp-logos";
import SiteHeader from "@/components/layout/site-header";

export const metadata: Metadata = {
  title: "Reading dashboard · LivrUSP",
};

type Metric = {
  label: string;
  value: string;
  hint: string;
};

function buildMetrics(dashboard: ReadingDashboard): Metric[] {
  return [
    {
      label: "Books completed",
      value: dashboard.livros_concluidos.toString(),
      hint: "Stories you finished from start to end.",
    },
    {
      label: "Pages read",
      value: dashboard.paginas_lidas.toLocaleString("en-US"),
      hint: "Distinct pages turned across your readings.",
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
    dashboard.paginas_lidas === 0 &&
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
              className="rounded-2xl border border-red-300 bg-red-50/80 p-6 text-red-800 sm:p-8"
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
                    className="flex flex-col justify-between rounded-[24px] border border-black/10 bg-[#E6EBF5]/90 p-6 shadow-2xs sm:p-7"
                    key={metric.label}
                  >
                    <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#556B45]">
                      {metric.label}
                    </p>
                    <p className="mt-4 font-serif text-5xl leading-none tracking-tight text-black sm:text-6xl">
                      {metric.value}
                    </p>
                    <p className="mt-4 text-xs leading-relaxed text-black/55 sm:text-sm">{metric.hint}</p>
                  </article>
                ))}
              </section>

              {isNewReader(result.dashboard) ? (
                <section className="rounded-[24px] border border-black/10 bg-white/70 p-6 sm:p-8">
                  <h2 className="font-serif text-3xl font-normal tracking-tight text-black">
                    Your reading journey starts here.
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-black/60 sm:text-base">
                    You have not started reading yet. Pick a book from the catalog and your
                    progress, pages, and reading time will show up here.
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

        <footer className="border-t border-black/10 pt-10 pb-10">
          <div>
            <nav
              aria-label="Footer"
              className="inline-flex flex-wrap items-center gap-4 rounded-full bg-[#E6EBF5]/90 px-5 py-3 text-xs font-semibold text-black shadow-xs backdrop-blur-xs sm:gap-7 sm:px-8 sm:text-sm"
            >
              {SIGNED_NAV_LINKS.map((item) => (
                <Link className="transition hover:opacity-70" href={item.href} key={item.label}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="mt-12 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div className="flex flex-wrap items-baseline gap-6 sm:gap-10">
              <Link aria-label="LivrUSP Home" href="/">
                <LivruspFooterLogo />
              </Link>
              <span className="font-mono text-[11px] text-[#556B45]">
                © livrUSP. &nbsp; {new Date().getFullYear()}
              </span>
            </div>

            <p className="font-mono text-[11px] text-[#556B45]">All Rights Reserved</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
