import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type BenefitItem = {
  title: string;
  description: string;
  icon: ReactNode;
};

const BENEFITS: BenefitItem[] = [
  {
    title: "Read for free",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi egestas velit sed neque sodales aliquam. Integer est velit, luctus quis cursus eu, tristique nec lectus.",
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
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi egestas velit sed neque sodales aliquam. Integer est velit, luctus quis cursus eu, tristique nec lectus.",
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
    title: "AI assisted search",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi egestas velit sed neque sodales aliquam. Integer est velit, luctus quis cursus eu, tristique nec lectus.",
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
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi egestas velit sed neque sodales aliquam. Integer est velit, luctus quis cursus eu, tristique nec lectus.",
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
    title: "Customize",
    description: "Adapt livrUSP to your specific requirements and preferences.",
  },
  {
    number: "03",
    title: "Read",
    description: "Choose any book from our library.",
  },
];

function LivruspHeaderLogo() {
  return (
    <svg
      aria-label="LivrUSP"
      className="h-10 w-auto sm:h-12"
      fill="none"
      role="img"
      viewBox="0 0 320 76"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* L */}
      <g>
        <rect fill="#1E2E4F" height="60" rx="2" width="14" x="4" y="6" />
        <rect fill="#1E2E4F" height="14" rx="2" width="38" x="4" y="52" />
        <rect fill="#89ACE0" height="3" width="14" x="4" y="12" />
        <rect fill="#89ACE0" height="3" width="14" x="4" y="45" />
        <rect fill="#6488BE" height="30" width="3" x="9" y="16" />
        <rect fill="#6488BE" height="14" width="6" x="34" y="52" />
      </g>

      {/* i */}
      <g>
        <rect fill="#1E2E4F" height="44" rx="2" width="14" x="50" y="22" />
        <rect fill="#89ACE0" height="3" width="14" x="50" y="27" />
        <rect fill="#89ACE0" height="3" width="14" x="50" y="32" />
        <rect fill="#89ACE0" height="3" width="14" x="50" y="58" />
      </g>

      {/* v (two leaning books) */}
      <g transform="translate(72, 22) rotate(-14 7 22)">
        <rect fill="#1E2E4F" height="44" rx="2" width="14" x="0" y="0" />
        <rect fill="#89ACE0" height="3" width="14" x="0" y="6" />
        <rect fill="#89ACE0" height="3" width="14" x="0" y="36" />
      </g>
      <g transform="translate(93, 22) rotate(14 7 22)">
        <rect fill="#82A9E1" height="44" rx="2" width="14" x="0" y="0" />
        <rect fill="#D9E1F1" height="3" width="14" x="0" y="6" />
        <rect fill="#D9E1F1" height="3" width="14" x="0" y="36" />
      </g>

      {/* r */}
      <g>
        <path
          d="M118 22H132V28C135 23.5 140 21.5 146 21.5H150V35H144C136.5 35 132 39 132 46.5V66H118V22Z"
          fill="#1E2E4F"
        />
        <rect fill="#D9E1F1" height="3" width="14" x="118" y="55" />
        <rect fill="#D9E1F1" height="3" width="14" x="118" y="60" />
        <rect fill="#D9E1F1" height="13.5" width="3" x="142" y="21.5" />
      </g>

      {/* usp */}
      <text
        fill="#1E2E4F"
        fontFamily="var(--font-geist-sans), Arial, Helvetica, sans-serif"
        fontSize="65"
        fontWeight="800"
        letterSpacing="-3"
        x="153"
        y="66"
      >
        usp
      </text>
    </svg>
  );
}

function LivruspFooterLogo() {
  return (
    <svg
      aria-label="LivrUSP"
      className="h-12 w-auto sm:h-16"
      fill="none"
      role="img"
      viewBox="0 0 320 76"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* L */}
      <g>
        <rect fill="#000000" height="60" rx="2" width="14" x="4" y="6" />
        <rect fill="#000000" height="14" rx="2" width="38" x="4" y="52" />
        <rect fill="#D9E1F1" height="3" width="14" x="4" y="13" />
        <rect fill="#D9E1F1" height="3" width="14" x="4" y="46" />
      </g>

      {/* i */}
      <g>
        <rect fill="#000000" height="44" rx="2" width="14" x="50" y="22" />
        <rect fill="#D9E1F1" height="3" width="14" x="50" y="30" />
      </g>

      {/* v */}
      <path
        d="M68 22H83L93 52L103 22H118L100 66H86L68 22Z"
        fill="#000000"
      />

      {/* r */}
      <path
        d="M122 22H136V28C139 23.5 144 21.5 150 21.5H153V35H147C139.5 35 136 39 136 46.5V66H122V22Z"
        fill="#000000"
      />

      {/* u, s, p */}
      <text
        fill="#000000"
        fontFamily="var(--font-geist-sans), Arial, Helvetica, sans-serif"
        fontSize="65"
        fontWeight="800"
        letterSpacing="-3"
        x="155"
        y="66"
      >
        usp
      </text>
    </svg>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-[#D9E1F1] font-sans text-black selection:bg-[#1E2E4F] selection:text-white">
      <div className="mx-auto max-w-[1280px] px-6 sm:px-10 lg:px-12">
        {/* Top Navbar */}
        <header className="flex items-center justify-between py-6">
          <Link aria-label="LivrUSP Home" className="inline-flex items-center" href="/">
            <LivruspHeaderLogo />
          </Link>

          <nav
            aria-label="Primary"
            className="flex items-center gap-6 rounded-full bg-[#E6EBF5]/90 px-7 py-3 text-xs font-semibold text-black shadow-xs backdrop-blur-xs sm:gap-8 sm:text-sm"
          >
            <Link className="transition hover:opacity-70" href="/books">
              Search
            </Link>
            <Link className="transition hover:opacity-70" href="/books">
              Reviews
            </Link>
          </nav>

          <Link
            className="inline-flex items-center justify-center rounded-full bg-[#24324F] px-6 py-2.5 text-xs font-semibold text-white transition hover:bg-[#1A253B] sm:px-7 sm:py-3 sm:text-sm"
            href="/signup"
          >
            Sign up
          </Link>
        </header>

        <main>
          {/* Hero Section */}
          <section className="pt-8 pb-16 sm:pt-12 sm:pb-24">
            <h1 className="text-center font-serif text-6xl leading-[0.95] font-normal tracking-tight text-black sm:text-8xl md:text-[7.5rem] lg:text-[9rem]">
              Read everything.
            </h1>

            <div className="mt-8 sm:mt-12">
              <Image
                alt="Featured books on LivrUSP including works by Stephen King, Margaret Atwood, Antoine de Saint-Exupéry, and Fernando Morais"
                className="mx-auto h-auto w-full rounded-[28px]"
                height={504}
                priority
                src="/hero-books.png"
                unoptimized
                width={1188}
              />
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
                  <span>Learn More</span>
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
                © livrUSP. &nbsp; 2025
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
