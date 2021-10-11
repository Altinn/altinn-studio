import { Grid, makeStyles, Table, TableContainer } from '@material-ui/core';
import React from 'react';

export interface IAltinnTableProps {
  children: React.ReactNode;
  id: string;
}

const useStyles = makeStyles({
  table: {
    tableLayout: 'fixed',
    marginBottom: '12px',
    wordBreak: 'break-word',
  },
});

export default function AltinnTable(props: IAltinnTableProps) {
  const {
    id, children,
  } = props;
  const classes = useStyles();
  return (
    <TableContainer component={Grid} id={`${id}-container`}>
      <Table className={classes.table} id={id}>
        {children}
      </Table>
    </TableContainer>
  );
}
