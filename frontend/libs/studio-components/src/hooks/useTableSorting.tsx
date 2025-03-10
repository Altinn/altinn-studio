import { useState, useEffect } from 'react';
import type { Rows } from '../components';
import { typedLocalStorage } from '@studio/pure-functions';

export type SortPreference = {
  column: string | null;
  direction: 'asc' | 'desc';
};

type TableSortingOptions = {
  enable: boolean;
  shouldPersistSort?: boolean;
  storageKey?: string;
};

export const useTableSorting = (rows: Rows, options: TableSortingOptions) => {
  const { enable, shouldPersistSort = false, storageKey = 'table-sort-preference' } = options;

  const getSavedPreference = (): SortPreference | null => {
    if (!shouldPersistSort) return null;
    return typedLocalStorage.getItem<SortPreference>(storageKey);
  };

  const savedPreference = getSavedPreference();
  const [sortColumn, setSortColumn] = useState<string | null>(savedPreference?.column ?? null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
    savedPreference?.direction ?? 'asc',
  );
  const [sortedRows, setSortedRows] = useState<Rows>(rows);

  const persistSortPreference = (column: string | null, direction: 'asc' | 'desc') => {
    if (!shouldPersistSort) return;
    typedLocalStorage.setItem(storageKey, { column, direction });
  };

  const toggleSortDirection = () => {
    setSortDirection((prevDirection) => {
      const newDirection = prevDirection === 'asc' ? 'desc' : 'asc';
      if (sortColumn !== null) {
        persistSortPreference(sortColumn, newDirection);
      }
      return newDirection;
    });
  };

  const handleSorting = (columnKey: string) => {
    if (sortColumn === columnKey) {
      toggleSortDirection();
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
      persistSortPreference(columnKey, 'asc');
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

  if (!enable) {
    return {
      sortedRows: undefined,
      handleSorting: undefined,
      sortDirection: undefined,
      sortColumn: undefined,
    };
  }

  return {
    sortedRows,
    handleSorting,
    sortDirection,
    sortColumn,
  };
};
