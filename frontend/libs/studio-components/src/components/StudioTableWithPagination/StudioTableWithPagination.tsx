import { Pagination } from '@digdir/design-system-react';
import React, { forwardRef, useEffect, useState } from 'react';
import classes from './StudioTableWithPagination.module.css';
import { StudioTable } from '../StudioTable';
import { calcCurrentRows } from './utils';
import { useSortedRows } from '../../hooks/useSortedRows';
import { SelectRowsPerPage } from './SelectRowsPerPage';

type StudioTableWithPaginationProps = {
  columns: string[];
  rows: React.ReactNode[][];
  size: 'small' | 'medium' | 'large';
  initialRowPerPage: number;
  width?: string;
};

export const StudioTableWithPagination = forwardRef<
  HTMLTableElement,
  StudioTableWithPaginationProps
>(({ columns, rows, size = 'medium', initialRowPerPage = 5, width }, ref) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowPerPage, setRowPerPage] = useState(initialRowPerPage);
  const { sortedRows, handleSorting } = useSortedRows(rows);

  const totalPages = Math.ceil(sortedRows.length / rowPerPage);
  const currentRows = calcCurrentRows(currentPage, rowPerPage, sortedRows);

  useEffect(() => {
    if (currentRows.length === 0 && currentPage > 1) {
      setCurrentPage(1);
    }
  }, [currentRows, currentPage]);

  return (
    <>
      <StudioTable
        columns={columns}
        rows={currentRows}
        size={size}
        width={width}
        handleSorting={handleSorting}
      />
      {initialRowPerPage > 0 && (
        <div className={classes.paginationContainer}>
          <SelectRowsPerPage setRowPerPage={setRowPerPage} size={size} />
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
