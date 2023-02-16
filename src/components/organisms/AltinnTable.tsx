import React from 'react';

import { Grid, makeStyles, Table, TableContainer } from '@material-ui/core';
import type { TableProps } from '@material-ui/core';

interface StyleProps {
  tableLayout?: 'fixed' | 'auto';
  wordBreak?: 'break-word' | 'normal';
}

export interface IAltinnTableProps extends StyleProps {
  id: string;
}

const useStyles = makeStyles(() => {
  return {
    table: ({ tableLayout = 'fixed', wordBreak = 'break-word' }: StyleProps) => ({
      tableLayout: tableLayout,
      marginBottom: '12px',
      wordBreak,
    }),
  };
});

export function AltinnTable(props: IAltinnTableProps & Omit<TableProps, 'id'>) {
  const { tableLayout, wordBreak, ...tableProps } = props;
  const classes = useStyles({ tableLayout, wordBreak });
  return (
    <TableContainer
      component={Grid}
      id={`${props.id}-container`}
    >
      <Table
        className={classes.table}
        {...tableProps}
      />
    </TableContainer>
  );
}
