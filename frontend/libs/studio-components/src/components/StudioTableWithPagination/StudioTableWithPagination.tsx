import { Pagination } from '@digdir/design-system-react';
import React, { forwardRef, useEffect, useState } from 'react';
import classes from './StudioTableWithPagination.module.css';
import { StudioTable } from './StudioTable';
import { calcCurrentRows } from './utils';
import { useSortedRows } from '../../hooks/useSortedRows';
import { SelectRowsPerPage } from './SelectRowsPerPage';

type StudioTableWithPaginationProps = {
  columns: string[];
  rows: React.ReactNode[][];
  sortable?: boolean;
  size?: 'small' | 'medium' | 'large';
  initialRowsPerPage?: number;
};

export const StudioTableWithPagination = forwardRef<
  HTMLTableElement,
  StudioTableWithPaginationProps
>(({ columns, rows, sortable = true, size = 'medium', initialRowsPerPage = 5 }, ref) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);
  const { sortedRows, handleSorting } = useSortedRows(rows);

  const totalPages = Math.ceil(sortedRows.length / rowsPerPage);
  const currentRows = calcCurrentRows(currentPage, rowsPerPage, sortedRows);

  useEffect(() => {
    // If user is out of bounds, move them to page 1
    if (currentRows.length === 0) {
      setCurrentPage(1);
    }
  }, [currentRows, currentPage]);

  return (
    <>
      <StudioTable
        columns={columns}
        rows={currentRows}
        size={size}
        sortable={sortable}
        handleSorting={handleSorting}
      />
      {initialRowsPerPage > 0 && (
        <div className={classes.paginationContainer}>
          <SelectRowsPerPage setRowPerPage={setRowsPerPage} size={size} />
          {totalPages > 1 && (
            <Pagination
              className={classes.pagination}
              size={size}
              currentPage={currentPage}
              totalPages={totalPages}
              onChange={setCurrentPage}
              nextLabel='Neste'
              previousLabel='Forrige'
              itemLabel={(num) => `Side ${num}`}
              hideLabels
              compact
            />
          )}
        </div>
      )}
    </>
  );
});
