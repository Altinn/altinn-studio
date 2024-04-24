import { useState, useCallback } from 'react';

export const useSortedRows = (rows, initialSortColumn = null, initialSortDirection = 'asc') => {
  const [sortColumn, setSortColumn] = useState(initialSortColumn);
  const [sortDirection, setSortDirection] = useState(initialSortDirection);

  const handleSorting = useCallback(
    (columnIndex) => {
      if (sortColumn === columnIndex) {
        setSortDirection((prevDirection) => (prevDirection === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortColumn(columnIndex);
        setSortDirection('asc');
      }
    },
    [sortColumn],
  );

  const sortedRows = useCallback(
    () =>
      sortColumn !== null
        ? [...rows].sort((a, b) => {
            const columnA = a[sortColumn];
            const columnB = b[sortColumn];
            if (columnA < columnB) return sortDirection === 'asc' ? -1 : 1;
            if (columnA > columnB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
          })
        : rows,
    [rows, sortColumn, sortDirection],
  );

  return {
    sortedRows: sortedRows(),
    sortColumn,
    sortDirection,
    handleSorting,
  };
};
