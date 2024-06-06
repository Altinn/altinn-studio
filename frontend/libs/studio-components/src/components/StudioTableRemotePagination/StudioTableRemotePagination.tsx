import { Label, NativeSelect, Pagination, Paragraph, Table } from '@digdir/design-system-react';
import React, { forwardRef, ReactNode, useEffect, useId } from 'react';
import classes from './StudioTableRemotePagination.module.css';

export type Columns = {
  accessor: string;
  heading: ReactNode;
  sortable?: boolean;
  headerCellClass?: string;
  bodyCellsClass?: string;
  valueFormatter?: (value: ReactNode) => ReactNode;
}[];

export type Rows = (Record<string, ReactNode> & Record<'id', string | number>)[];

export type PaginationTexts = {
  pageSizeLabel: string;
  showingRowText: string;
  ofText: string;
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
  onSortClick?: (columnKey: string) => void;
  pagination?: RemotePaginationProps;
};

export const StudioTableRemotePagination = forwardRef<
  HTMLTableElement,
  StudioTableRemotePaginationProps
>(
  (
    { columns, rows, size = 'medium', emptyTableFallback, onSortClick, pagination },
    ref,
  ): React.ReactElement => {
    const selectId = useId();

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
      showingRowText,
      ofText,
      nextButtonAriaLabel,
      previousButtonAriaLabel,
      numberButtonAriaLabel,
    } = paginationTexts || {};

    const isTableEmpty = rows.length === 0;
    const isSortingActive = !isTableEmpty && onSortClick;
    const isPaginationActive = pagination && totalRows > Math.min(...pageSizeOptions);

    const firstRowIndex = (currentPage - 1) * pageSize + 1;
    const lastRowIndex = Math.min(currentPage * pageSize, totalRows);

    useEffect(() => {
      const isOutOfRange = totalRows > 0 && isTableEmpty;
      if (isOutOfRange) {
        handlePageChange(1);
        return;
      }
    }, [totalRows, rows, handlePageChange]);

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
          <Table.Body>
            {rows.map((row) => (
              <Table.Row key={String(row.id)}>
                {columns.map(({ accessor, bodyCellsClass, valueFormatter }) => (
                  <Table.Cell key={accessor} className={bodyCellsClass}>
                    {valueFormatter ? valueFormatter(row[accessor]) : row[accessor]}
                  </Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
        {isTableEmpty && (
          <div className={classes.emptyTableFallbackContainer}>{emptyTableFallback}</div>
        )}
        {isPaginationActive && (
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
                {showingRowText} {firstRowIndex}-{lastRowIndex} {ofText} {totalRows}
              </Paragraph>
            </div>
            {totalPages > 1 && (
              <Pagination
                size={size}
                currentPage={currentPage}
                totalPages={totalPages}
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
