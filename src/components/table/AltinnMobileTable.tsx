import React from 'react';

import { Grid, makeStyles } from '@material-ui/core';
import cn from 'classnames';

import { AltinnStudioTheme } from 'src/theme/altinnStudioTheme';

export interface IAltinnMobileTableProps {
  children: React.ReactNode;
  id: string;
  showBorder?: boolean;
}

const useStyles = makeStyles({
  mobileContainer: {
    marginBottom: '0.75rem',
  },
  border: {
    borderTop: `2px solid ${AltinnStudioTheme.altinnPalette.primary.blueMedium}`,
    marginTop: '-1px',
  },
});

export function AltinnMobileTable({ children, id, showBorder = true }: IAltinnMobileTableProps) {
  const classes = useStyles();

  return (
    <Grid
      container={true}
      item={true}
      direction='column'
      className={cn(classes.mobileContainer, {
        [classes.border]: showBorder,
      })}
      id={id}
      data-testid='altinn-mobile-table'
    >
      {children}
    </Grid>
  );
}
