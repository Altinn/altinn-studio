import { Label, NativeSelect, Pagination, Paragraph, Table } from '@digdir/designsystemet-react';
import React, { forwardRef, useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import classes from './StudioTableRemotePagination.module.css';
import { StudioSpinner } from '../StudioSpinner';
import { useRetainWhileLoading } from '../../hooks';

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
  size?: 'small' | 'medium' | 'large';
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
      size = 'medium',
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

    // Keep these values in memory when loading. Needed in order to show the pagination information below the spinner.
    const retainedIsPaginationActive = useRetainWhileLoading(isLoading, isPaginationActive);
    const retainedTotalPages = useRetainWhileLoading(isLoading, totalPages);
    const retainedTotalRows = useRetainWhileLoading(isLoading, totalRows);

    useEffect(() => {
      if (rows.length > 0) {
        setSpinnerHeight(tableBodyRef.current.clientHeight + 'px');
      }
    }, [tableBodyRef, rows.length]);

    useEffect(() => {
      const isOutOfRange = totalRows > 0 && isTableEmpty;
      if (isOutOfRange) {
        handlePageChange(1);
        return;
      }
    }, [totalRows, isTableEmpty, handlePageChange]);

    return (
      <div className={classes.componentContainer}>
        <Table size={size} className={classes.table} ref={ref}>
          <Table.Head>
            <Table.Row>
              {columns.map(({ accessor, heading, sortable, headerCellClass }) => (
                <Table.HeaderCell
                  key={accessor}
                  sortable={isSortingActive && sortable}
                  onSortClick={() => onSortClick(accessor)}
                  className={headerCellClass}
                >
                  {heading}
                </Table.HeaderCell>
              ))}
            </Table.Row>
          </Table.Head>
          <Table.Body ref={tableBodyRef}>
            {rows.map((row) => (
              <Table.Row key={String(row.id)}>
                {columns.map(({ accessor, bodyCellClass, bodyCellFormatter }) => (
                  <Table.Cell key={accessor} className={bodyCellClass}>
                    {bodyCellFormatter ? bodyCellFormatter(row[accessor]) : row[accessor]}
                  </Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
        {isTableEmpty && (
          <div className={classes.emptyTableFallbackContainer}>{emptyTableFallback}</div>
        )}
        {isLoading && (
          <StudioSpinner style={{ height: spinnerHeight }} spinnerTitle={loadingText} />
        )}
        {retainedIsPaginationActive && (
          <div className={classes.paginationContainer}>
            <div className={classes.selectContainer}>
              <Label htmlFor={selectId} size={size} className={classes.selectLabel}>
                {pageSizeLabel}
              </Label>
              <NativeSelect
                id={selectId}
                size={size}
                defaultValue={pageSize}
                className={classes.select}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              >
                {pageSizeOptions.map((pageSizeOption) => (
                  <option key={pageSizeOption} value={pageSizeOption}>
                    {pageSizeOption}
                  </option>
                ))}
              </NativeSelect>
              <Paragraph size={size} className={classes.rowCounter}>
                {totalRowsText} {retainedTotalRows}
              </Paragraph>
            </div>
            {retainedTotalPages > 1 && (
              <Pagination
                size={size}
                currentPage={currentPage}
                totalPages={retainedTotalPages}
                onChange={handlePageChange}
                nextLabel={nextButtonAriaLabel}
                previousLabel={previousButtonAriaLabel}
                itemLabel={numberButtonAriaLabel}
                hideLabels
                compact
              />
            )}
          </div>
        )}
      </div>
    );
  },
);

StudioTableRemotePagination.displayName = 'StudioTableRemotePagination';
