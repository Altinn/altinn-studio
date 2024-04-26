import { Pagination, Table } from '@digdir/design-system-react';
import React, { forwardRef, useState } from 'react';
import classes from './StudioTableWithPagination.module.css';
import { getRowsToRender } from './utils';
import { useSortedRows } from '../../hooks/useSortedRows';
import { SelectRowsPerPage } from './SelectRowsPerPage';

export type Rows = Record<string, React.ReactNode>[];

type PaginationTranslation = {
  nextButtonText: string;
  previousButtonText: string;
  itemLabel: (num: number) => string;
};

type StudioTableWithPaginationProps = {
  columns: Record<'accessor' | 'value', string>[];
  rows: Rows;
  isSortable?: boolean;
  size?: 'small' | 'medium' | 'large';
  pagination?: {
    initialRowsPerPage?: number;
    paginationTranslation: PaginationTranslation;
  };
};

export const StudioTableWithPagination = forwardRef<
  HTMLTableElement,
  StudioTableWithPaginationProps
>(({ columns, rows, isSortable = true, size = 'medium', pagination }, ref): React.ReactElement => {
  const { initialRowsPerPage = 5 } = pagination;
  const { nextButtonText, previousButtonText, itemLabel } = pagination.paginationTranslation;

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);
  const { sortedRows, handleSorting } = useSortedRows(rows);

  const totalPages = Math.ceil(sortedRows.length / rowsPerPage);
  const rowsToRender = getRowsToRender(currentPage, rowsPerPage, sortedRows);
  if (rowsToRender.length === 0) setCurrentPage(1);

  return (
    <>
      <Table size={size} className={classes.table} ref={ref}>
        <Table.Head>
          <Table.Row>
            {columns.map(({ accessor, value }) => (
              <Table.HeaderCell
                key={accessor}
                sortable={isSortable && !!value}
                onSortClick={() => handleSorting(accessor)}
              >
                {value}
              </Table.HeaderCell>
            ))}
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {rowsToRender.map((row) => (
            <Table.Row key={String(row.id)}>
              {columns.map(({ accessor }) => (
                <Table.Cell key={accessor}>{row[accessor]}</Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
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
              nextLabel={nextButtonText || 'Next'}
              previousLabel={previousButtonText || 'Previous'}
              itemLabel={itemLabel}
              hideLabels
              compact
            />
          )}
        </div>
      )}
    </>
  );
});
