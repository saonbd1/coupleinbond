// Shared pagination helpers for the blog and poll listings.
//
// The site is a static Astro build with `build.format: 'file'`, so pagination
// has to work in two different ways:
//
// - The blog index is fully server-rendered, so it paginates with real static
//   pages: page 1 stays at /blog.html (the existing, already-indexed URL) and
//   later pages live at /blog/page/2.html, /blog/page/3.html, and so on.
// - The polls index renders its cards client-side (public/polls.js) so that the
//   voting state in localStorage keeps working, so it paginates in the browser.
//
// Both use the same page size so the two listings feel like one system.
//
// DEFAULT_PAGE_SIZE is what the static blog pages are built with.
// ALLOWED_PAGE_SIZES is the set the polls listing offers in its "per page"
// selector (the polls list is rendered client-side, so it can switch size
// without a rebuild; the blog pages are static and stay at the default).
export const DEFAULT_PAGE_SIZE = 6;
export const ALLOWED_PAGE_SIZES = [6, 8, 10];
export const PAGE_SIZE = DEFAULT_PAGE_SIZE;

// How many page links to show around the current page. 1 keeps it simple:
// first page, current page, last page.
export const PAGE_LINK_WINDOW = 1;

export function pageCount(total: number, size: number = PAGE_SIZE): number {
  if (size <= 0) return 1;
  return Math.max(1, Math.ceil(total / size));
}

export function pageSlice<T>(items: T[], page: number, size: number = PAGE_SIZE): T[] {
  const start = Math.max(0, (page - 1) * size);
  return items.slice(start, start + size);
}

export interface PageLink {
  label: string;
  href: string;
  current: boolean;
  ariaLabel?: string;
}

// URL scheme for the static blog listing:
//
//   default size (6): /blog.html, /blog/page/2.html, /blog/page/3.html, ...
//   other sizes:       /blog/size/8.html, /blog/size/8/page/2.html, ...
//
// The default size keeps the historical /blog.html URL and the simple
// /blog/page/N.html shape, so the already-indexed links keep working.
export function blogPageHref(page: number, size: number = DEFAULT_PAGE_SIZE, root = ''): string {
  if (size === DEFAULT_PAGE_SIZE) {
    return page === 1 ? `${root}blog.html` : `${root}blog/page/${page}.html`;
  }
  return page === 1 ? `${root}blog/size/${size}.html` : `${root}blog/size/${size}/page/${page}.html`;
}

// Builds the ordered list of page links for a paginated listing.
// `hrefFor(page)` maps a 1-based page number to its URL.
export function buildPageLinks(
  totalPages: number,
  currentPage: number,
  hrefFor: (page: number) => string,
): PageLink[] {
  const links: PageLink[] = [];
  for (let page = 1; page <= totalPages; page += 1) {
    const isEdge = page === 1 || page === totalPages;
    const isNear = Math.abs(page - currentPage) <= PAGE_LINK_WINDOW;
    if (!isEdge && !isNear) continue;
    links.push({
      label: String(page),
      href: hrefFor(page),
      current: page === currentPage,
      ariaLabel: page === currentPage ? `Page ${page}, current page` : `Go to page ${page}`,
    });
  }
  return links;
}
