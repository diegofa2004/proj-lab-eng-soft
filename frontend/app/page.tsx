import Link from "next/link";
import type { ReactNode } from "react";

import { getOptionalCurrentUser, getSignedHomeData } from "@/app/lib/books";
import { LivruspFooterLogo } from "@/components/home/livrusp-logos";
import HeroBookStack from "@/components/home/hero-book-stack";
import SiteHeader from "@/components/layout/site-header";
import SignedHomePage from "@/components/home/signed-home-page";

type BenefitItem = {
  title: string;
  description: string;
  icon: ReactNode;
};

const BENEFITS: BenefitItem[] = [
  {
    title: "Read for free",
    description:
      "Explore published books, discover new authors, and keep your next read close at hand.",
    icon: (
      <svg
        aria-hidden="true"
        className="h-5 w-5 text-black"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
  {
    title: "Connect with your friends",
    description:
      "Share reviews and find books through the readers in your community.",
    icon: (
      <svg
        aria-hidden="true"
        className="h-5 w-5 text-black"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
  {
    title: "Search the catalog",
    description:
      "Look for books by title, author, genre, or source, then choose what to read next.",
    icon: (
      <svg
        aria-hidden="true"
        className="h-5 w-5 text-black"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        <circle cx="9" cy="7" r="4" />
        <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        <path d="M21 21v-2a4 4 0 0 0-3-3.85" />
      </svg>
    ),
  },
  {
    title: "Publish",
    description:
      "Share original stories with readers when publishing is available for your account.",
    icon: (
      <svg
        aria-hidden="true"
        className="h-5 w-5 text-black"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    ),
  },
];

const STEPS = [
  {
    number: "01",
    title: "Get Started",
    description: "With our intuitive setup, you’re up and running in minutes.",
  },
  {
    number: "02",
    title: "Build your shelf",
    description: "Save favorites and keep a list of books to read later.",
  },
  {
    number: "03",
    title: "Read",
    description: "Choose any book from our library.",
  },
];

export default async function Home() {
  const currentUser = await getOptionalCurrentUser();

  if (currentUser) {
    const signedHomeData = await getSignedHomeData(currentUser);
    return <SignedHomePage currentUser={currentUser} data={signedHomeData} />;
  }

  return (
    <div className="min-h-screen bg-[#D9E1F1] font-sans text-black selection:bg-[#1E2E4F] selection:text-white">
      <div className="mx-auto max-w-[1280px] px-6 sm:px-10 lg:px-12">
        <SiteHeader />

        <main>
          {/* Hero Section */}
          <section className="pt-8 pb-16 sm:pt-12 sm:pb-24">
            <h1 className="text-center font-serif text-6xl leading-[0.95] font-normal tracking-tight text-black sm:text-8xl md:text-[7.5rem] lg:text-[9rem]">
              Read everything.
            </h1>

            <div className="mt-8 sm:mt-12">
              <HeroBookStack />
            </div>
          </section>

          {/* Benefits Section */}
          <section className="border-b border-black/10 py-16 sm:py-24">
            <p className="font-mono text-[11px] tracking-wider text-[#556B45]">
              Benefits
            </p>

            <h2 className="mt-6 font-serif text-4xl font-normal tracking-tight text-black sm:text-5xl md:text-6xl">
              Read. Review. Publish.
            </h2>

            <p className="mt-5 text-sm text-black/60 sm:text-base">
              You can do it all in one place.
            </p>

            <div className="mt-16 grid grid-cols-1 gap-10 border-t border-black/10 pt-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
              {BENEFITS.map((benefit) => (
                <div key={benefit.title} className="flex flex-col">
                  <div className="mb-5">{benefit.icon}</div>
                  <h3 className="font-serif text-lg font-normal text-black sm:text-xl">
                    {benefit.title}
                  </h3>
                  <p className="mt-3 text-xs leading-relaxed text-black/55 sm:text-sm">
                    {benefit.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Map Your Favorite Authors Section */}
          <section className="border-b border-black/10 py-20 sm:py-28">
            <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
              <h2 className="font-serif text-4xl leading-tight font-normal tracking-tight text-black sm:text-5xl md:text-[3.5rem]">
                Map Your Favorite Authors, Series and Genres.
              </h2>

              <Link
                className="shrink-0 rounded-full bg-[#1E2E4F] px-7 py-3.5 text-xs font-semibold text-white transition hover:bg-[#15223B] sm:text-sm"
                href="/books"
              >
                Discover More
              </Link>
            </div>

            <div className="mt-16 grid grid-cols-1 gap-12 border-t border-black/10 pt-12 sm:grid-cols-3 sm:gap-8">
              {STEPS.map((step) => (
                <div key={step.number} className="flex flex-col">
                  <span className="font-serif text-6xl leading-none font-normal text-black/40 sm:text-7xl md:text-8xl">
                    {step.number}
                  </span>
                  <h3 className="mt-8 font-serif text-lg font-normal text-black sm:text-xl">
                    {step.title}
                  </h3>
                  <p className="mt-2.5 max-w-xs text-xs leading-relaxed text-black/55 sm:text-sm">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA Section */}
          <section className="border-b border-black/10 py-24 text-center sm:py-32">
            <div className="mx-auto max-w-2xl">
              <h2 className="font-serif text-4xl font-normal tracking-tight text-black sm:text-5xl md:text-6xl">
                Get started with livrUSP
              </h2>

              <p className="mt-5 text-xs leading-relaxed text-black/55 sm:text-sm">
                Read, review, publish.
                <br />
                Sign up now to immediately start earning points.
              </p>

              <div className="mt-9 flex justify-center">
                <Link
                  className="inline-flex w-full max-w-xl items-center justify-center gap-1 rounded-full bg-[#1E2E4F] px-8 py-3.5 text-xs font-semibold text-white transition hover:bg-[#15223B] sm:text-sm"
                  href="/signup"
                >
                  <span>Sign up</span>
                  <span aria-hidden="true">↗</span>
                </Link>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="pt-12 pb-10">
          <div className="flex items-center gap-6 text-xs font-semibold text-black sm:text-sm">
            <Link className="transition hover:opacity-70" href="/books">
              Search
            </Link>
            <Link className="transition hover:opacity-70" href="/books">
              Reviews
            </Link>
          </div>

          <div className="mt-14 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div className="flex flex-wrap items-baseline gap-6 sm:gap-10">
              <Link aria-label="LivrUSP Home" href="/">
                <LivruspFooterLogo />
              </Link>
              <span className="font-mono text-[11px] text-[#556B45]">
                © livrUSP. &nbsp; {new Date().getFullYear()}
              </span>
            </div>

            <p className="font-mono text-[11px] text-[#556B45]">
              All Rights Reserved
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
