import { useState } from 'react';

export const usePagination = (length: number) => {
  const [currentPage, setCurrentPage] = useState<number>(0);
  const hasPreviousPage: boolean = currentPage > 0;
  const hasNextPage: boolean = currentPage < length - 1;

  const goNext = () => {
    if (hasNextPage) {
      setCurrentPage((current: number) => current + 1);
    }
  };

  const goPrevious = () => {
    if (hasPreviousPage) {
      setCurrentPage((current: number) => current - 1);
    }
  };

  return { currentPage, goNext, goPrevious, hasPreviousPage, hasNextPage };
};
