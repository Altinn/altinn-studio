import classes from './StudioTableWithPagination.module.css';
import { Table } from '@digdir/design-system-react';
import React, { forwardRef } from 'react';
import { TableSize } from './StudioTableWithPagination';

type StudioTableProps = {
  size: TableSize;
  columns: Record<'key' | 'value', string>[];
  rows: Record<string, React.ReactNode>[];
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
          {columns.map(({ key, value }) => (
            <Table.HeaderCell
              key={key}
              sortable={isSortable && columnHasValue(value)}
              onSortClick={() => handleSorting(key)}
            >
              {value}
            </Table.HeaderCell>
          ))}
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {rows.map((row) => (
          <Table.Row key={String(row.id)}>
            {columns.map(({ key }) => (
              <Table.Cell key={key}>{row[key]}</Table.Cell>
            ))}
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
});
