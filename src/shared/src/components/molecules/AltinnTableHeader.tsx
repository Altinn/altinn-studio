import { makeStyles, TableHead } from '@material-ui/core';
import React from 'react';
import theme from '../../theme/altinnAppTheme';

export interface IAltinnTableHeaderProps {
  id: string;
  children: React.ReactNode;
  padding?: 'dense';
}

const useStyles = makeStyles({
  tableHeader: ({ padding }: IAltinnTableHeaderProps) => {
    return {
      borderBottom: `2px solid ${theme.altinnPalette.primary.blueMedium}`,
      '& th': {
        fontSize: '1.4rem',
        padding: padding === 'dense' ? '0 12px 4px 12px' : '0 18px 4px 36px',
        fontFamily: 'Altinn-DIN',
        '& p': {
          fontWeight: '500',
          fontSize: '1.4rem',
          padding: '0px',
        },
      },
    };
  },
});

export function AltinnTableHeader(props: IAltinnTableHeaderProps) {
  const { children, id } = props;
  const classes = useStyles(props);
  return (
    <TableHead id={id} className={classes.tableHeader}>
      {children}
    </TableHead>
  );
}
