import React, { forwardRef, useEffect, useState } from 'react';
import { StudioTableRemotePagination } from '../StudioTableRemotePagination';
import type { Rows } from '../StudioTableRemotePagination';
import { useTableSorting } from '../../hooks/useTableSorting';
import { getRowsToRender } from '../StudioTableRemotePagination/utils';

export type StudioTableLocalPaginationProps = {
  columns: Record<'accessor' | 'value', string>[];
  rows: Rows;
  size?: 'small' | 'medium' | 'large';
  emptyTableMessage?: string;
  isSortable?: boolean;
  pagination?: {
    pageSizeOptions: number[];
    pageSizeLabel: string;
    nextButtonText: string;
    previousButtonText: string;
    itemLabel: (num: number) => string;
  };
};

export const StudioTableLocalPagination = forwardRef<
  HTMLTableElement,
  StudioTableLocalPaginationProps
>(
  (
    { columns, rows, isSortable = true, size = 'medium', emptyTableMessage, pagination },
    ref,
  ): React.ReactElement => {
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(pagination?.pageSizeOptions[0] ?? undefined);

    const { handleSorting, sortedRows } = useTableSorting(rows, { enable: isSortable });

    const initialRowsToRender = getRowsToRender(currentPage, pageSize, sortedRows || rows);
    const [rowsToRender, setRowsToRender] = useState<Rows>(initialRowsToRender);

    const handlePageSizeChange = (newPageSize: number) => {
      const newRowsToRender = getRowsToRender(currentPage, newPageSize, sortedRows || rows);

      // Move user back to page 1 if current page is removed
      if (!newRowsToRender.length) {
        setCurrentPage(1);
      }

      setPageSize(newPageSize);
      setRowsToRender(newRowsToRender);
    };

    const handlePageChange = (newPage: number) => {
      setCurrentPage(newPage);
      setRowsToRender(getRowsToRender(newPage, pageSize, sortedRows || rows));
    };

    const totalPages = Math.ceil(rows.length / pageSize);

    const studioTableRemotePaginationProps = pagination && {
      ...pagination,
      currentPage,
      totalPages,
      onPageChange: handlePageChange,
      onPageSizeChange: handlePageSizeChange,
    };

    return (
      <StudioTableRemotePagination
        columns={columns}
        rows={rowsToRender}
        size={size}
        emptyTableMessage={emptyTableMessage}
        onSortClick={isSortable && handleSorting}
        pagination={studioTableRemotePaginationProps}
        ref={ref}
      />
    );
  },
);

StudioTableLocalPagination.displayName = 'StudioTableLocalPagination';
