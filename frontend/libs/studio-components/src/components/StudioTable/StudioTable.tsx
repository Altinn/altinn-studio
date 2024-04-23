import classes from './StudioTable.module.css';
import { Table } from '@digdir/design-system-react';
import React from 'react';

type StudioTableProps = {
  size: 'small' | 'medium' | 'large';
  columns: string[];
  rows: React.ReactNode[][];
  width?: string;
};

export const StudioTable: React.FC<StudioTableProps> = ({ size, columns, rows, width }) => {
  return (
    <Table size={size} className={classes.table} style={{ width: width }}>
      <Table.Head>
        <Table.Row>
          {columns?.map((cell, i) => <Table.HeaderCell key={i}>{cell}</Table.HeaderCell>)}
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {rows?.map((row, i) => (
          <Table.Row key={i}>
            {row.map((cell, i) => (
              <Table.Cell key={i}>{cell}</Table.Cell>
            ))}
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
};
