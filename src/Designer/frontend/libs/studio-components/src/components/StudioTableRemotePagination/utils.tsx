import type { Rows } from './StudioTableRemotePagination';

export const getRowsToRender = (currentPage: number, pageSize: number, rows: Rows): Rows => {
  if (!pageSize) return rows;

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  return rows.slice(startIndex, endIndex);
};
