export type NavLink = {
  label: string;
  href: string;
};

export const SIGNED_NAV_LINKS: readonly NavLink[] = [
  { label: "For You", href: "/home" },
  { label: "Library", href: "/library" },
  { label: "Catalog", href: "/books" },
  { label: "Popular", href: "/books?sort=popularity" },
  { label: "Top Rated", href: "/books?sort=rating" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Profile", href: "/profile" },
];

export const GUEST_NAV_LINKS: readonly NavLink[] = [
  { label: "Catalog", href: "/books" },
  { label: "Popular", href: "/books?sort=popularity" },
  { label: "Top Rated", href: "/books?sort=rating" },
];
