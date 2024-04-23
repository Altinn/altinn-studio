import { Pagination, Table } from '@digdir/design-system-react';
import React, { forwardRef, useEffect, useState } from 'react';
import classes from './StudioTableWithPagination.module.css';

type StudioTableWithPaginationProps = {
  columns: string[];
  rows: React.ReactNode[][];
  size: 'small' | 'medium' | 'large';
  rowsPerPage: number;
};

export const StudioTableWithPagination = forwardRef<
  HTMLTableElement,
  StudioTableWithPaginationProps
>(({ columns, rows, size = 'medium', rowsPerPage = 3 }, ref) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [currentRows, setCurrentRows] = useState(rows);

  let totalPages = 0;
  if (rowsPerPage > 0) {
    totalPages = Math.ceil(rows.length / rowsPerPage);
  }

  useEffect(() => {
    if (rowsPerPage > 0) {
      const startIndex = (currentPage - 1) * rowsPerPage;
      const endIndex = startIndex + rowsPerPage;
      setCurrentRows(rows.slice(startIndex, endIndex));
    }
  }, [currentPage, rowsPerPage, rows]);

  return (
    <div className={classes.component}>
      <Table size={size} className={classes.table}>
        <Table.Head>
          <Table.Row>
            {columns.map((cell, i) => (
              <Table.HeaderCell key={i}>{cell}</Table.HeaderCell>
            ))}
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {currentRows.map((row, i) => (
            <Table.Row key={i}>
              {row.map((cell, i) => (
                <Table.Cell key={i}>{cell}</Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
      {rowsPerPage > 0 && (
        <Pagination
          className={classes.pagination}
          size={size}
          currentPage={currentPage}
          totalPages={totalPages}
          onChange={setCurrentPage}
          nextLabel='Neste'
          previousLabel='Forrige'
          itemLabel={(num) => `Side ${num}`}
        />
      )}
    </div>
  );
});
