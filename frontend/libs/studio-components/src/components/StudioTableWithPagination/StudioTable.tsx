import classes from './StudioTableWithPagination.module.css';
import { Table } from '@digdir/design-system-react';
import React from 'react';

type StudioTableProps = {
  size: 'small' | 'medium' | 'large';
  columns: string[];
  rows: React.ReactNode[][];
  sortable: boolean;
  handleSorting?: (arg: number) => void;
};

export const StudioTable: React.FC<StudioTableProps> = ({
  size,
  columns,
  rows,
  sortable,
  handleSorting,
}) => {
  return (
    <Table size={size} className={classes.table}>
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
        {rows?.map((row, index) => (
          <Table.Row key={index}>
            {row.map((cell, i) => (
              <Table.Cell key={i}>{cell}</Table.Cell>
            ))}
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
};
