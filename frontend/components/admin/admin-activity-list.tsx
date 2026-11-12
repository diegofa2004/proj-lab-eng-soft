"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { AdminActionType, EnrichedAdminActivity } from "@/app/lib/admin";
import { PUBLICATION_STATUS_LABELS } from "@/app/lib/books";
import { card, cardInset, secondaryCompact } from "@/app/lib/ui";

type CategoryFilter = "all" | "users" | "books" | "reviews";

type AdminActivityListProps = {
  activities: EnrichedAdminActivity[];
  compact?: boolean;
  initialActionFilter?: string;
  initialSearch?: string;
};

type ActionMetadata = {
  label: string;
  category: Exclude<CategoryFilter, "all">;
  badgeClassName: string;
  dotClassName: string;
};

const ACTION_METADATA: Record<AdminActionType, ActionMetadata> = {
  bloquear_usuario: {
    label: "User suspended",
    category: "users",
    badgeClassName: "border border-red-300 bg-red-100 text-red-800",
    dotClassName: "bg-red-600",
  },
  desbloquear_usuario: {
    label: "User restored",
    category: "users",
    badgeClassName: "border border-[#556B45]/35 bg-[#556B45]/15 text-[#2E3D23]",
    dotClassName: "bg-[#556B45]",
  },
  bloquear_livro: {
    label: "Book removed",
    category: "books",
    badgeClassName: "border border-red-300 bg-red-100 text-red-800",
    dotClassName: "bg-red-600",
  },
  desbloquear_livro: {
    label: "Book restored",
    category: "books",
    badgeClassName: "border border-[#556B45]/35 bg-[#556B45]/15 text-[#2E3D23]",
    dotClassName: "bg-[#556B45]",
  },
  editar_livro: {
    label: "Metadata updated",
    category: "books",
    badgeClassName: "border border-[#1E2E4F]/25 bg-[#D9E1F1] text-[#1E2E4F]",
    dotClassName: "bg-[#1E2E4F]",
  },
  moderar_avaliacao: {
    label: "Comment removed",
    category: "reviews",
    badgeClassName: "border border-amber-500/35 bg-amber-100 text-amber-900",
    dotClassName: "bg-amber-600",
  },
};

const ACTION_FILTER_OPTIONS: { value: "all" | AdminActionType; label: string }[] = [
  { value: "all", label: "All action types" },
  { value: "bloquear_usuario", label: "User suspended" },
  { value: "desbloquear_usuario", label: "User restored" },
  { value: "bloquear_livro", label: "Book removed" },
  { value: "desbloquear_livro", label: "Book restored" },
  { value: "editar_livro", label: "Metadata updated" },
  { value: "moderar_avaliacao", label: "Comment removed" },
];

const CATEGORY_TABS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All activity" },
  { value: "users", label: "Users" },
  { value: "books", label: "Books" },
  { value: "reviews", label: "Comments" },
];

function isValidActionFilter(value: string | undefined): value is AdminActionType {
  return (
    value === "bloquear_usuario" ||
    value === "desbloquear_usuario" ||
    value === "bloquear_livro" ||
    value === "desbloquear_livro" ||
    value === "editar_livro" ||
    value === "moderar_avaliacao"
  );
}

function formatActivityTimestamp(isoString: string): string {
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) {
    return isoString;
  }
  return parsed.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderTargetSummary(activity: EnrichedAdminActivity) {
  if (activity.id_usuario_alvo !== null) {
    const targetUser = activity.target_user;
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#556B45]">
          Target user:
        </span>
        <Link
          className="font-semibold text-[#1E2E4F] hover:underline"
          href={`/admin/users/${activity.id_usuario_alvo}`}
        >
          {targetUser ? targetUser.username : `User #${activity.id_usuario_alvo}`}
        </Link>
        <span className="font-mono text-[11px] text-slate-400">
          #{activity.id_usuario_alvo}
        </span>
        {targetUser?.email && (
          <span className="text-slate-500">({targetUser.email})</span>
        )}
        {targetUser && (
          <span
            className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${
              targetUser.is_blocked
                ? "bg-red-100 text-red-800"
                : "bg-white/80 text-slate-600"
            }`}
          >
            {targetUser.is_blocked ? "Currently suspended" : "Currently active"}
          </span>
        )}
      </div>
    );
  }

  if (activity.id_livro_alvo !== null) {
    const targetBook = activity.target_book;
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#556B45]">
          Target book:
        </span>
        <Link
          className="font-semibold text-[#1E2E4F] hover:underline"
          href={`/admin/books/${activity.id_livro_alvo}`}
        >
          {targetBook ? targetBook.titulo : `Book #${activity.id_livro_alvo}`}
        </Link>
        <span className="font-mono text-[11px] text-slate-400">
          #{activity.id_livro_alvo}
        </span>
        {targetBook && (
          <span
            className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${
              targetBook.status_bloqueado
                ? "bg-red-100 text-red-800"
                : "bg-white/80 text-slate-600"
            }`}
          >
            {targetBook.status_bloqueado
              ? "Removed"
              : PUBLICATION_STATUS_LABELS[targetBook.status_publicacao]}
          </span>
        )}
        {targetBook && !targetBook.status_bloqueado && targetBook.status_publicacao === "publicado" && (
          <Link
            className="text-xs font-medium text-[#1E2E4F] hover:underline"
            href={`/books/${activity.id_livro_alvo}`}
          >
            Public page →
          </Link>
        )}
      </div>
    );
  }

  if (activity.id_avaliacao_alvo !== null) {
    const targetReview = activity.target_review;
    return (
      <div className="space-y-1 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#556B45]">
            Target comment:
          </span>
          <Link
            className="font-semibold text-[#1E2E4F] hover:underline"
            href="/admin/reviews"
          >
            Comment #{activity.id_avaliacao_alvo}
          </Link>
          {targetReview && (
            <>
              <span className="text-slate-500">· {targetReview.nota}/5 stars</span>
              <Link
                className="font-medium text-[#1E2E4F] hover:underline"
                href={`/admin/users/${targetReview.id_usuario}`}
              >
                by {targetReview.nome_usuario ?? `User #${targetReview.id_usuario}`}
              </Link>
              <Link
                className="font-medium text-[#1E2E4F] hover:underline"
                href={`/admin/books/${targetReview.id_livro}`}
              >
                on {targetReview.titulo_livro ?? `Book #${targetReview.id_livro}`}
              </Link>
            </>
          )}
        </div>
        {targetReview?.texto_revisao && (
          <p className="line-clamp-2 rounded-lg border border-black/10 bg-white/60 px-2.5 py-1.5 text-xs italic text-slate-700">
            “{targetReview.texto_revisao}”
          </p>
        )}
      </div>
    );
  }

  return null;
}

export default function AdminActivityList({
  activities,
  compact = false,
  initialActionFilter,
  initialSearch = "",
}: AdminActivityListProps) {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [actionFilter, setActionFilter] = useState<"all" | AdminActionType>(
    isValidActionFilter(initialActionFilter) ? initialActionFilter : "all",
  );
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);

  const counts = useMemo(() => {
    let users = 0;
    let books = 0;
    let reviews = 0;

    for (const item of activities) {
      const meta = ACTION_METADATA[item.tipo_acao];
      if (!meta) continue;
      if (meta.category === "users") users += 1;
      else if (meta.category === "books") books += 1;
      else if (meta.category === "reviews") reviews += 1;
    }

    return {
      total: activities.length,
      users,
      books,
      reviews,
    };
  }, [activities]);

  const filteredActivities = useMemo(() => {
    if (compact) return activities;

    const normalizedQuery = searchQuery.trim().toLowerCase();

    return activities.filter((activity) => {
      const meta = ACTION_METADATA[activity.tipo_acao];

      if (categoryFilter !== "all" && meta?.category !== categoryFilter) {
        return false;
      }

      if (actionFilter !== "all" && activity.tipo_acao !== actionFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchableParts = [
        `#${activity.id_log}`,
        String(activity.id_log),
        activity.tipo_acao,
        meta?.label ?? "",
        activity.descricao,
        activity.admin_username ?? `admin #${activity.id_admin}`,
        activity.id_usuario_alvo ? `user #${activity.id_usuario_alvo}` : "",
        activity.target_user?.username ?? "",
        activity.target_user?.email ?? "",
        activity.id_livro_alvo ? `book #${activity.id_livro_alvo}` : "",
        activity.target_book?.titulo ?? "",
        activity.id_avaliacao_alvo ? `comment #${activity.id_avaliacao_alvo}` : "",
        activity.target_review?.texto_revisao ?? "",
        activity.target_review?.titulo_livro ?? "",
        activity.target_review?.nome_usuario ?? "",
      ];

      return searchableParts.some((part) => part.toLowerCase().includes(normalizedQuery));
    });
  }, [activities, actionFilter, categoryFilter, compact, searchQuery]);

  const hasActiveFilters =
    categoryFilter !== "all" || actionFilter !== "all" || searchQuery.trim().length > 0;

  if (activities.length === 0) {
    return (
      <div className={`p-6 text-slate-600 ${card}`}>
        <p className="font-medium text-slate-800">No administrative actions recorded yet.</p>
        <p className="mt-1 text-sm text-slate-600">
          Moderation actions—such as suspending or restoring users, removing or restoring books, updating book metadata, and moderating comments—will appear here automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {!compact && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Loaded logs",
                value: counts.total,
                hint: "Actions in current page",
                category: "all" as CategoryFilter,
              },
              {
                label: "Account actions",
                value: counts.users,
                hint: "Suspensions & restorations",
                category: "users" as CategoryFilter,
              },
              {
                label: "Catalog actions",
                value: counts.books,
                hint: "Book visibility & metadata",
                category: "books" as CategoryFilter,
              },
              {
                label: "Comment moderation",
                value: counts.reviews,
                hint: "Removed community reviews",
                category: "reviews" as CategoryFilter,
              },
            ].map((stat) => {
              const isSelected = categoryFilter === stat.category;
              return (
                <button
                  aria-pressed={isSelected}
                  className={`flex flex-col items-start justify-between p-5 text-left transition ${card} ${
                    isSelected
                      ? "ring-2 ring-[#1E2E4F]"
                      : "hover:ring-2 hover:ring-[#1E2E4F]/20"
                  }`}
                  key={stat.label}
                  onClick={() => {
                    setCategoryFilter(stat.category);
                    if (stat.category !== "all" && actionFilter !== "all") {
                      const actionMeta = ACTION_METADATA[actionFilter];
                      if (actionMeta && actionMeta.category !== stat.category) {
                        setActionFilter("all");
                      }
                    }
                  }}
                  type="button"
                >
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#556B45]">
                    {stat.label}
                  </span>
                  <strong className="mt-2 block text-3xl text-black">{stat.value}</strong>
                  <span className="mt-1 text-xs text-slate-500">{stat.hint}</span>
                </button>
              );
            })}
          </div>

          <div className={`space-y-4 p-4 sm:p-5 ${cardInset}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by target category">
                {CATEGORY_TABS.map((tab) => {
                  const active = categoryFilter === tab.value;
                  return (
                    <button
                      aria-pressed={active}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                        active
                          ? "bg-[#1E2E4F] text-white"
                          : "border border-black/15 bg-white text-[#1E2E4F] hover:border-[#1E2E4F]"
                      }`}
                      key={tab.value}
                      onClick={() => {
                        setCategoryFilter(tab.value);
                        if (tab.value !== "all" && actionFilter !== "all") {
                          const meta = ACTION_METADATA[actionFilter];
                          if (meta && meta.category !== tab.value) {
                            setActionFilter("all");
                          }
                        }
                      }}
                      type="button"
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {hasActiveFilters && (
                <button
                  className={secondaryCompact}
                  onClick={() => {
                    setCategoryFilter("all");
                    setActionFilter("all");
                    setSearchQuery("");
                  }}
                  type="button"
                >
                  Clear filters
                </button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="sr-only" htmlFor="admin-activity-search">
                  Filter activity logs
                </label>
                <input
                  aria-label="Filter activity logs"
                  className="w-full rounded-xl border border-black/15 bg-white px-3.5 py-2 text-sm text-black outline-none transition placeholder:text-black/40 focus:border-[#1E2E4F] focus:ring-2 focus:ring-[#82A7D5]/50"
                  id="admin-activity-search"
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by description, administrator, book title, username, or log #ID..."
                  type="search"
                  value={searchQuery}
                />
              </div>

              <div>
                <label className="sr-only" htmlFor="admin-activity-type">
                  Action type
                </label>
                <select
                  aria-label="Action type"
                  className="w-full rounded-xl border border-black/15 bg-white px-3.5 py-2 text-sm text-black outline-none transition focus:border-[#1E2E4F] focus:ring-2 focus:ring-[#82A7D5]/50"
                  id="admin-activity-type"
                  onChange={(event) => {
                    const nextValue = event.target.value as "all" | AdminActionType;
                    setActionFilter(nextValue);
                    if (nextValue !== "all") {
                      setCategoryFilter(ACTION_METADATA[nextValue].category);
                    }
                  }}
                  value={actionFilter}
                >
                  {ACTION_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </>
      )}

      {filteredActivities.length === 0 ? (
        <p className={`p-5 text-slate-600 ${card}`}>
          No administrative actions match the current filters.
        </p>
      ) : (
        <ul aria-label="Administrative activity log" className={`divide-y divide-slate-200 ${card}`}>
          {filteredActivities.map((activity) => {
            const meta = ACTION_METADATA[activity.tipo_acao] ?? {
              label: activity.tipo_acao,
              category: "books" as const,
              badgeClassName: "border border-slate-300 bg-slate-100 text-slate-700",
              dotClassName: "bg-slate-500",
            };

            return (
              <li
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5"
                key={activity.id_log}
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${meta.badgeClassName}`}
                    >
                      <span
                        aria-hidden="true"
                        className={`h-1.5 w-1.5 rounded-full ${meta.dotClassName}`}
                      />
                      {meta.label}
                    </span>

                    <span className="rounded-full border border-black/10 bg-white/80 px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-black/65">
                      Log #{activity.id_log}
                    </span>

                    <span className="font-mono text-[11px] text-slate-500">
                      ({activity.tipo_acao})
                    </span>
                  </div>

                  <p className="text-sm font-medium text-slate-900">{activity.descricao}</p>

                  {renderTargetSummary(activity)}
                </div>

                <div className="flex shrink-0 flex-row flex-wrap items-center justify-between gap-2 text-xs text-slate-500 sm:flex-col sm:items-end sm:text-right">
                  <div>
                    <span className="text-slate-400">By </span>
                    <Link
                      className="font-semibold text-[#1E2E4F] hover:underline"
                      href={`/admin/users/${activity.id_admin}`}
                    >
                      {activity.admin_username ?? `Admin #${activity.id_admin}`}
                    </Link>
                  </div>

                  <time
                    className="font-mono text-[11px] text-slate-500"
                    dateTime={activity.data_hora}
                  >
                    {formatActivityTimestamp(activity.data_hora)}
                  </time>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
