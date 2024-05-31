import React, { forwardRef, useEffect, useState } from 'react';
import { StudioTableRemotePagination } from '../StudioTableRemotePagination';
import type { Rows } from '../StudioTableRemotePagination';
import { useTableSorting } from '../../hooks/useTableSorting';
import { getRowsToRender } from '../StudioTableRemotePagination/utils';

export type StudioTableLocalPaginationProps = {
  columns: Record<'accessor' | 'value', string>[];
  rows: Rows;
  size?: 'small' | 'medium' | 'large';
  emptyTableMessage?: React.ReactNode;
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

    const initialRowsToRender = getRowsToRender(currentPage, pageSize, rows);
    const [rowsToRender, setRowsToRender] = useState<Rows>(initialRowsToRender);

    useEffect(() => {
      const newRowsToRender = getRowsToRender(currentPage, pageSize, sortedRows || rows);

      const isOutOfRange = !newRowsToRender.length && currentPage > 1;
      if (isOutOfRange) {
        setCurrentPage(1);
        setRowsToRender(getRowsToRender(1, pageSize, sortedRows || rows));
        return;
      }

      setRowsToRender(newRowsToRender);
    }, [sortedRows, rows, currentPage, pageSize]);

    const totalPages = Math.ceil(rows.length / pageSize);

    const studioTableRemotePaginationProps = pagination && {
      ...pagination,
      pageSize,
      currentPage,
      totalPages,
      totalRows: rows.length,
      onPageChange: setCurrentPage,
      onPageSizeChange: setPageSize,
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
