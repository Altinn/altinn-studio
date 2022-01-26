import { makeStyles, TableHead } from '@material-ui/core';
import React from 'react';
import theme from '../../theme/altinnAppTheme';

export interface IAltinnTableHeaderProps {
  id: string;
  children: React.ReactNode;
}

const useStyles = makeStyles({
  table: {
    tableLayout: 'fixed',
    marginBottom: '12px',
    wordBreak: 'break-word',
  },
  tableHeader: {
    borderBottom: `2px solid ${theme.altinnPalette.primary.blueMedium}`,
    '& th': {
      fontSize: '1.4rem',
      padding: '0px',
      paddingLeft: '36px',
      paddingBottom: '4px',
      fontFamily: 'Altinn-DIN',
      '& p': {
        fontWeight: '500',
        fontSize: '1.4rem',
        padding: '0px',
      },
    },
  },
});

export function AltinnTableHeader(props: IAltinnTableHeaderProps) {
  const { children, id } = props;
  const classes = useStyles();
  return (
    <TableHead id={id} className={classes.tableHeader}>
      {children}
    </TableHead>

  );
}
