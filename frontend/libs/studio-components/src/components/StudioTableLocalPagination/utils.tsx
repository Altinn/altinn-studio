import { Rows } from './StudioTableLocalPagination';

export const getRowsToRender = (currentPage: number, rowsPerPage: number, rows: Rows): Rows => {
  if (rowsPerPage === 0) return rows;

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  return rows.slice(startIndex, endIndex);
};
