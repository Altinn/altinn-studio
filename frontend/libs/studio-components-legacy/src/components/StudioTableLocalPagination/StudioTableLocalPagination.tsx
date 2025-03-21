import React, { forwardRef, useEffect, useState } from 'react';
import { StudioTableRemotePagination } from '../StudioTableRemotePagination';
import type { Columns, Rows, PaginationTexts } from '../StudioTableRemotePagination';
import { useTableSorting } from '../../hooks/useTableSorting';
import { getRowsToRender } from '../StudioTableRemotePagination/utils';

export type LocalPaginationProps = {
  pageSizeOptions: number[];
  paginationTexts: PaginationTexts;
};

export type StudioTableLocalPaginationProps = {
  columns: Columns;
  rows: Rows;
  size?: 'small' | 'medium' | 'large';
  isLoading?: boolean;
  loadingText?: string;
  emptyTableFallback?: React.ReactNode;
  pagination?: LocalPaginationProps;
};

export const StudioTableLocalPagination = forwardRef<
  HTMLTableElement,
  StudioTableLocalPaginationProps
>(
  (
    {
      columns,
      rows,
      size = 'medium',
      isLoading = false,
      loadingText,
      emptyTableFallback,
      pagination,
    },
    ref,
  ): React.ReactElement => {
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(pagination?.pageSizeOptions[0] ?? undefined);

    const isSortable = columns.some((column) => column.sortable);
    const { handleSorting, sortedRows } = useTableSorting(rows, { enable: isSortable });

    const initialRowsToRender = getRowsToRender(currentPage, pageSize, rows);
    const [rowsToRender, setRowsToRender] = useState<Rows>(initialRowsToRender);

    useEffect(() => {
      const newRowsToRender = getRowsToRender(currentPage, pageSize, sortedRows || rows);
      setRowsToRender(newRowsToRender);
    }, [sortedRows, rows, currentPage, pageSize]);

    const totalRows = rows.length;
    const totalPages = Math.ceil(totalRows / pageSize);

    const studioTableRemotePaginationProps = pagination && {
      ...pagination,
      pageSize,
      currentPage,
      totalPages,
      totalRows,
      onPageChange: setCurrentPage,
      onPageSizeChange: setPageSize,
    };

    return (
      <StudioTableRemotePagination
        columns={columns}
        rows={rowsToRender}
        size={size}
        isLoading={isLoading}
        loadingText={loadingText}
        emptyTableFallback={emptyTableFallback}
        onSortClick={handleSorting}
        pagination={studioTableRemotePaginationProps}
        ref={ref}
      />
    );
  },
);

StudioTableLocalPagination.displayName = 'StudioTableLocalPagination';
