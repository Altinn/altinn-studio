import { useState, useEffect } from 'react';
import type { Rows } from '../components';

export const useTableSorting = (rows: Rows, options: Record<'enable', boolean>) => {
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [sortedRows, setSortedRows] = useState<Rows>(rows);

  const toggleSortDirection = () => {
    setSortDirection((prevDirection) => (prevDirection === 'asc' ? 'desc' : 'asc'));
  };

  const handleSorting = (columnKey: string) => {
    if (sortColumn === columnKey) {
      toggleSortDirection();
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  useEffect(() => {
    if (sortColumn !== null) {
      const newSortedRows = [...rows].sort((rowA, rowB) => {
        let cellA = rowA[sortColumn];
        let cellB = rowB[sortColumn];

        if (typeof cellA === 'string' && typeof cellB === 'string') {
          cellA = cellA.toLowerCase();
          cellB = cellB.toLowerCase();
        }

        if (cellA > cellB) return sortDirection === 'asc' ? 1 : -1;
        if (cellA < cellB) return sortDirection === 'asc' ? -1 : 1;
        return 0;
      });
      setSortedRows(newSortedRows);
    } else {
      setSortedRows(rows);
    }
  }, [sortColumn, sortDirection, rows]);

  if (!options.enable) {
    return {
      sortedRows: undefined,
      handleSorting: undefined,
    };
  }

  return {
    sortedRows,
    handleSorting,
  };
};
