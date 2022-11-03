import { Grid, makeStyles } from '@material-ui/core';
import React from 'react';
import theme from '../../theme/altinnStudioTheme';
import cn from 'classnames';

export interface IAltinnMobileTableProps {
  children: React.ReactNode;
  id: string;
  showBorder?: boolean;
}

const useStyles = makeStyles({
  mobileContainer: {
    marginBottom: '1.2rem',
  },
  border: {
    borderTop: `2px solid ${theme.altinnPalette.primary.blueMedium}`,
    marginTop: '-1px',
  },
});

export default function AltinnMobileTable({ children, id, showBorder = true }: IAltinnMobileTableProps) {
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
