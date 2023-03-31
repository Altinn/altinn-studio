import React from 'react';

import { makeStyles, TableRow } from '@material-ui/core';
import cn from 'classnames';
import type { TableRowProps } from '@material-ui/core';

import { AltinnAppTheme } from 'src/theme/altinnAppTheme';

export interface IAltinnTableRow {
  children: React.ReactNode;
  id?: string;
  valid?: boolean;
}

const useStyles = makeStyles({
  tableRowError: {
    backgroundColor: AltinnAppTheme.altinnPalette.primary.redLight,
  },
});

export function AltinnTableRow(props: IAltinnTableRow & TableRowProps) {
  const classes = useStyles();
  const { children, valid, ...tableProps } = props;

  return (
    <TableRow
      {...tableProps}
      className={cn({ [classes.tableRowError]: valid === false }, tableProps.className)}
    >
      {children}
    </TableRow>
  );
}
