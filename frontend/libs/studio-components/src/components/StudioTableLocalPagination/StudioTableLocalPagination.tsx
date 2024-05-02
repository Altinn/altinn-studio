import React, { forwardRef, useState } from 'react';
import { StudioTableRemotePagination } from '../StudioTableRemotePagination';
import type { Rows } from '../StudioTableRemotePagination';
import { useTableSorting } from '../../hooks/useTableSorting';
import { getRowsToRender } from '../StudioTableRemotePagination/utils';

type StudioTableLocalPaginationProps = {
  columns: Record<'accessor' | 'value', string>[];
  rows: Rows;
  size?: 'small' | 'medium' | 'large';
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
>(({ columns, rows, isSortable = true, size = 'medium', pagination }, ref): React.ReactElement => {
  const { pageSizeOptions, pageSizeLabel, itemLabel, nextButtonText, previousButtonText } =
    pagination || {};
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(pagination ? pageSizeOptions[0] : undefined);

  const { handleSorting, sortedRows } = useTableSorting(rows);
  let rowsToRender: Rows;

  if (isSortable) {
    rowsToRender = getRowsToRender(currentPage, pageSize, sortedRows);
  } else {
    rowsToRender = getRowsToRender(currentPage, pageSize, rows);
  }

  if (rowsToRender.length === 0) setCurrentPage(1);
  const totalPages = Math.ceil(rows.length / pageSize);

  const paginationProps = pagination && {
    currentPage,
    totalPages,
    pageSizeOptions,
    pageSizeLabel,
    onPageChange: setCurrentPage,
    onPageSizeChange: setPageSize,
    itemLabel,
    nextButtonText,
    previousButtonText,
  };

  return (
    <StudioTableRemotePagination
      columns={columns}
      rows={rowsToRender}
      size={size}
      onSortClick={isSortable && handleSorting}
      pagination={paginationProps}
      ref={ref}
    />
  );
});

StudioTableLocalPagination.displayName = 'StudioTableLocalPagination';
