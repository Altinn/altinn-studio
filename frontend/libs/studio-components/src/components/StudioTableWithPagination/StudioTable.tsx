import classes from './StudioTableWithPagination.module.css';
import { Table } from '@digdir/design-system-react';
import React, { forwardRef } from 'react';
import { TableSize } from './StudioTableWithPagination';

type StudioTableProps = {
  size: TableSize;
  columns: string[];
  rows: Record<string, React.ReactNode>[];
  sortable: boolean;
  handleSorting?: (columnIndex: number) => void;
};

export const StudioTable: React.FC<StudioTableProps> = forwardRef<
  HTMLTableElement,
  StudioTableProps
>(({ size, columns, rows, sortable, handleSorting }, ref) => {
  return (
    <Table size={size} className={classes.table} ref={ref}>
      <Table.Head>
        <Table.Row>
          {columns?.map((cell, i) => (
            <Table.HeaderCell
              key={i}
              sortable={sortable && Boolean(cell)}
              onSortClick={() => handleSorting(i)}
            >
              {cell}
            </Table.HeaderCell>
          ))}
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {rows?.map((row) => (
          <Table.Row key={String(row.id)}>
            {Object.values(row).map((cell, i) => (
              <Table.Cell key={i}>{cell}</Table.Cell>
            ))}
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
});
