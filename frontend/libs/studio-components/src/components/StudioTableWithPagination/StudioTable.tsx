import classes from './StudioTableWithPagination.module.css';
import { Table } from '@digdir/design-system-react';
import React, { forwardRef } from 'react';
import { Columns, Rows, TableSize } from './StudioTableWithPagination';

type StudioTableProps = {
  size: TableSize;
  columns: Columns;
  rows: Rows;
  isSortable: boolean;
  handleSorting?: (columnKey: string) => void;
};

export const StudioTable: React.FC<StudioTableProps> = forwardRef<
  HTMLTableElement,
  StudioTableProps
>(({ size, columns, rows, isSortable, handleSorting }, ref) => {
  const columnHasValue = (value) => {
    return Boolean(value);
  };

  return (
    <Table size={size} className={classes.table} ref={ref}>
      <Table.Head>
        <Table.Row>
          {columns.map(({ accessor, value }) => (
            <Table.HeaderCell
              key={accessor}
              sortable={isSortable && columnHasValue(value)}
              onSortClick={() => handleSorting(accessor)}
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
  );
});
