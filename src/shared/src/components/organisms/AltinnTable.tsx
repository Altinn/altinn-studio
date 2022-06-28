import type { TableProps } from '@material-ui/core';
import { Grid, makeStyles, Table, TableContainer } from '@material-ui/core';
import React from 'react';

export interface IAltinnTableProps {
  tableLayout?: 'fixed' | 'auto';
  wordBreak?: 'break-word' | 'normal';
  id: string;
}

const useStyles = makeStyles(() => {
  return {
    table: ({
      tableLayout = 'fixed',
      wordBreak = 'break-word',
    }: IAltinnTableProps) => {
      return {
        tableLayout: tableLayout,
        marginBottom: '12px',
        wordBreak,
      };
    },
  };
});

export default function AltinnTable(
  props: IAltinnTableProps & Omit<TableProps, 'id'>,
) {
  const { tableLayout, wordBreak, ...tableProps } = props;
  const classes = useStyles(props);
  return (
    <TableContainer component={Grid} id={`${tableProps.id}-container`}>
      <Table className={classes.table} {...tableProps} />
    </TableContainer>
  );
}
