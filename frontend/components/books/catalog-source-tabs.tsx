import Link from "next/link";

import {
  buildBookSearchHref,
  type BookSearchFilters,
  type BookSourceFilter,
} from "@/app/lib/books";

const SOURCE_TABS: { value: BookSourceFilter; label: string }[] = [
  { value: "all", label: "All books" },
  { value: "catalogo", label: "Official catalog" },
  { value: "usuario", label: "Community" },
];

export default function CatalogSourceTabs({ filters }: { filters: BookSearchFilters }) {
  return (
    <nav
      aria-label="Catalog source"
      className="inline-flex flex-wrap gap-1 rounded-full border border-black/10 bg-white/55 p-1 shadow-xs backdrop-blur-xs"
    >
      {SOURCE_TABS.map((tab) => {
        const isActive = filters.source === tab.value;

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition sm:px-5 sm:text-sm ${
              isActive
                ? "bg-[#1E2E4F] text-white shadow-sm"
                : "text-[#1E2E4F] hover:bg-white/90"
            }`}
            href={buildBookSearchHref(filters, { source: tab.value, page: 1 })}
            key={tab.value}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
