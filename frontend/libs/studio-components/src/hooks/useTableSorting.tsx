import { useState, useEffect } from 'react';
import type { Rows } from '../components';

export const useTableSorting = (rows: Rows, config: Record<'enable', boolean>) => {
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
      const newSortedRows = [...rows].sort((a, b) => {
        const rowA = a[sortColumn];
        const rowB = b[sortColumn];
        if (rowA > rowB) return sortDirection === 'asc' ? 1 : -1;
        if (rowA < rowB) return sortDirection === 'asc' ? -1 : 1;
        return 0;
      });
      setSortedRows(newSortedRows);
    } else {
      setSortedRows(rows);
    }
  }, [sortColumn, sortDirection, rows]);

  if (!config.enable) {
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
