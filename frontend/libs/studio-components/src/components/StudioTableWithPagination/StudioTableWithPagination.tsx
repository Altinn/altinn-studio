import { Pagination } from '@digdir/design-system-react';
import React, { forwardRef, useState } from 'react';
import classes from './StudioTableWithPagination.module.css';
import { StudioTable } from './StudioTable';
import { calcCurrentRows } from './utils';
import { useSortedRows } from '../../hooks/useSortedRows';
import { SelectRowsPerPage } from './SelectRowsPerPage';

export type TableSize = 'small' | 'medium' | 'large';
export type Rows = Record<string, React.ReactNode>[];
export type Columns = Record<'accessor' | 'value', string>[];

type StudioTableWithPaginationProps = {
  columns: Columns;
  rows: Rows;
  isSortable?: boolean;
  size?: TableSize;
  initialRowsPerPage?: number;
};

export const StudioTableWithPagination = forwardRef<
  HTMLTableElement,
  StudioTableWithPaginationProps
>(
  (
    { columns, rows, isSortable = true, size = 'medium', initialRowsPerPage = 5 },
    ref,
  ): React.ReactElement => {
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);
    const { sortedRows, handleSorting } = useSortedRows(rows);

    const totalPages = Math.ceil(sortedRows.length / rowsPerPage);
    const currentRows = calcCurrentRows(currentPage, rowsPerPage, sortedRows);
    if (currentRows.length === 0) setCurrentPage(1);

    return (
      <>
        <StudioTable
          columns={columns}
          rows={currentRows}
          size={size}
          isSortable={isSortable}
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
  },
);
