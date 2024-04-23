import { Table } from '@digdir/design-system-react';
import React, { forwardRef } from 'react';

type StudioTableWithPaginationProps = {
  columns: string[];
  rows: React.ReactNode[][];
  size: 'small' | 'medium' | 'large';
};

export const StudioTableWithPagination = forwardRef<
  HTMLTableElement,
  StudioTableWithPaginationProps
>(({ columns, rows, size = 'medium' }, ref) => {
  return (
    <Table size={size}>
      <Table.Head>
        <Table.Row>
          {columns.map((cell, i) => (
            <Table.HeaderCell key={i}>{cell}</Table.HeaderCell>
          ))}
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {rows.map((row, i) => (
          <Table.Row key={i}>
            {row.map((cell, i) => (
              <Table.Cell key={i}>{cell}</Table.Cell>
            ))}
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
});
