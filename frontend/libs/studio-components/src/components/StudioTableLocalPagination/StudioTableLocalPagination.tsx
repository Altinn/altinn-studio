import React, { forwardRef, useState } from 'react';
import { StudioTableRemotePagination } from '../StudioTableRemotePagination';
import { Rows } from '../StudioTableRemotePagination/StudioTableRemotePagination';
import { useTableSorting } from '../../hooks/useTableSorting';
import { getRowsToRender } from './utils';

type StudioTableLocalPaginationProps = {
  columns: Record<'accessor' | 'value', string>[];
  rows: Rows;
  size?: 'small' | 'medium' | 'large';
  isSortable?: boolean;
  pagination?: {
    pageSizeOptions: number[];
    nextButtonText: string;
    previousButtonText: string;
    itemLabel: (num: number) => string;
  };
};

export const StudioTableLocalPagination = forwardRef<
  HTMLTableElement,
  StudioTableLocalPaginationProps
>(({ columns, rows, isSortable = true, size = 'medium', pagination }, ref): React.ReactElement => {
  const { pageSizeOptions, itemLabel, nextButtonText, previousButtonText } = pagination;

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(pageSizeOptions[0]);

  const { handleSorting, sortedRows } = useTableSorting(rows);

  const rowsToRender = getRowsToRender(currentPage, pageSize, sortedRows);
  const totalPages = Math.ceil(rows.length / pageSize);
  if (rowsToRender.length === 0) setCurrentPage(1);

  const paginationProps = {
    currentPage,
    totalPages,
    pageSizeOptions,
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
      onSortClick={handleSorting}
      pagination={paginationProps}
    />
  );
});
