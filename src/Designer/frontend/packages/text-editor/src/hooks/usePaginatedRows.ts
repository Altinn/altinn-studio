import { useState } from 'react';

export type PaginatedRows<T> = {
  currentPage: number;
  pageCount: number;
  rowsOnPage: T[];
  goToPage: (page: number) => void;
};

export const usePaginatedRows = <T>(
  rows: T[],
  pageSize: number,
  resetKey: unknown,
): PaginatedRows<T> => {
  const [selectedPage, setSelectedPage] = useState<number>(1);
  const [previousResetKey, setPreviousResetKey] = useState<unknown>(resetKey);

  if (previousResetKey !== resetKey) {
    setPreviousResetKey(resetKey);
    setSelectedPage(1);
  }

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(selectedPage, pageCount);

  return {
    currentPage,
    pageCount,
    rowsOnPage: rows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    goToPage: setSelectedPage,
  };
};
