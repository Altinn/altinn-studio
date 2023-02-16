import React from 'react';

import { makeStyles, TableBody } from '@material-ui/core';

export interface IAltinnTableBody {
  children: React.ReactNode;
  id: string;
  padding?: 'dense';
}

const useStyles = makeStyles((theme) => ({
  tableBody: ({ padding }: IAltinnTableBody) => {
    return {
      position: 'relative',
      '& td': {
        borderBottom: `1px solid ${theme.altinnPalette.primary.blueMedium}`,
        padding: padding === 'dense' ? '0 12px' : '0 18px 0px 36px',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        overflow: 'hidden',
        ...theme.typography.body1,
      },
      '& tr': {
        '&:hover': {
          background: theme.altinnPalette.primary.blueLighter,
        },
      },
    };
  },
}));

export function AltinnTableBody(props: IAltinnTableBody) {
  const { children, id } = props;
  const classes = useStyles(props);

  return (
    <TableBody
      className={classes.tableBody}
      id={id}
    >
      {children}
    </TableBody>
  );
}
