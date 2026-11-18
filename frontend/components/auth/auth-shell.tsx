import Image from "next/image";
import type { ReactNode } from "react";

import { GUEST_NAV_LINKS } from "@/app/lib/navigation";
import { pageBody, pageContainer } from "@/app/lib/ui";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";

type AuthShellProps = {
  mode: "login" | "signup";
  children: ReactNode;
};

export function AuthShell({ mode, children }: AuthShellProps) {
  const isLogin = mode === "login";

  return (
    <div className={pageBody}>
      <div className={pageContainer}>
        <SiteHeader currentUser={null} />

        <main className="grid gap-10 pt-4 pb-16 sm:pt-8 sm:pb-20 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,460px)] lg:items-center lg:gap-16">
          <section aria-label="About LivrUSP" className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-wider text-[#556B45]">
              LivrUSP account
            </p>
            <h1 className="mt-3 max-w-3xl font-serif text-5xl leading-[0.98] font-normal tracking-tight text-black sm:text-6xl md:text-7xl">
              {isLogin ? "Back to the books." : "A new chapter begins."}
            </h1>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-black/60 sm:text-base">
              {isLogin
                ? "Your stories, your shelves, and your next great read are right where you left them."
                : "Make room for every story you love. Read, share, and discover in one place."}
            </p>

            <div className="relative mt-10 h-[clamp(245px,27vw,350px)]" aria-hidden="true">
              <div className="absolute inset-x-0 top-[28%] bottom-0 rounded-[30px] bg-[#1E2E4F]" />
              <Image
                alt=""
                className="relative block h-full w-full object-contain object-bottom"
                height={1024}
                sizes="(max-width: 1024px) 85vw, 600px"
                src="/auth-books-v2.png"
                width={1536}
              />
            </div>
          </section>

          <div className="w-full">{children}</div>
        </main>

        <SiteFooter links={GUEST_NAV_LINKS} />
      </div>
    </div>
  );
}
