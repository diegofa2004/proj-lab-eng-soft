import Link from "next/link";
import type { ReactNode } from "react";

import { requireAdmin } from "@/app/lib/admin";
import { pageBody, pageContainer } from "@/app/lib/ui";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className={pageBody}>
      <div className={pageContainer}>
        <SiteHeader activeHref="/admin" currentUser={admin} />
        <div className="py-8">
          <div className="mb-7">
            <p className="font-mono text-[11px] uppercase tracking-wider text-[#556B45]">
              Backoffice
            </p>
            <h1 className="mt-3 font-serif text-5xl leading-[0.98] font-normal tracking-tight text-black">
              Administration.
            </h1>
            <p className="mt-3 text-sm text-black/60">Manage the catalog and community.</p>
          </div>
          <nav aria-label="Administration sections" className="mb-8 flex flex-wrap gap-2">
            {[
              { href: "/admin", label: "Overview" },
              { href: "/admin/users", label: "Users" },
              { href: "/admin/books", label: "Books" },
              { href: "/admin/reviews", label: "Comments" },
            ].map((item) => (
              <Link
                className="rounded-full border border-[#1E2E4F]/20 bg-white/75 px-4 py-2 text-sm font-semibold text-[#1E2E4F] hover:bg-white"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          {children}
        </div>

        <SiteFooter />
      </div>
    </div>
  );
}
