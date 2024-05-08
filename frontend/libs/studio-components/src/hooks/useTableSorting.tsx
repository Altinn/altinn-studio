import { useState, useEffect } from 'react';
import type { Rows } from '../components';

export const useTableSorting = (rows: Rows, config) => {
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [sortedRows, setSortedRows] = useState<Rows>(rows);

  if (!config.enable) {
    return {
      sortedRows: undefined,
      handleSorting: undefined,
    };
  }

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
        const columnA = a[sortColumn];
        const columnB = b[sortColumn];
        if (columnA < columnB) return sortDirection === 'asc' ? -1 : 1;
        if (columnA > columnB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
      setSortedRows(newSortedRows);
    } else {
      setSortedRows(rows);
    }
  }, [sortColumn, sortDirection, rows]);

  return {
    sortedRows,
    handleSorting,
  };
};
