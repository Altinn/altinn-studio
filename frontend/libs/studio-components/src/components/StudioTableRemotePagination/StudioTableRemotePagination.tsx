import { Label, NativeSelect, Pagination, Paragraph, Table } from '@digdir/design-system-react';
import React, { forwardRef, useId } from 'react';
import classes from './StudioTableRemotePagination.module.css';

type tableSize = 'small' | 'medium' | 'large';
type labelSize = 'xsmall' | 'small' | 'medium';
export const resizeLabelMap: Record<tableSize, labelSize> = {
  small: 'xsmall',
  medium: 'small',
  large: 'medium',
};

export type Columns = {
  accessor: string;
  value: string;
  sortable?: boolean;
  headerCellClass?: string;
  bodyCellsClass?: string;
}[];

export type Rows = (Record<string, React.ReactNode> & Record<'id', string | number>)[];

export type PaginationProps = {
  currentPage: number;
  totalPages: number;
  totalRows: number;
  pageSize: number;
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
  emptyTableMessage?: React.ReactNode;
  onSortClick?: (columnKey: string) => void;
  pagination?: PaginationProps;
};

export const StudioTableRemotePagination = forwardRef<
  HTMLTableElement,
  StudioTableRemotePaginationProps
>(
  (
    { columns, rows, size = 'medium', emptyTableMessage, onSortClick, pagination },
    ref,
  ): React.ReactElement => {
    const {
      currentPage,
      totalPages,
      totalRows,
      pageSize,
      pageSizeOptions,
      pageSizeLabel,
      onPageChange: handlePageChange,
      onPageSizeChange: handlePageSizeChange,
      nextButtonText,
      previousButtonText,
      itemLabel,
    } = pagination || {};

    const isTableSortable = onSortClick && rows.length > 0;
    const isPaginationActive = pagination && rows.length > 0;

    const labelId = useId();
    // const labelSize = resizeLabelMap[size];

    return (
      <div className={classes.componentContainer}>
        <Table size={size} className={classes.table} ref={ref}>
          <Table.Head>
            <Table.Row>
              {columns.map(({ accessor, value, sortable, headerCellClass }) => (
                <Table.HeaderCell
                  key={accessor}
                  sortable={isTableSortable && sortable}
                  onSortClick={() => onSortClick(accessor)}
                  className={headerCellClass}
                >
                  {value}
                </Table.HeaderCell>
              ))}
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {rows.map((row) => (
              <Table.Row key={String(row.id)}>
                {columns.map(({ accessor, bodyCellsClass }) => (
                  <Table.Cell key={accessor} className={bodyCellsClass}>
                    {row[accessor]}
                  </Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
        {!rows.length && (
          <Paragraph className={classes.emptyTableMessage} size={size}>
            {emptyTableMessage}
          </Paragraph>
        )}
        {isPaginationActive && (
          <div className={classes.paginationContainer}>
            <div className={classes.selectContainer}>
              <Label htmlFor={labelId} size={size} className={classes.selectLabel}>
                {pageSizeLabel}
              </Label>
              <NativeSelect
                id={labelId}
                size={size}
                className={classes.select}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              >
                {pageSizeOptions.map((pageSizeOption) => (
                  <option
                    key={pageSizeOption}
                    value={pageSizeOption}
                    selected={pageSize === pageSizeOption}
                  >
                    {pageSizeOption}
                  </option>
                ))}
              </NativeSelect>
              <Paragraph size={size} className={classes.pageInfo}>
                Viser rad 1-5 av {totalRows}
              </Paragraph>
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
      </div>
    );
  },
);

StudioTableRemotePagination.displayName = 'StudioTableRemotePagination';
