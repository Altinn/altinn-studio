export type VisiblePage = number | undefined;

// Display first page, last page, and up to 3 pages around current page, with ellipsis indicators for gaps
export const getVisiblePages = (currentPage: number, totalPages: number): VisiblePage[] => {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: VisiblePage[] = [1];

  if (currentPage > 3) {
    pages.push(undefined);
  }

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (currentPage < totalPages - 2) {
    pages.push(undefined);
  }

  pages.push(totalPages);

  return pages;
};
