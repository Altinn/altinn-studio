import { Label, NativeSelect, Pagination, Table } from '@digdir/design-system-react';
import React, { forwardRef, useId } from 'react';
import classes from './StudioTableRemotePagination.module.css';

type LabelSize = 'small' | 'medium' | 'xsmall';
type LabelSizeKeys = 'small' | 'medium' | 'large';
export const labelSizeMap: Record<LabelSizeKeys, LabelSize> = {
  small: 'xsmall',
  medium: 'small',
  large: 'medium',
};

export type Columns = Record<'accessor' | 'value', string>[];

export type Rows = (Record<string, React.ReactNode> & Record<'id', string | number>)[];

export type PaginationProps = {
  currentPage: number;
  totalPages: number;
  pageSizeOptions: number[];
  pageSizeLabel: string;
  onPageChange: (currentPage: number) => void;
  onPageSizeChange: (currentSize: number) => void;
  nextButtonText: string;
  previousButtonText: string;
  itemLabel: (num: number) => string;
};

export type StudioTableRemotePaginationProps = {
  columns: Columns;
  rows: Rows;
  size?: 'small' | 'medium' | 'large';
  onSortClick?: (columnKey: string) => void;
  pagination?: PaginationProps;
};

export const StudioTableRemotePagination = forwardRef<
  HTMLTableElement,
  StudioTableRemotePaginationProps
>(({ columns, rows, size = 'medium', onSortClick, pagination }, ref): React.ReactElement => {
  const isSortable = !!onSortClick && !!rows.length;
  const isPaginationActive = !!pagination && !!rows.length;

  const {
    currentPage,
    totalPages,
    pageSizeOptions,
    pageSizeLabel,
    onPageChange: handlePageChange,
    onPageSizeChange: handlePageSizeChange,
    nextButtonText,
    previousButtonText,
    itemLabel,
  } = pagination || {};

  const labelId = useId();
  const labelSize = labelSizeMap[size];

  return (
    <>
      <Table size={size} className={classes.table} ref={ref}>
        <Table.Head>
          <Table.Row>
            {columns.map(({ accessor, value }) => (
              <Table.HeaderCell
                key={accessor}
                sortable={isSortable && !!value}
                onSortClick={() => onSortClick(accessor)}
              >
                {value}
              </Table.HeaderCell>
            ))}
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {rows.map((row) => (
            <Table.Row key={String(row.id)}>
              {columns.map(({ accessor }) => (
                <Table.Cell key={accessor}>{row[accessor]}</Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
      {isPaginationActive && (
        <div className={classes.paginationContainer}>
          <div className={classes.selectorContainer}>
            <NativeSelect
              id={labelId}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              size={size}
            >
              {pageSizeOptions.map((pageSizeOption) => (
                <option key={pageSizeOption} value={pageSizeOption}>
                  {pageSizeOption}
                </option>
              ))}
            </NativeSelect>
            <Label htmlFor={labelId} size={labelSize} className={classes.label}>
              {pageSizeLabel}
            </Label>
          </div>
          {totalPages > 1 && (
            <Pagination
              size={size}
              currentPage={currentPage}
              totalPages={totalPages}
              onChange={handlePageChange}
              nextLabel={nextButtonText}
              previousLabel={previousButtonText}
              itemLabel={itemLabel}
              hideLabels
              compact
            />
          )}
        </div>
      )}
    </>
  );
});

StudioTableRemotePagination.displayName = 'StudioTableRemotePagination';
