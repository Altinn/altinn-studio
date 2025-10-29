export type VisiblePage = number | undefined;

// Display a maximum of 5 page buttons including first and last page
export const getVisiblePages = (currentPage: number, totalPages: number): VisiblePage[] => {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: VisiblePage[] = [1];

  if (currentPage > 2) {
    pages.push(undefined);
  }

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (currentPage < totalPages - 1) {
    pages.push(undefined);
  }

  pages.push(totalPages);

  return pages;
};
