import { makeStyles, TableRow } from '@material-ui/core';
import React from 'react';
import theme from '../../theme/altinnAppTheme';

export interface IAltinnTableRow {
  children: React.ReactNode;
  id?: string;
  valid?: boolean;
}

const useStyles = makeStyles({
  tableRowError: {
    backgroundColor: theme.altinnPalette.primary.redLight,
  },
});

export default function AltinnTableRow(props: IAltinnTableRow) {
  const classes = useStyles();
  const {
    children, id, valid,
  } = props;

  return (
    <TableRow id={id} className={valid === false ? classes.tableRowError : ''}>
      { children }
    </TableRow>
  );
}
