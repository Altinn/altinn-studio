import { NativeSelect, Pagination } from '@digdir/design-system-react';
import React, { forwardRef, useEffect, useState } from 'react';
import classes from './StudioTableWithPagination.module.css';
import { StudioTable } from '../StudioTable';

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
>(({ columns, rows, size = 'medium', initialRowPerPage = 0, width }, ref) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [currentRows, setCurrentRows] = useState(rows);
  const [rowPerPage, setRowPerPage] = useState(initialRowPerPage);
  const [totalPages, setTotalPages] = useState(null);

  useEffect(() => {
    if (rowPerPage > 0) {
      const startIndex = (currentPage - 1) * rowPerPage;
      const endIndex = startIndex + rowPerPage;
      setCurrentRows(rows.slice(startIndex, endIndex));
      setTotalPages(Math.ceil(rows.length / rowPerPage));
      console.log(Math.round(rows.length / rowPerPage));
    }
  }, [currentPage, rowPerPage, rows]);

  useEffect(() => {
    if (currentRows.length === 0) setCurrentPage(1);
  }, [currentRows]);

  const handleRowPerPage = (e) => {
    if (e.target.value === 'initialValue') {
      setRowPerPage(initialRowPerPage);
    } else {
      setRowPerPage(Number(e.target.value));
    }
  };

  return (
    <>
      <StudioTable columns={columns} rows={currentRows} size={size} width={width} />
      <div className={classes.paginationContainer}>
        {initialRowPerPage > 0 && (
          <NativeSelect onChange={handleRowPerPage} size={size}>
            <option value='initialValue'>Rows per page</option>
            <option value='5'>5</option>
            <option value='10'>10</option>
            <option value='20'>20</option>
            <option value='50'>50</option>
            <option value='100'>100</option>
          </NativeSelect>
        )}
        {totalPages > 1 && (
          <Pagination
            size={size}
            currentPage={currentPage}
            totalPages={totalPages}
            onChange={setCurrentPage}
            nextLabel='Neste'
            previousLabel='Forrige'
            itemLabel={(num) => `Side ${num}`}
            hideLabels
          />
        )}
      </div>
    </>
  );
});
