import { useState } from 'react';
import { Rows } from '../components/StudioTableWithPagination/StudioTableWithPagination';

export const useSortedRows = (rows: Rows) => {
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  const toggleSortDirection = () => {
    setSortDirection((prevDirection) => (prevDirection === 'asc' ? 'desc' : 'asc'));
  };

  const handleSorting = (columnKey) => {
    if (sortColumn === columnKey) {
      toggleSortDirection();
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  let sortedRows;
  if (sortColumn !== null) {
    sortedRows = [...rows].sort((a, b) => {
      const columnA = a[sortColumn];
      const columnB = b[sortColumn];
      if (columnA < columnB) return sortDirection === 'asc' ? -1 : 1;
      if (columnA > columnB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  } else {
    sortedRows = rows;
  }

  return {
    sortedRows,
    handleSorting,
  };
};
