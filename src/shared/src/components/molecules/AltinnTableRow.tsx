import type { TableRowProps } from '@material-ui/core';
import { makeStyles, TableRow } from '@material-ui/core';
import cn from 'classnames';
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

export default function AltinnTableRow(props: IAltinnTableRow & TableRowProps) {
  const classes = useStyles();
  const { children, valid, ...tableProps } = props;

  return (
    <TableRow
      {...tableProps}
      className={cn(
        { [classes.tableRowError]: valid === false },
        tableProps.className,
      )}
    >
      {children}
    </TableRow>
  );
}
