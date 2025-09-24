import React, { forwardRef, useEffect, useId, useRef } from 'react';
import { StudioPagination } from './StudioPagination/StudioPagination';
import { useRetainWhileLoading } from '../../../../studio-hooks/src/hooks/useRetainWhileLoading';
import type { ReactNode } from 'react';
import classes from './StudioTableRemotePagination.module.css';
import {
  StudioTable,
  StudioSpinner,
  StudioParagraph,
  StudioSelect,
  StudioLabel,
} from '@studio/components';

export type Columns = {
  accessor: string;
  heading: ReactNode;
  sortable?: boolean;
  headerCellClass?: string;
  bodyCellClass?: string;
  bodyCellFormatter?: (value: ReactNode) => ReactNode;
}[];

export type Rows = (Record<string, ReactNode> & Record<'id', string | number>)[];

export type PaginationTexts = {
  pageSizeLabel: string;
  totalRowsText: string;
  nextButtonAriaLabel: string;
  previousButtonAriaLabel: string;
  numberButtonAriaLabel: (num: number) => string;
};

export type RemotePaginationProps = {
  currentPage: number;
  totalPages: number;
  totalRows: number;
  pageSize: number;
  pageSizeOptions: number[];
  onPageChange: (currentPage: number) => void;
  onPageSizeChange: (currentSize: number) => void;
  paginationTexts: PaginationTexts;
};

export type StudioTableRemotePaginationProps = {
  columns: Columns;
  rows: Rows;
  emptyTableFallback?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  loadingText?: string;
  onSortClick?: (columnKey: string) => void;
  pagination?: RemotePaginationProps;
};

export const StudioTableRemotePagination = forwardRef<
  HTMLTableElement,
  StudioTableRemotePaginationProps
>(
  (
    {
      columns,
      rows,
      size = 'md',
      isLoading = false,
      loadingText,
      emptyTableFallback,
      onSortClick,
      pagination,
    },
    ref,
  ): React.ReactElement => {
    const selectId = useId();
    const tableBodyRef = useRef<HTMLTableSectionElement>(null);
    const [spinnerHeight, setSpinnerHeight] = React.useState('75px');

    const {
      currentPage,
      totalPages,
      totalRows,
      pageSize,
      pageSizeOptions,
      onPageChange: handlePageChange,
      onPageSizeChange: handlePageSizeChange,
      paginationTexts,
    } = pagination || {};

    const {
      pageSizeLabel,
      totalRowsText,
      nextButtonAriaLabel,
      previousButtonAriaLabel,
      numberButtonAriaLabel,
    } = paginationTexts || {};

    const isTableEmpty = rows.length === 0 && !isLoading;
    const isSortingActive = !isTableEmpty && onSortClick;
    const isPaginationActive = pagination && totalRows > Math.min(...pageSizeOptions);

    const retainedIsPaginationActive = useRetainWhileLoading(isLoading, isPaginationActive);
    const retainedTotalPages = useRetainWhileLoading(isLoading, totalPages);
    const retainedTotalRows = useRetainWhileLoading(isLoading, totalRows);

    useEffect(() => {
      const tableRefCurrent = tableBodyRef.current;
      if (rows.length > 0 && tableRefCurrent) {
        setSpinnerHeight(tableRefCurrent.clientHeight + 'px');
      }
    }, [rows.length]);

    useEffect(() => {
      const isOutOfRange = totalRows > 0 && isTableEmpty;
      if (isOutOfRange) {
        handlePageChange(1);
        return;
      }
    }, [totalRows, isTableEmpty, handlePageChange]);

    return (
      <div className={classes.componentContainer}>
        <StudioTable data-size={size} className={classes.table} ref={ref}>
          <StudioTable.Head>
            <StudioTable.Row>
              {columns.map(({ accessor, heading, sortable, headerCellClass }) => (
                <StudioTable.HeaderCell
                  key={accessor}
                  sort={isSortingActive && sortable ? 'none' : undefined}
                  onClick={sortable && onSortClick ? (): void => onSortClick(accessor) : undefined}
                  className={headerCellClass}
                >
                  {heading}
                </StudioTable.HeaderCell>
              ))}
            </StudioTable.Row>
          </StudioTable.Head>
          <StudioTable.Body ref={tableBodyRef}>
            {rows.map((row) => (
              <StudioTable.Row key={String(row.id)}>
                {columns.map(({ accessor, bodyCellClass, bodyCellFormatter }) => (
                  <StudioTable.Cell key={accessor} className={bodyCellClass}>
                    {bodyCellFormatter ? bodyCellFormatter(row[accessor]) : row[accessor]}
                  </StudioTable.Cell>
                ))}
              </StudioTable.Row>
            ))}
          </StudioTable.Body>
        </StudioTable>
        {isTableEmpty && (
          <div className={classes.emptyTableFallbackContainer}>{emptyTableFallback}</div>
        )}
        {isLoading && (
          <StudioSpinner style={{ height: spinnerHeight }} aria-label={loadingText ?? 'Loading'} />
        )}
        {retainedIsPaginationActive && (
          <div className={classes.paginationContainer}>
            <div className={classes.selectContainer}>
              <StudioLabel htmlFor={selectId} data-size={size} className={classes.selectLabel}>
                {pageSizeLabel}
              </StudioLabel>
              <StudioSelect
                label=''
                id={selectId}
                data-size={size}
                value={pageSize}
                className={classes.select}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              >
                {pageSizeOptions.map((pageSizeOption) => (
                  <option key={pageSizeOption} value={pageSizeOption}>
                    {pageSizeOption}
                  </option>
                ))}
              </StudioSelect>
              <StudioParagraph data-size={size} className={classes.rowCounter}>
                {totalRowsText} {retainedTotalRows}
              </StudioParagraph>
            </div>
            {retainedTotalPages > 1 && (
              <StudioPagination
                currentPage={currentPage}
                totalPages={retainedTotalPages}
                previousButtonAriaLabel={previousButtonAriaLabel}
                nextButtonAriaLabel={nextButtonAriaLabel}
                numberButtonAriaLabel={numberButtonAriaLabel}
                onChange={handlePageChange}
              />
            )}
          </div>
        )}
      </div>
    );
  },
);

StudioTableRemotePagination.displayName = 'StudioTableRemotePagination';
