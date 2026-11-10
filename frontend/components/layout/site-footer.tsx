import Link from "next/link";

import type { NavLink } from "@/app/lib/navigation";
import { LivruspFooterLogo } from "@/components/home/livrusp-logos";

type SiteFooterProps = {
  links?: readonly NavLink[];
  className?: string;
};

export default function SiteFooter({ links = [], className = "" }: SiteFooterProps) {
  return (
    <footer className={`border-t border-black/10 pt-10 pb-10 ${className}`}>
      {links.length > 0 ? (
        <nav
          aria-label="Footer"
          className="inline-flex flex-wrap items-center gap-4 rounded-full bg-[#E6EBF5]/90 px-5 py-3 text-xs font-semibold text-black shadow-xs backdrop-blur-xs sm:gap-7 sm:px-8 sm:text-sm"
        >
          {links.map((item) => (
            <Link className="transition hover:opacity-70" href={item.href} key={item.label}>
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}

      <div
        className={`${links.length > 0 ? "mt-12 " : ""}flex flex-col justify-between gap-6 sm:flex-row sm:items-end`}
      >
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
  );
}
