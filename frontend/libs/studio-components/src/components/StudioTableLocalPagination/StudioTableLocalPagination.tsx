import React, { forwardRef, useEffect, useState } from 'react';
import { StudioTableRemotePagination } from '../StudioTableRemotePagination';
import { Rows } from '../StudioTableRemotePagination/StudioTableRemotePagination';
import { useTableSorting } from '../../hooks/useTableSorting';
import { getRowsToRender } from '../StudioTableRemotePagination/utils';

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
  const { pageSizeOptions, itemLabel, nextButtonText, previousButtonText } = pagination || {};
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(pagination ? pageSizeOptions[0] : undefined);

  let handleSorting: (columnKey: string) => void;
  let sortedRows: Rows;
  let rowsToRender: Rows;

  if (isSortable) {
    ({ handleSorting, sortedRows } = useTableSorting(rows));
    rowsToRender = getRowsToRender(currentPage, pageSize, sortedRows);
  } else {
    handleSorting = undefined;
    rowsToRender = getRowsToRender(currentPage, pageSize, rows);
  }

  useEffect(() => {
    if (rowsToRender.length === 0) setCurrentPage(1);
  }, [rowsToRender]);

  const totalPages = Math.ceil(rows.length / pageSize);

  const paginationProps = pagination && {
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
      ref={ref}
    />
  );
});
