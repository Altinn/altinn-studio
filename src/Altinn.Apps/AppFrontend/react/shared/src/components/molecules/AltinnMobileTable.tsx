import { Grid, makeStyles } from '@material-ui/core';
import React from 'react';
import theme from '../../theme/altinnStudioTheme';

export interface IAltinnMobileTableProps {
  children: React.ReactNode;
  id: string;
}

const useStyles = makeStyles({
  mobileContainer: {
    borderTop: `2px solid ${theme.altinnPalette.primary.blueMedium}`,
    marginBottom: '1.2rem',
  },
});

export default function AltinnMobileTable({ children, id }: IAltinnMobileTableProps) {
  const classes = useStyles();

  return (
    <Grid
      container={true}
      item={true}
      direction='column'
      className={classes.mobileContainer}
      id={id}
    >
      {children}
    </Grid>
  );
}
