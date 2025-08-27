import React, { forwardRef, useEffect, useState } from 'react';
import { StudioTableRemotePagination } from '../StudioTableRemotePagination';
import type { Columns, Rows, PaginationTexts } from '../StudioTableRemotePagination';
import { useTableSorting } from '../../hooks/useTableSorting';
import { getRowsToRender } from '../StudioTableRemotePagination/utils';
import type { TableSortStorageKey } from '../../types/TableSortStorageKey';

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
  shouldPersistSort?: boolean;
  sortStorageKey?: TableSortStorageKey;
  sortedRows?: Rows;
};

export const StudioTableLocalPagination = forwardRef<
  HTMLTableElement,
  StudioTableLocalPaginationProps
>(
  (
    {
      columns,
      rows,
      sortedRows: externalSortedRows,
      size = 'medium',
      isLoading = false,
      loadingText,
      emptyTableFallback,
      pagination,
      shouldPersistSort = false,
      sortStorageKey,
    },
    ref,
  ): React.ReactElement => {
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(pagination?.pageSizeOptions[0] ?? undefined);

    const { sortedRows: internalSortedRows, handleSorting } = useTableSorting(rows, {
      enable: true,
      shouldPersistSort,
      storageKey: sortStorageKey,
    });

    const sortedRows = externalSortedRows || internalSortedRows;
    const initialRowsToRender = getRowsToRender(currentPage, pageSize, sortedRows);
    const [rowsToRender, setRowsToRender] = useState<Rows>(initialRowsToRender);

    useEffect(() => {
      const newRowsToRender = getRowsToRender(currentPage, pageSize, sortedRows);
      setRowsToRender(newRowsToRender);
    }, [sortedRows, currentPage, pageSize]);

    const totalRows = sortedRows.length;
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
